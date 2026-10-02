import { createClient } from '@supabase/supabase-js'
import { sessionRole as readSessionRole, sessionUserId as readSessionUserId } from '~~/server/utils/session'

/**
 * GET /api/users/org-members
 * Returns all non-client members of an organization (employees + messengers).
 * Requires the requesting admin's verified session for org validation.
 *
 * Query params:
 *   orgId – the admin's org_id (validated server-side against the session)
 *   role  – optional filter: 'employee' | 'messenger' | 'all'
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query  = getQuery(event)

  const orgId = query.orgId as string | undefined
  const role  = (query.role  as string | undefined) ?? 'all'

  if (!orgId) {
    throw createError({ statusCode: 400, message: 'orgId is required' })
  }

  // Validate the requesting session belongs to a client admin of this org
  const sessionUserId = readSessionUserId(event)
  const sessionRole   = readSessionRole(event)

  if (!sessionUserId || sessionRole !== 'client') {
    throw createError({ statusCode: 403, message: 'Forbidden: administrator access required' })
  }

  const client = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  // Confirm the calling admin's org_id matches the requested orgId
  const { data: adminRow, error: adminErr } = await client
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

  // Build member query — exclude client/admin accounts
  const allowedRoles = ['employee', 'messenger']
  let dbQuery = client
    .from('users')
    .select('user_id, full_name, email, role, org_id, status, created_at')
    .eq('org_id', orgId)
    .in('role', allowedRoles)
    .order('full_name', { ascending: true })

  if (role !== 'all' && allowedRoles.includes(role)) {
    dbQuery = client
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
