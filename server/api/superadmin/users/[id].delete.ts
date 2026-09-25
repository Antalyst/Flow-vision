import { getSuperadminDb, requireSuperadmin } from '~~/server/utils/superadminContext'

export default defineEventHandler(async (event) => {
  const actor = await requireSuperadmin(event)
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing account ID' })

  if (String(id) === String(actor.userId)) {
    throw createError({ statusCode: 400, message: 'You cannot delete your own account' })
  }

  const db = getSuperadminDb()
  const { data: target } = await db.from('users').select('user_id, role, full_name').eq('user_id', id).single()
  if (!target) throw createError({ statusCode: 404, message: 'Account not found' })
  if (target.role === 'superadmin') {
    throw createError({ statusCode: 403, message: 'Super administrator accounts cannot be deleted here' })
  }

  const { error } = await db.from('users').delete().eq('user_id', id)
  if (error) throw createError({ statusCode: 500, message: error.message || 'Failed to delete account' })

  return { success: true, message: `${target.full_name}'s account has been permanently removed` }
})
