import { getSuperadminDb, requireSuperadmin } from '~~/server/utils/superadminContext'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const db = getSuperadminDb()
  const query = getQuery(event)

  const orgId = query.org_id ? String(query.org_id) : ''
  const actionType = query.action_type ? String(query.action_type) : 'all'
  const search = String(query.search ?? '').trim().replace(/[,()]/g, '')
  const from = query.from ? String(query.from) : ''
  const to = query.to ? String(query.to) : ''
  const limit = Math.min(Number(query.limit) || 100, 500)
  const offset = Math.max(Number(query.offset) || 0, 0)

  let q = db
    .from('activity_logs')
    .select(
      'id, org_id, office_id, user_id, user_name, actor_name, action_type, details, message, document_id, metadata, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (orgId) q = q.eq('org_id', orgId)
  if (actionType !== 'all') q = q.eq('action_type', actionType)
  if (from) q = q.gte('created_at', from)
  if (to) q = q.lte('created_at', to)
  if (search) q = q.or(`actor_name.ilike.%${search}%,message.ilike.%${search}%,details.ilike.%${search}%`)

  const { data, error, count } = await q
  if (error) throw createError({ statusCode: 500, message: error.message })

  const rows = data ?? []
  const orgIds = [...new Set(rows.map((r) => r.org_id).filter(Boolean))]
  const { data: orgs } = orgIds.length
    ? await db.from('org').select('org_id, name').in('org_id', orgIds)
    : { data: [] as { org_id: string; name: string }[] }
  const orgById = Object.fromEntries((orgs ?? []).map((o) => [o.org_id, o.name]))

  const enriched = rows.map((r) => ({
    ...r,
    org_name: orgById[r.org_id] ?? null,
    message: r.message ?? r.details ?? '',
  }))

  return { success: true, data: enriched, count: count ?? 0 }
})
