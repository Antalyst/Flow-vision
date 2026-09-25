import { getSuperadminDb, requireSuperadmin } from '~~/server/utils/superadminContext'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = event.context.params?.id
  const body = await readBody(event)
  const { status } = body

  if (!id || status === undefined || status === null) {
    throw createError({ statusCode: 400, message: 'id and status are required' })
  }

  const db = getSuperadminDb()
  const { data: target } = await db.from('users').select('role, full_name').eq('user_id', id).single()
  if (!target) throw createError({ statusCode: 404, message: 'Account not found' })
  if (target.role === 'superadmin') {
    throw createError({ statusCode: 403, message: 'Super administrator accounts cannot be modified here' })
  }

  const { data: updated, error } = await db
    .from('users')
    .update({ status: Number(status) })
    .eq('user_id', id)
    .select('user_id, full_name, status')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message || 'Failed to update status' })

  return {
    success: true,
    message: `${updated.full_name} is now ${Number(status) === 1 ? 'active' : 'suspended'}`,
    data: updated,
  }
})
