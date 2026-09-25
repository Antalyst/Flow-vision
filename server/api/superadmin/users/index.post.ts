import { hash } from 'bcrypt-ts'
import { getSuperadminDb, requireSuperadmin, isManagedRole } from '~~/server/utils/superadminContext'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const body = await readBody(event)
  const { full_name, email, password, role, org_id, office_id } = body

  if (!full_name?.trim() || !email?.trim() || !password?.trim() || !role) {
    throw createError({ statusCode: 400, message: 'full_name, email, password, and role are required' })
  }
  if (!isManagedRole(role)) {
    throw createError({ statusCode: 400, message: 'Invalid role selected' })
  }
  if (role !== 'client' && !org_id) {
    throw createError({ statusCode: 400, message: 'An organization is required for this role' })
  }
  if (role === 'employee_sub_user' && !office_id) {
    throw createError({ statusCode: 400, message: 'An office assignment is required for sub-user accounts' })
  }
  if (password.length < 6) {
    throw createError({ statusCode: 400, message: 'Password must be at least 6 characters' })
  }

  const db = getSuperadminDb()

  const { data: existing } = await db
    .from('users')
    .select('user_id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, message: 'An account with this email address already exists' })
  }

  const hashedPassword = await hash(password, 10)

  const { data: newUser, error } = await db
    .from('users')
    .insert({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      org_id: org_id || null,
      office_id: office_id || null,
      status: 1,
    })
    .select('user_id, full_name, email, role, status, org_id, office_id, created_at')
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to create account' })
  }

  return { success: true, data: newUser }
})
