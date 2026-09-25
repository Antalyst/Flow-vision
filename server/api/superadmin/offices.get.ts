import { getSuperadminDb, requireSuperadmin } from '~~/server/utils/superadminContext'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const query = getQuery(event)
  const orgId = query.org_id ? String(query.org_id) : ''

  const db = getSuperadminDb()
  let q = db.from('offices').select('id, name, code, org_id').order('name', { ascending: true })
  if (orgId) q = q.eq('org_id', orgId)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, message: error.message })

  return { success: true, data: data ?? [] }
})
