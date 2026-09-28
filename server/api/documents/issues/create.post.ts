import { serverSupabaseClient } from '#supabase/server'
import {
  ISSUE_ALLOWED_ROLES,
  assertDocumentOrgAccess,
  assertReportingOfficeAccess,
  resolvePreviousRouteOffice,
  broadcastIssueRealtime,
  issueRealtimeChannel,
  orgLogisticsChannel,
} from '~~/server/utils/documentIssues'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { broadcastComplianceIssueNotification } from '~~/server/utils/notifications'
import { emitDiscrepancyEmail } from '~~/server/utils/email/emailEvents'

/**
 * POST /api/documents/issues/create
 *
 * Flags a quality / completeness problem on a physical document AND routes
 * it back one step to whoever handed it off — the office that reports the
 * issue is, by definition, the one that just received it, so "send it back
 * to be fixed" always means the previous stop on its route. That office is
 * resolved automatically (same computation used to power the compliance
 * chat's target picker) rather than requiring a manual choice.
 *
 * Body:
 *   document_id            UUID   required
 *   reported_by_office_id  UUID   required — office detecting the issue (current office)
 *   title                  string required — short summary (e.g. "Missing signature page")
 *   message_text?          string optional — opening message in the issue thread
 *
 * Side effects:
 *   1. Inserts row into document_issues (status OPEN), target = previous office
 *   2. Rewinds documents.current_step/current_office_id back one stop, sets
 *      tracking_status → DISCREPANCY_REPORTED
 *   3. Appends critical alert to document_tracking_events, attached to that step
 *      so it shows up on the roadmap
 *   4. Notifies the previous office that the document was sent back
 *   5. Broadcasts to org Realtime channels
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body   = await readBody(event)

  const documentId        = String(body?.document_id ?? '').trim()
  const reportedOfficeId  = String(body?.reported_by_office_id ?? '').trim()
  const issueType         = String(body?.issue_type ?? '').trim()
  const details           = String(body?.details ?? '').trim()
  const title             = String(body?.title ?? '').trim()
  const initialMessage    = String(body?.message_text ?? '').trim()

  if (!documentId)       throw createError({ statusCode: 400, message: 'document_id is required.' })
  if (!reportedOfficeId) throw createError({ statusCode: 400, message: 'reported_by_office_id is required.' })
  if (!issueType)        throw createError({ statusCode: 400, message: 'issue_type is required.' })
  if (!title)            throw createError({ statusCode: 400, message: 'title is required.' })

  const { actor, document } = await assertDocumentOrgAccess(event, client, documentId)

  if (!(ISSUE_ALLOWED_ROLES as readonly string[]).includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client or employee accounts may flag document issues.',
    })
  }

  const reportingOffice = await assertReportingOfficeAccess(client, actor, reportedOfficeId)

  // Auto-resolve where this document goes back to — whoever sent it here.
  const previousOffice = await resolvePreviousRouteOffice(client, documentId)
  const targetOfficeId = previousOffice?.officeId ?? reportedOfficeId
  const targetOfficeName = previousOffice?.officeName ?? reportingOffice.name

  // ── 1. Create issue row ───────────────────────────────────────────────
  const { data: issue, error: issueErr } = await client
    .from('document_issues')
    .insert({
      document_id:           documentId,
      org_id:                actor.orgId,
      reported_by_office_id: reportedOfficeId,
      reported_by_desk_id:   document.current_desk_id ?? null,
      reported_by_user_id:   actor.userId,
      target_office_id:      targetOfficeId,
      issue_type:            issueType,
      details:               details || null,
      title,
      status:                'OPEN',
    })
    .select('id, document_id, org_id, reported_by_office_id, reported_by_desk_id, reported_by_user_id, target_office_id, issue_type, details, title, status, created_at')
    .single()

  if (issueErr || !issue) {
    throw createError({
      statusCode: 500,
      message: issueErr?.message ?? 'Failed to create document issue.',
    })
  }

  // ── 2. Flip tracking status AND rewind one stop back to the previous office ──
  const docUpdatePayload: Record<string, unknown> = { tracking_status: 'DISCREPANCY_REPORTED' }
  if (previousOffice) {
    docUpdatePayload.current_step = previousOffice.newStep
    docUpdatePayload.current_office_id = previousOffice.officeId
  }

  const { data: updatedDoc, error: docUpdateErr } = await client
    .from('documents')
    .update(docUpdatePayload)
    .eq('id', documentId)
    .eq('org_id', actor.orgId)
    .select('id, title, tracking_status, current_step, current_office_id')
    .single()

  if (docUpdateErr) {
    throw createError({
      statusCode: 500,
      message: `Issue created but failed to update document status: ${docUpdateErr.message}`,
    })
  }

  // ── 3. Critical alert on logistics timeline ───────────────────────────
  const alertNotes = previousOffice
    ? `⚠️ DISCREPANCY REPORTED — "${title}" flagged by ${reportingOffice.name}` +
      `${reportingOffice.code ? ` (${reportingOffice.code})` : ''}. ` +
      `Document "${document.title}" sent back to ${previousOffice.officeName} for correction. ` +
      `Issue ID: ${issue.id}.`
    : `⚠️ DISCREPANCY REPORTED — "${title}" flagged by ${reportingOffice.name}` +
      `${reportingOffice.code ? ` (${reportingOffice.code})` : ''}. ` +
      `Document "${document.title}" requires attention before routing continues. ` +
      `Issue ID: ${issue.id}.`

  const { data: trackingEvent, error: trackErr } = await client
    .from('document_tracking_events')
    .insert({
      document_id: documentId,
      org_id:      actor.orgId,
      status:      'DISCREPANCY_REPORTED',
      step_index:  previousOffice?.newStep ?? null,
      office_id:   previousOffice?.officeId ?? null,
      office_name: previousOffice?.officeName ?? reportingOffice.name,
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

  await logActivitySafe({
    orgId: actor.orgId,
    userId: actor.userId,
    userName: actor.fullName,
    actorName: actor.fullName,
    actionType: 'issue_report',
    details: alertNotes,
    message: `Issue reported on "${document.title}": ${title}`,
    documentId: documentId,
    officeId: reportedOfficeId,
    metadata: { issue_id: issue.id, office_name: reportingOffice.name },
  }, client)

  try {
    await broadcastComplianceIssueNotification({
      orgId: actor.orgId,
      documentId,
      documentTitle: document.title,
      issueId: issue.id,
      issueTitle: title,
      targetOfficeId,
      targetOfficeName,
      reporterName: actor.fullName,
    })
  } catch (notifyErr) {
    console.warn('[issues/create] Compliance notification failed:', notifyErr)
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
    reportedOffice: reportingOffice,
    actor: {
      user_id:   actor.userId,
      full_name: actor.fullName,
      role:      actor.userRole,
    },
    timestamp: new Date().toISOString(),
  }

  await broadcastIssueRealtime(actor.orgId, issue.id, 'issue_created', realtimePayload)
  await broadcastIssueRealtime(actor.orgId, issue.id, 'logistics_alert', {
    type:          'logistics_alert',
    document_id:   documentId,
    document_title: document.title,
    trackingEvent: trackingEvent ?? null,
    issue,
    timestamp:     new Date().toISOString(),
  })

  try {
    const { data: creatorFields } = await client
      .from('documents')
      .select('user_id, creator_role, current_step, qr_code_data')
      .eq('id', documentId)
      .maybeSingle()

    await emitDiscrepancyEmail({
      orgId: actor.orgId,
      documentId,
      title: document.title,
      trackingCode: creatorFields?.qr_code_data ?? null,
      creatorUserId: creatorFields?.user_id ? String(creatorFields.user_id) : null,
      creatorRole: creatorFields?.creator_role ?? null,
      status: 'DISCREPANCY_REPORTED',
      currentStep: creatorFields?.current_step ?? 0,
      currentOfficeName: targetOfficeName,
    })
  } catch (emailErr) {
    console.warn('[issues/create] Non-fatal: discrepancy email failed:', emailErr)
  }

  return {
    success: true,
    message: previousOffice
      ? `Issue flagged. Document sent back to ${previousOffice.officeName} for correction.`
      : `Issue flagged. Document tracking status set to DISCREPANCY_REPORTED.`,
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
