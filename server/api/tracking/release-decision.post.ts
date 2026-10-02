/**
 * POST /api/tracking/release-decision
 *
 * The office head (offices.assigned_user of the document's current office)
 * approves or rejects the pending release request.
 *
 *  - Approve, more stops left → the document is cleared for liaison
 *    assignment and pickup (checkpoint_cleared_step = current step).
 *  - Approve, final stop      → the document is COMPLETED (no liaison needed).
 *  - Reject                   → stays at the office with its holder; the
 *    holder may fix the issue and request again.
 *
 * Body: { document_id: string, decision: 'approve' | 'reject', remarks?: string }
 */
import { isFinalStep, lifecycleDb, routeStopAt } from '~~/server/utils/documentRoute'
import { notifyUser, recordTrackingEvent, assertHistorySaved, type TrackingEventResult } from '~~/server/utils/documentAccess'
import { notifyDocumentCreator } from '~~/server/utils/notifications'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { emitCompletedEmail } from '~~/server/utils/email/emailEvents'
import { loadDocumentAtMyOffice } from '~~/server/utils/officeWorkflow'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const decision = body?.decision === 'approve' ? 'APPROVED' : body?.decision === 'reject' ? 'REJECTED' : null
  if (!decision) throw createError({ statusCode: 400, message: 'Choose approve or reject.' })
  const remarks = typeof body?.remarks === 'string' ? body.remarks.trim().slice(0, 1000) : ''
  if (decision === 'REJECTED' && !remarks) {
    throw createError({ statusCode: 400, message: 'Please give a reason for rejecting the release.' })
  }

  const ctx = await loadDocumentAtMyOffice(event, body?.document_id)
  const { client, actor, doc, route, step, officeId, officeName } = ctx
  // History entries this request writes; success is only reported once they're saved.
  const tracked: TrackingEventResult[] = []
  if (!ctx.isHead) {
    throw createError({ statusCode: 403, message: 'Only the head of this office can approve or reject a release.', data: { code: 'NOT_OFFICE_HEAD' } })
  }

  const db = lifecycleDb()
  const now = new Date().toISOString()
  const { data: decided, error } = await db
    .from('document_release_requests')
    .update({ status: decision, decided_by: actor.userId, decided_at: now, decision_remarks: remarks || null })
    .eq('document_id', doc.id)
    .eq('office_id', officeId)
    .eq('status', 'PENDING')
    .select('id, requested_by')
  if (error) throw createError({ statusCode: 500, message: 'We could not save the decision. Please try again.' })
  if (!decided || decided.length === 0) {
    throw createError({ statusCode: 409, message: 'There is no pending release request for this document.', data: { code: 'NO_PENDING_REQUEST' } })
  }
  const requesterId = decided[0]!.requested_by ? String(decided[0]!.requested_by) : null
  const finalStop = isFinalStep(route, step)
  const nextStop = routeStopAt(route, step + 1)

  const notifyCreator = (title: string, message: string) => notifyDocumentCreator({
    orgId: actor.orgId,
    documentId: doc.id,
    documentTitle: doc.title,
    userId: doc.user_id,
    creatorRole: doc.creator_role,
    officeId: doc.origin_office_id ?? doc.office_id ?? null,
    title,
    message,
  })

  if (decision === 'REJECTED') {
    tracked.push(await recordTrackingEvent({
      document_id: doc.id, org_id: actor.orgId, status: 'ARRIVED_AT_OFFICE', step_index: step, office_name: officeName,
      actor_id: actor.userId, actor_role: actor.userRole, actor_name: actor.fullName,
      event_type: 'RELEASE_REJECTED',
      notes: `${actor.fullName ?? 'The office head'} did not approve the release of "${doc.title}". Reason: ${remarks}`,
      metadata: { office_id: officeId, request_id: decided[0]!.id },
    }))
    assertHistorySaved(tracked, 'The rejection')
    await notifyUser({
      orgId: actor.orgId, documentId: doc.id, documentTitle: doc.title, userId: requesterId,
      title: 'Release Not Approved',
      message: `The office head did not approve releasing "${doc.title}". Reason: ${remarks}`,
    })
    return { success: true, message: 'Release rejected. The document stays at this office.', data: { decision } }
  }

  // Approved — conditional on the document still being here, unapproved.
  const docUpdate = finalStop
    ? { tracking_status: 'COMPLETED', status: 'Approved', checkpoint_cleared_step: step, assigned_messenger_id: null }
    : { checkpoint_cleared_step: step }
  const { data: updated, error: docErr } = await db
    .from('documents')
    .update(docUpdate)
    .eq('id', doc.id)
    .eq('tracking_status', 'ARRIVED_AT_OFFICE')
    .eq('current_office_id', officeId)
    .eq('current_step', step)
    .select('id')
  if (docErr || !updated || updated.length === 0) {
    console.error('[release-decision] request approved but document update failed', { document_id: doc.id, error: docErr?.message })
    throw createError({ statusCode: 409, message: 'The document changed while you were deciding. Refresh and try again.' })
  }

  tracked.push(await recordTrackingEvent({
    document_id: doc.id, org_id: actor.orgId,
    status: finalStop ? 'COMPLETED' : 'ARRIVED_AT_OFFICE',
    step_index: step, office_name: officeName,
    actor_id: actor.userId, actor_role: actor.userRole, actor_name: actor.fullName,
    event_type: finalStop ? 'DOCUMENT_COMPLETED' : 'RELEASE_APPROVED',
    notes: finalStop
      ? `${actor.fullName ?? 'The office head'} approved and completed "${doc.title}" at ${officeName}.`
      : `${actor.fullName ?? 'The office head'} approved releasing "${doc.title}" to ${nextStop?.office_name ?? 'the next office'}.`,
    metadata: { office_id: officeId, request_id: decided[0]!.id, remarks: remarks || null },
  }))
  assertHistorySaved(tracked, 'The decision')

  await logActivitySafe({
    orgId: actor.orgId, officeId, userId: actor.userId, userName: actor.fullName, actorName: actor.fullName,
    actionType: 'system',
    details: finalStop ? `Completed "${doc.title}" at ${officeName}` : `Approved release of "${doc.title}" from ${officeName}`,
    message: finalStop ? `Completed "${doc.title}" at ${officeName}` : `Approved release of "${doc.title}" from ${officeName}`,
    documentId: doc.id,
    metadata: { tracking_status: finalStop ? 'COMPLETED' : 'ARRIVED_AT_OFFICE', release_approved: true },
  }, client)

  if (requesterId && requesterId !== actor.userId) {
    await notifyUser({
      orgId: actor.orgId, documentId: doc.id, documentTitle: doc.title, userId: requesterId,
      title: finalStop ? 'Completion Approved' : 'Release Approved',
      message: finalStop
        ? `The office head approved and completed "${doc.title}".`
        : `The office head approved releasing "${doc.title}". Assign a liaison to deliver it to ${nextStop?.office_name ?? 'the next office'}.`,
    })
  }

  if (finalStop) {
    await notifyCreator('Document Completed', `Your document "${doc.title}" has completed its route at ${officeName}.`)
    try {
      await emitCompletedEmail({
        orgId: actor.orgId, documentId: doc.id, title: doc.title, trackingCode: (doc as any).qr_code_data ?? null,
        creatorUserId: doc.user_id ? String(doc.user_id) : null, creatorRole: doc.creator_role ?? null,
        status: 'COMPLETED', currentStep: step, currentOfficeName: officeName,
      })
    } catch (emailErr) {
      console.warn('[release-decision] Non-fatal: completion email failed:', emailErr)
    }
    return { success: true, message: 'Document completed.', data: { decision, completed: true } }
  }

  await notifyCreator(
    'Release Approved',
    `${officeName} approved releasing your document "${doc.title}" to ${nextStop?.office_name ?? 'the next office'}. A liaison will be assigned.`,
  )
  return {
    success: true,
    message: `Release approved. Assign a liaison to deliver it to ${nextStop?.office_name ?? 'the next office'}.`,
    data: { decision, completed: false, next_office: nextStop },
  }
})
