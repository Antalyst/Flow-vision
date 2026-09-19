/**
 * POST /api/documents/scan/session
 *
 * Creates a document_scan_sessions row for a new physical-document scan.
 * Called the moment the user opens the camera scanner UI, before any page is
 * captured, so status transitions (CREATED → SCANNING → PROCESSING →
 * AI_ANALYZING → REVIEW → COMPLETED / FAILED / CANCELLED) have somewhere to land.
 *
 * Uses the scanner tables that already exist in Supabase — no new tables.
 */

import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'

const ALLOWED_ROLES = ['client', 'employee', 'employee_sub_user']
const SCAN_MODES = ['FIRST_PAGE', 'FULL_DOCUMENT'] as const

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (!ALLOWED_ROLES.includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client, employee, or sub-user accounts may scan documents.',
    })
  }

  const body = await readBody<{ scan_mode?: string }>(event).catch(() => ({} as { scan_mode?: string }))
  const scanMode = SCAN_MODES.includes(body?.scan_mode as any) ? body.scan_mode : 'FIRST_PAGE'

  const { data, error } = await client
    .from('document_scan_sessions')
    .insert({
      user_id: actor.userId,
      organization_id: actor.orgId,
      scan_mode: scanMode,
      status: 'SCANNING',
      page_count: 0,
    })
    .select('id, scan_mode, status, page_count, created_at')
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      message: `Could not start a scan session: ${error?.message ?? 'unknown error'}`,
    })
  }

  return { success: true, session: data }
})
