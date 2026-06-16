import {
  ISSUE_ALLOWED_ROLES,
  assertDocumentOrgAccess,
  assertReportingOfficeAccess,
  broadcastIssueRealtime,
  issueRealtimeChannel,
  orgLogisticsChannel,
} from '~~/server/utils/documentIssues'

/**
 * POST /api/documents/issues/create
 *
 * Flags a quality / completeness problem on a physical document.
 *
 * Body:
 *   document_id            UUID   required
 *   reported_by_office_id  UUID   required — office detecting the issue
 *   title                  string required — short summary (e.g. "Missing signature page")
 *   message_text?          string optional — opening message in the issue thread
 *
 * Side effects:
 *   1. Inserts row into document_issues (status OPEN)
 *   2. Sets documents.tracking_status → DISCREPANCY_REPORTED
 *   3. Appends critical alert to document_tracking_events (logistics timeline)
 *   4. Broadcasts to org Realtime channels
 */
export default defineEventHandler(async (event) => {
  const client = useServerSupabase()
  const body   = await readBody(event)

  const documentId        = String(body?.document_id ?? '').trim()
  const reportedOfficeId  = String(body?.reported_by_office_id ?? '').trim()
  const title             = String(body?.title ?? '').trim()
  const initialMessage    = String(body?.message_text ?? '').trim()

  if (!documentId)       throw createError({ statusCode: 400, message: 'document_id is required.' })
  if (!reportedOfficeId) throw createError({ statusCode: 400, message: 'reported_by_office_id is required.' })
  if (!title)            throw createError({ statusCode: 400, message: 'title is required.' })

  const { actor, document } = await assertDocumentOrgAccess(event, client, documentId)

  if (!(ISSUE_ALLOWED_ROLES as readonly string[]).includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client or employee accounts may flag document issues.',
    })
  }

  const reportingOffice = await assertReportingOfficeAccess(client, actor, reportedOfficeId)

  // ── 1. Create issue row ───────────────────────────────────────────────
  const { data: issue, error: issueErr } = await client
    .from('document_issues')
    .insert({
      document_id:           documentId,
      org_id:                actor.orgId,
      reported_by_office_id: reportedOfficeId,
      title,
      status:                'OPEN',
    })
    .select('id, document_id, org_id, reported_by_office_id, title, status, created_at')
    .single()

  if (issueErr || !issue) {
    throw createError({
      statusCode: 500,
      message: issueErr?.message ?? 'Failed to create document issue.',
    })
  }

  // ── 2. Flip document tracking status ──────────────────────────────────
  const { data: updatedDoc, error: docUpdateErr } = await client
    .from('documents')
    .update({ tracking_status: 'DISCREPANCY_REPORTED' })
    .eq('id', documentId)
    .eq('org_id', actor.orgId)
    .select('id, title, tracking_status')
    .single()

  if (docUpdateErr) {
    throw createError({
      statusCode: 500,
      message: `Issue created but failed to update document status: ${docUpdateErr.message}`,
    })
  }

  // ── 3. Critical alert on logistics timeline ───────────────────────────
  const alertNotes =
    `⚠️ DISCREPANCY REPORTED — "${title}" flagged by ${reportingOffice.name}` +
    `${reportingOffice.code ? ` (${reportingOffice.code})` : ''}. ` +
    `Document "${document.title}" requires attention before routing continues. ` +
    `Issue ID: ${issue.id}.`

  const { data: trackingEvent, error: trackErr } = await client
    .from('document_tracking_events')
    .insert({
      document_id: documentId,
      org_id:      actor.orgId,
      status:      'DISCREPANCY_REPORTED',
      step_index:  null,
      office_id:   null,
      office_name: reportingOffice.name,
      actor_id:    actor.userId,
      actor_role:  actor.userRole,
      actor_name:  actor.fullName,
      notes:       alertNotes,
    })
    .select('*')
    .single()

  if (trackErr) {
    console.warn('[issues/create] Tracking event write failed:', trackErr.message)
  }

  // ── 4. Optional opening chat message ────────────────────────────────
  let openingMessage = null

  if (initialMessage) {
    const { data: msg, error: msgErr } = await client
      .from('document_messages')
      .insert({
        issue_id:     issue.id,
        sender_id:    actor.userId,
        message_text: initialMessage,
      })
      .select('id, issue_id, sender_id, message_text, created_at')
      .single()

    if (msgErr) {
      console.warn('[issues/create] Opening message failed:', msgErr.message)
    } else {
      openingMessage = {
        ...msg,
        sender_name: actor.fullName,
      }
    }
  }

  // ── 5. Realtime broadcast ─────────────────────────────────────────────
  const realtimePayload = {
    type:           'issue_created',
    issue,
    document:       updatedDoc,
    trackingEvent:  trackingEvent ?? null,
    openingMessage,
    reportedOffice,
    actor: {
      user_id:   actor.userId,
      full_name: actor.fullName,
      role:      actor.userRole,
    },
    timestamp: new Date().toISOString(),
  }

  await broadcastIssueRealtime(event, actor.orgId, issue.id, 'issue_created', realtimePayload)
  await broadcastIssueRealtime(event, actor.orgId, issue.id, 'logistics_alert', {
    type:          'logistics_alert',
    document_id:   documentId,
    document_title: document.title,
    trackingEvent: trackingEvent ?? null,
    issue,
    timestamp:     new Date().toISOString(),
  })

  return {
    success: true,
    message: `Issue flagged. Document tracking status set to DISCREPANCY_REPORTED.`,
    data: {
      issue,
      document:      updatedDoc,
      trackingEvent: trackingEvent ?? null,
      openingMessage,
    },
    realtime: {
      issueChannel:     issueRealtimeChannel(actor.orgId, issue.id),
      logisticsChannel: orgLogisticsChannel(actor.orgId),
      events:           ['issue_created', 'new_message', 'logistics_alert'],
    },
  }
})
