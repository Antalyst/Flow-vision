
/**
 * POST /api/users/toggle-status
 * Activates or deactivates a user account.
 * Enforces strict org_id match — admins can only manage members of their own org.
 *
 * Body:
 *   userId  string | number  required – the target user
 *   status  0 | 1            required – 0 = inactive, 1 = active
 */
export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const { userId, status } = body

  if (!userId || status === undefined || status === null) {
    throw createError({ statusCode: 400, message: 'userId and status are required' })
  }

  const sessionUserId = getCookie(event, 'user_session')
  const sessionRole   = getCookie(event, 'user_role')

  if (!sessionUserId || sessionRole !== 'supabase') {
    throw createError({ statusCode: 403, message: 'Forbidden: administrator access required' })
  }

  const supabase = useServerSupabase()

  // Resolve admin's org_id
  const { data: adminRow } = await supabase
    .from('users')
    .select('org_id')
    .eq('user_id', sessionUserId)
    .single()

  if (!adminRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Administrator has no organization' })
  }

  // Verify target user belongs to same org
  const { data: targetRow } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('user_id', userId)
    .single()

  if (!targetRow || String(targetRow.org_id) !== String(adminRow.org_id)) {
    throw createError({ statusCode: 403, message: 'Forbidden: cannot modify users outside your organization' })
  }

  if (targetRow.role === 'supabase') {
    throw createError({ statusCode: 403, message: 'Cannot modify the status of an administrator account via this endpoint' })
  }

  const { data: updated, error } = await supabase
    .from('users')
    .update({ status: Number(status) })
    .eq('user_id', userId)
    .select('user_id, full_name, status')
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to update status' })
  }

  return {
    success: true,
    message: `User ${updated.full_name} is now ${Number(status) === 1 ? 'active' : 'inactive'}`,
    data: updated,
  }
})
