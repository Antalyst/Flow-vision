
/**
 * DELETE /api/users/remove
 * Permanently removes a user account.
 * Guard: admin can only delete members of their own org; cannot self-delete.
 *
 * Query params:
 *   userId  – target user's user_id
 */
export default defineEventHandler(async (event) => {
  const query   = getQuery(event)
  const userId  = query.userId as string | undefined

  if (!userId) {
    throw createError({ statusCode: 400, message: 'userId query parameter is required' })
  }

  const sessionUserId = getCookie(event, 'user_session')
  const sessionRole   = getCookie(event, 'user_role')

  if (!sessionUserId || sessionRole !== 'supabase') {
    throw createError({ statusCode: 403, message: 'Forbidden: administrator access required' })
  }

  if (String(userId) === String(sessionUserId)) {
    throw createError({ statusCode: 400, message: 'Administrators cannot remove their own account via this endpoint' })
  }

  const supabase = useServerSupabase()

  // Resolve admin org
  const { data: adminRow } = await supabase
    .from('users')
    .select('org_id')
    .eq('user_id', sessionUserId)
    .single()

  if (!adminRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Administrator has no organization' })
  }

  // Verify target belongs to same org and is not an admin
  const { data: targetRow } = await supabase
    .from('users')
    .select('org_id, role, full_name')
    .eq('user_id', userId)
    .single()

  if (!targetRow || String(targetRow.org_id) !== String(adminRow.org_id)) {
    throw createError({ statusCode: 403, message: 'Forbidden: cannot remove users outside your organization' })
  }

  if (targetRow.role === 'supabase') {
    throw createError({ statusCode: 403, message: 'Cannot remove an administrator account' })
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('user_id', userId)

  if (error) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to remove user' })
  }

  return { success: true, message: `${targetRow.full_name}'s account has been permanently removed` }
})
