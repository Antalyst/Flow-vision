import { hash } from 'bcrypt-ts'
import { getSuperadminDb, requireSuperadmin, isManagedRole } from '~~/server/utils/superadminContext'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing account ID' })

  const db = getSuperadminDb()
  const { data: target } = await db.from('users').select('user_id, role').eq('user_id', id).single()
  if (!target) throw createError({ statusCode: 404, message: 'Account not found' })
  if (target.role === 'superadmin') {
    throw createError({ statusCode: 403, message: 'Super administrator accounts cannot be modified here' })
  }

  const body = await readBody(event)
  const { full_name, email, role, org_id, office_id, password, status } = body

  if (!full_name?.trim() || !email?.trim() || !role) {
    throw createError({ statusCode: 400, message: 'full_name, email, and role are required' })
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

  const updatePayload: Record<string, unknown> = {
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
    role,
    org_id: org_id || null,
    office_id: office_id || null,
  }

  if (status === 0 || status === 1) updatePayload.status = status

  if (password && String(password).trim()) {
    if (String(password).length < 6) {
      throw createError({ statusCode: 400, message: 'Password must be at least 6 characters' })
    }
    updatePayload.password = await hash(String(password), 10)
  }

  const { data: updated, error } = await db
    .from('users')
    .update(updatePayload)
    .eq('user_id', id)
    .select('user_id, full_name, email, role, status, org_id, office_id, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message || 'Failed to update account' })

  return { success: true, data: updated }
})
