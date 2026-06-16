import { serverSupabaseServiceRole } from '#supabase/server'
import { hash } from 'bcrypt-ts'

/**
 * POST /api/users/provision
 * Admin-only endpoint to create a messenger sub-account bound to the
 * calling admin's org_id.
 *
 * The org_id is ALWAYS derived from the server-side admin session —
 * never from the request body — to prevent cross-tenant provisioning.
 *
 * Body:
 *   full_name  string  required
 *   email      string  required
 *   password   string  required (admin sets an initial password)
 *   role       string  must be 'messenger' (validated server-side)
 */
export default defineEventHandler(async (event) => {
  const body   = await readBody(event)

  const { full_name, email, password, role: requestedRole } = body

  // --- Auth guard --------------------------------------------------------
  const sessionUserId = getCookie(event, 'user_session')
  const sessionRole   = getCookie(event, 'user_role')

  if (!sessionUserId || sessionRole !== 'client') {
    throw createError({ statusCode: 403, message: 'Forbidden: only org administrators can provision accounts' })
  }

  // --- Input validation --------------------------------------------------
  if (!full_name?.trim() || !email?.trim() || !password?.trim()) {
    throw createError({ statusCode: 400, message: 'full_name, email, and password are required' })
  }

  // Enforce: only messenger accounts can be provisioned via this endpoint
  if (requestedRole && requestedRole !== 'messenger') {
    throw createError({ statusCode: 400, message: 'Only messenger accounts can be provisioned via this endpoint' })
  }

  const client = await serverSupabaseServiceRole(event)

  // --- Resolve admin's org_id (server-side, not from body) ---------------
  const { data: adminRow, error: adminErr } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', sessionUserId)
    .single()

  if (adminErr || !adminRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Administrator has no organization assigned' })
  }

  const org_id = adminRow.org_id

  // --- Duplicate email check (scoped log, not a hard fail yet) -----------
  const { data: existing } = await client
    .from('users')
    .select('user_id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, message: 'An account with this email address already exists' })
  }

  // --- Create messenger account ------------------------------------------
  const hashedPassword = await hash(password, 10)

  const { data: newUser, error: insertErr } = await client
    .from('users')
    .insert({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'messenger',
      org_id,
      status: 1,
    })
    .select('user_id, full_name, email, role, org_id, status, created_at')
    .single()

  if (insertErr) {
    console.error('[Provision] insert error:', insertErr)
    throw createError({ statusCode: 500, message: insertErr.message || 'Failed to provision account' })
  }

  return {
    success: true,
    message: `Messenger account created and bound to org_id ${org_id}`,
    data: newUser,
  }
})
