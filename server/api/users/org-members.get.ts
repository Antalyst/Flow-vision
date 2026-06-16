
/**
 * GET /api/users/org-members
 * Returns all non-supabase members of an organization (employees + messengers).
 * Requires the requesting admin's user_session cookie for org validation.
 *
 * Query params:
 *   orgId – the admin's org_id (validated server-side against the session)
 *   role  – optional filter: 'employee' | 'messenger' | 'all'
 */
export default defineEventHandler(async (event) => {
  const query  = getQuery(event)

  const orgId = query.orgId as string | undefined
  const role  = (query.role  as string | undefined) ?? 'all'

  if (!orgId) {
    throw createError({ statusCode: 400, message: 'orgId is required' })
  }

  // Validate the requesting session belongs to a supabase admin of this org
  const sessionUserId = getCookie(event, 'user_session')
  const sessionRole   = getCookie(event, 'user_role')

  if (!sessionUserId || sessionRole !== 'supabase') {
    throw createError({ statusCode: 403, message: 'Forbidden: administrator access required' })
  }

  const supabase = useServerSupabase()

  // Confirm the calling admin's org_id matches the requested orgId
  const { data: adminRow, error: adminErr } = await supabase
    .from('users')
    .select('org_id')
    .eq('user_id', sessionUserId)
    .single()

  if (adminErr || !adminRow) {
    throw createError({ statusCode: 403, message: 'Could not verify administrator identity' })
  }

  if (String(adminRow.org_id) !== String(orgId)) {
    throw createError({ statusCode: 403, message: 'Forbidden: org_id mismatch' })
  }

  // Build member query — exclude supabase/admin accounts
  const allowedRoles = ['employee', 'messenger']
  let dbQuery = supabase
    .from('users')
    .select('user_id, full_name, email, role, org_id, status, created_at')
    .eq('org_id', orgId)
    .in('role', allowedRoles)
    .order('full_name', { ascending: true })

  if (role !== 'all' && allowedRoles.includes(role)) {
    dbQuery = supabase
      .from('users')
      .select('user_id, full_name, email, role, org_id, status, created_at')
      .eq('org_id', orgId)
      .eq('role', role)
      .order('full_name', { ascending: true })
  }

  const { data, error } = await dbQuery

  if (error) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to fetch members' })
  }

  return { success: true, data: data ?? [] }
})
