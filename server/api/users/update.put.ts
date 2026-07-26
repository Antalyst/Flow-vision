import { createClient } from '@supabase/supabase-js'
import { hash } from 'bcrypt-ts'

/**
 * PUT /api/users/update
 * Admin-only endpoint to update an existing user's details and password.
 * 
 * Body:
 *   user_id    string  required (target user to edit)
 *   full_name  string  required
 *   email      string  required
 *   password   string  optional (if provided, hashes and updates)
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const { user_id, full_name, email, password } = body

  // --- Auth guard --------------------------------------------------------
  const sessionUserId = getCookie(event, 'user_session')
  const sessionRole   = getCookie(event, 'user_role')

  if (!sessionUserId || sessionRole !== 'client') {
    throw createError({ statusCode: 403, message: 'Forbidden: only org administrators can edit accounts' })
  }

  // --- Input validation --------------------------------------------------
  if (!user_id || !full_name?.trim() || !email?.trim()) {
    throw createError({ statusCode: 400, message: 'user_id, full_name, and email are required' })
  }

  const client = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  // --- Resolve admin's org_id --------------------------------------------
  const { data: adminRow, error: adminErr } = await client
    .from('users')
    .select('org_id')
    .eq('user_id', sessionUserId)
    .single()

  if (adminErr || !adminRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Administrator has no organization assigned' })
  }

  const org_id = adminRow.org_id

  // --- Verify target user belongs to this org ----------------------------
  const { data: targetUser, error: targetErr } = await client
    .from('users')
    .select('org_id')
    .eq('user_id', user_id)
    .single()

  if (targetErr || !targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (targetUser.org_id !== org_id) {
    throw createError({ statusCode: 403, message: 'Forbidden: Cannot edit users outside your organization' })
  }

  // --- Duplicate email check ---------------------------------------------
  const { data: existing } = await client
    .from('users')
    .select('user_id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existing && existing.user_id !== user_id) {
    throw createError({ statusCode: 409, message: 'An account with this email address already exists' })
  }

  // --- Prepare update payload --------------------------------------------
  const updatePayload: Record<string, any> = {
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
  }

  if (password?.trim()) {
    updatePayload.password = await hash(password.trim(), 10)
  }

  // --- Update account ----------------------------------------------------
  const { data: updatedUser, error: updateErr } = await client
    .from('users')
    .update(updatePayload)
    .eq('user_id', user_id)
    .select('user_id, full_name, email, role, org_id, status, created_at')
    .single()

  if (updateErr) {
    console.error('[Update User] update error:', updateErr)
    throw createError({ statusCode: 500, message: updateErr.message || 'Failed to update account' })
  }

  return {
    success: true,
    message: 'User account updated successfully',
    data: updatedUser,
  }
})
