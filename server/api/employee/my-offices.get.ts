import { serverSupabaseClient } from '#supabase/server'

/**
 * GET /api/employee/my-offices
 * Returns offices strictly scoped to the authenticated employee:
 *   - filtered by their org_id (cross-tenant isolation)
 *   - filtered by their user_id as assigned_user (personal scope)
 *
 * Query params:
 *   orgId   – the employee's org_id
 *   userId  – the employee's user_id
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const orgId  = query.orgId  as string | undefined
  const userId = query.userId as string | undefined

  if (!orgId || !userId) {
    throw createError({
      statusCode: 400,
      message: 'orgId and userId query parameters are required',
    })
  }

  const client = await serverSupabaseClient(event)

  // 1. Fetch user's direct office_id / current_office_id from users table
  const { data: userRow } = await client
    .from('users')
    .select('office_id, current_office_id')
    .eq('user_id', userId)
    .maybeSingle()

  const directOfficeIds: string[] = []
  if (userRow?.office_id != null && String(userRow.office_id).trim()) {
    directOfficeIds.push(String(userRow.office_id).trim())
  }
  if (userRow?.current_office_id != null && String(userRow.current_office_id).trim()) {
    directOfficeIds.push(String(userRow.current_office_id).trim())
  }

  // 2. Query offices assigned to this user
  let queryBuilder = client
    .from('offices')
    .select('*')
    .eq('org_id', orgId)

  if (directOfficeIds.length > 0) {
    queryBuilder = queryBuilder.or(`assigned_user.eq.${userId},id.in.(${directOfficeIds.join(',')})`)
  } else {
    queryBuilder = queryBuilder.eq('assigned_user', userId)
  }

  const { data, error } = await queryBuilder.order('created_at', { ascending: false })

  let offices = data ?? []

  if (error) {
    // Fallback query if OR filter fails
    const { data: fallbackData } = await client
      .from('offices')
      .select('*')
      .eq('org_id', orgId)
      .eq('assigned_user', userId)
      .order('created_at', { ascending: false })

    offices = fallbackData ?? []
  }

  // A staff member's own auto-created "desk" (a sub-office with
  // parent_office_id set, assigned_user = themselves) is a routing TARGET
  // for others, never their "home office" context. Without this filter it
  // would match via assigned_user.eq.userId and — sorted newest-first —
  // silently outrank the real parent office as offices[0], breaking every
  // "my office" consumer (route scoping, dashboard, uploads, etc).
  const ownDesks = offices.filter((o: any) => o.parent_office_id != null && String(o.assigned_user) === String(userId))
  offices = offices.filter((o: any) => !ownDesks.includes(o))

  // Self-heal: if this staff account's users.office_id/current_office_id is
  // blank (a stale/incomplete signup), the query above may only have found
  // their own desk — which we just excluded. Recover the real parent branch
  // office via that desk's own parent_office_id so "my office" never comes
  // back empty just because one column wasn't backfilled.
  const missingParentIds = [...new Set(
    ownDesks
      .map((d: any) => String(d.parent_office_id))
      .filter((pid) => !offices.some((o: any) => String(o.id) === pid)),
  )]

  if (missingParentIds.length > 0) {
    const { data: parentRows } = await client
      .from('offices')
      .select('*')
      .eq('org_id', orgId)
      .in('id', missingParentIds)

    if (parentRows?.length) {
      offices = [...offices, ...parentRows]
    }
  }

  if (offices.length === 0) {
    return { success: true, data: [] }
  }

  // Count documents currently registered at each office.
  const officeIds = offices.map((o: any) => o.id)
  const docCountByOffice: Record<string, number> = {}
  const { data: docs } = await client
    .from('documents')
    .select('office_id')
    .eq('org_id', orgId)
    .in('office_id', officeIds)
  for (const d of (docs || [])) {
    const id = String(d.office_id)
    docCountByOffice[id] = (docCountByOffice[id] || 0) + 1
  }

  const enriched = offices.map((o: any) => ({
    ...o,
    doc_count: docCountByOffice[String(o.id)] ?? 0,
  }))

  return { success: true, data: enriched }
})

