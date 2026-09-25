import { getSuperadminDb, requireSuperadmin, MANAGED_ROLES, isManagedRole } from '~~/server/utils/superadminContext'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const db = getSuperadminDb()
  const query = getQuery(event)

  const role = String(query.role ?? 'all')
  const orgId = query.org_id ? String(query.org_id) : ''
  const status = String(query.status ?? 'all')
  const search = String(query.search ?? '').trim().replace(/[,()]/g, '')
  const limit = Math.min(Number(query.limit) || 50, 200)
  const offset = Math.max(Number(query.offset) || 0, 0)

  let q = db
    .from('users')
    .select('user_id, full_name, email, role, status, org_id, office_id, birth_date, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  q = isManagedRole(role) ? q.eq('role', role) : q.in('role', MANAGED_ROLES as unknown as string[])
  if (orgId) q = q.eq('org_id', orgId)
  if (status === '0' || status === '1') q = q.eq('status', Number(status))
  if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)

  const { data, error, count } = await q
  if (error) throw createError({ statusCode: 500, message: error.message })

  const rows = data ?? []
  const orgIds = [...new Set(rows.map((u) => u.org_id).filter(Boolean))]
  const officeIds = [...new Set(rows.map((u) => u.office_id).filter(Boolean))]

  const [{ data: orgs }, { data: offices }] = await Promise.all([
    orgIds.length ? db.from('org').select('org_id, name').in('org_id', orgIds) : Promise.resolve({ data: [] as { org_id: string; name: string }[] }),
    officeIds.length ? db.from('offices').select('id, name').in('id', officeIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const orgById = Object.fromEntries((orgs ?? []).map((o) => [o.org_id, o.name]))
  const officeById = Object.fromEntries((offices ?? []).map((o) => [o.id, o.name]))

  const enriched = rows.map((u) => ({
    ...u,
    org_name: u.org_id ? orgById[u.org_id] ?? null : null,
    office_name: u.office_id ? officeById[u.office_id] ?? null : null,
  }))

  return { success: true, data: enriched, count: count ?? 0 }
})
