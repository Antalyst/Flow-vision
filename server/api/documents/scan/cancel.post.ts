/**
 * POST /api/documents/scan/cancel
 *
 * Marks an abandoned document_scan_sessions row CANCELLED so closing the
 * scanner modal without registering doesn't leave the session permanently
 * stuck in SCANNING / AI_ANALYZING / REVIEW. Uses the existing scanner status
 * column only — no new table, no new state machine.
 *
 * Best-effort by design: the caller (DocumentScannerModal) fires this on close
 * without blocking the UI on its result.
 */

import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'

const ALLOWED_ROLES = ['client', 'employee', 'employee_sub_user']
const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED']

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (!ALLOWED_ROLES.includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client, employee, or sub-user accounts may manage scan sessions.',
    })
  }

  const body = await readBody<{ session_id?: string }>(event).catch(() => ({} as { session_id?: string }))
  const sessionId = body?.session_id

  if (!sessionId) {
    throw createError({ statusCode: 400, message: 'session_id is required.' })
  }

  const { data: session, error: sessionErr } = await client
    .from('document_scan_sessions')
    .select('id, user_id, organization_id, status')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionErr) {
    throw createError({ statusCode: 500, message: `Scan session lookup failed: ${sessionErr.message}` })
  }
  if (!session) {
    // Already gone or never existed — nothing to cancel, not an error for a best-effort call.
    return { success: true, skipped: true }
  }
  if (String(session.user_id) !== String(actor.userId) || String(session.organization_id) !== String(actor.orgId)) {
    throw createError({ statusCode: 403, message: 'This scan session does not belong to you.' })
  }

  // Never downgrade a session that already reached a terminal state
  // (e.g. registration completed just before the modal closed).
  if (TERMINAL_STATUSES.includes(String(session.status))) {
    return { success: true, skipped: true }
  }

  await client
    .from('document_scan_sessions')
    .update({ status: 'CANCELLED' })
    .eq('id', sessionId)

  return { success: true, skipped: false }
})
