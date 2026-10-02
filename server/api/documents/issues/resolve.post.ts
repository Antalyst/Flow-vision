import { serverSupabaseClient } from '#supabase/server'
import {
  assertIssueParticipant,
  assertIssueOrgAccess,
  broadcastIssueRealtime,
  issueRealtimeChannel,
  orgLogisticsChannel,
} from '~~/server/utils/documentIssues'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { assertHistorySaved, recordTrackingEvent } from '~~/server/utils/documentAccess'

/**
 * POST /api/documents/issues/resolve
 *
 * Marks an issue RESOLVED and returns the document to ARRIVED_AT_OFFICE
 * so the clean delivery workflow can continue.
 *
 * Body:
 *   issue_id  UUID  required
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body   = await readBody(event)

  const issueId = String(body?.issue_id ?? '').trim()
  if (!issueId) {
    throw createError({ statusCode: 400, message: 'issue_id is required.' })
  }

  const { actor, issue } = await assertIssueOrgAccess(event, client, issueId)

  // Role + one of the offices on this issue (or the org admin).
  await assertIssueParticipant(event, client, issue)

  if (issue.status === 'RESOLVED') {
    throw createError({ statusCode: 422, message: 'Issue is already resolved.' })
  }

  const { data: document, error: docErr } = await client
    .from('documents')
    .select('id, org_id, title, tracking_status, current_office_id, current_step')
    .eq('id', issue.document_id)
    .eq('org_id', actor.orgId)
    .maybeSingle()

  if (docErr || !document) {
    throw createError({ statusCode: 404, message: 'Parent document not found.' })
  }

  const { data: resolvedIssue, error: issueErr } = await client
    .from('document_issues')
    .update({ status: 'RESOLVED' })
    .eq('id', issueId)
    .eq('org_id', actor.orgId)
    .select('id, document_id, org_id, reported_by_office_id, title, status, created_at')
    .single()

  if (issueErr || !resolvedIssue) {
    throw createError({
      statusCode: 500,
      message: issueErr?.message ?? 'Failed to resolve issue.',
    })
  }

  // Mark the current step reviewed/cleared too — this is what
  // AssignLiaisonPanel checks to offer pickup again immediately, the same
  // as a normal (non-flagged) office desk review would.
  const { data: updatedDoc, error: trackUpdateErr } = await client
    .from('documents')
    .update({
      tracking_status: 'ARRIVED_AT_OFFICE',
      checkpoint_cleared_step: document.current_step ?? 0,
    })
    .eq('id', issue.document_id)
    .eq('org_id', actor.orgId)
    .select('id, title, tracking_status, current_office_id, current_step, checkpoint_cleared_step')
    .single()

  if (trackUpdateErr) {
    throw createError({
      statusCode: 500,
      message: `Issue resolved but failed to restore document status: ${trackUpdateErr.message}`,
    })
  }

  const resolveNotes =
    `Issue "${issue.title}" marked RESOLVED by ${actor.fullName ?? 'an operator'}. ` +
    `Document is ready for pickup again — clean delivery workflow resumed.`

  const history = await recordTrackingEvent({
    document_id: issue.document_id,
    org_id:      actor.orgId,
    status:      'ARRIVED_AT_OFFICE',
    step_index:  document.current_step ?? null,
    office_name: null,
    actor_id:    actor.userId,
    actor_role:  actor.userRole,
    actor_name:  actor.fullName,
    event_type:  'DISCREPANCY_RESOLVED',
    notes:       resolveNotes,
    metadata:    { issue_id: issueId, office_id: document.current_office_id ?? null },
  })
  assertHistorySaved([history], 'Resolving the discrepancy')
  const trackingEvent = history.ok ? history.row : null

  await logActivitySafe({
    orgId: actor.orgId,
    userId: actor.userId,
    userName: actor.fullName,
    actorName: actor.fullName,
    actionType: 'issue_resolve',
    details: resolveNotes,
    message: `Issue resolved: ${issue.title}`,
    documentId: issue.document_id,
    officeId: issue.reported_by_office_id ?? null,
    metadata: { issue_id: issueId },
  }, client)

  const payload = {
    type:          'issue_resolved',
    issue:         resolvedIssue,
    document:      updatedDoc,
    trackingEvent: trackingEvent ?? null,
    timestamp:     new Date().toISOString(),
  }

  await broadcastIssueRealtime(actor.orgId, issueId, 'issue_resolved', payload)
  await broadcastIssueRealtime(actor.orgId, issueId, 'logistics_alert', {
    type:          'logistics_alert',
    document_id:   issue.document_id,
    document_title: document.title,
    trackingEvent: trackingEvent ?? null,
    issue:         resolvedIssue,
    timestamp:     new Date().toISOString(),
  })

  return {
    success: true,
    message: 'Issue resolved. Document is ready for pickup again.',
    data: {
      issue:         resolvedIssue,
      document:      updatedDoc,
      trackingEvent: trackingEvent ?? null,
    },
    realtime: {
      issueChannel:     issueRealtimeChannel(actor.orgId, issueId),
      logisticsChannel: orgLogisticsChannel(actor.orgId),
      event:            'issue_resolved',
    },
  }
})
