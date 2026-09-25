import { compare, hash } from 'bcrypt-ts'
import { getSuperadminDb, requireSuperadmin } from '~~/server/utils/superadminContext'

export default defineEventHandler(async (event) => {
  const actor = await requireSuperadmin(event)
  const body = await readBody(event)
  const { full_name, email, current_password, new_password } = body

  const db = getSuperadminDb()
  const updatePayload: Record<string, unknown> = {}

  if (full_name?.trim()) updatePayload.full_name = full_name.trim()
  if (email?.trim()) updatePayload.email = email.trim().toLowerCase()

  if (new_password?.trim()) {
    if (!current_password?.trim()) {
      throw createError({ statusCode: 400, message: 'Current password is required to set a new password' })
    }
    if (String(new_password).length < 6) {
      throw createError({ statusCode: 400, message: 'New password must be at least 6 characters' })
    }

    const { data: row } = await db.from('users').select('password').eq('user_id', actor.userId).single()
    if (!row) throw createError({ statusCode: 404, message: 'Account not found' })

    const valid = await compare(current_password, row.password)
    if (!valid) throw createError({ statusCode: 401, message: 'Current password is incorrect' })

    updatePayload.password = await hash(new_password, 10)
  }

  if (!Object.keys(updatePayload).length) {
    throw createError({ statusCode: 400, message: 'Nothing to update' })
  }

  const { data: updated, error } = await db
    .from('users')
    .update(updatePayload)
    .eq('user_id', actor.userId)
    .select('user_id, full_name, email')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message || 'Failed to update profile' })

  return { success: true, data: updated }
})
