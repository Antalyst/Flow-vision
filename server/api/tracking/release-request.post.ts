/**
 * POST /api/tracking/release-request
 *
 * The staff member holding a document asks the office head to release it to
 * the next destination (or, at the final stop, to complete it). There is no
 * staff-approval count — the office head's decision is the only release gate.
 *
 * Body: { document_id: string, remarks?: string }
 * One pending request per document (unique index) — a repeat returns 409.
 */
import { isFinalStep, lifecycleDb, routeStopAt } from '~~/server/utils/documentRoute'
import { notifyUser, recordTrackingEvent, assertHistorySaved, type TrackingEventResult } from '~~/server/utils/documentAccess'
import { loadDocumentAtMyOffice } from '~~/server/utils/officeWorkflow'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ctx = await loadDocumentAtMyOffice(event, body?.document_id)
  const { actor, doc, route, step, officeId, officeName } = ctx
  // History entries this request writes; success is only reported once they're saved.
  const tracked: TrackingEventResult[] = []
  const remarks = typeof body?.remarks === 'string' ? body.remarks.trim().slice(0, 1000) : ''

  if (!ctx.isHolder && !ctx.isHead) {
    throw createError({
      statusCode: 403,
      message: 'Only the staff member holding this document can request its release.',
      data: { code: 'NOT_CURRENT_HOLDER' },
    })
  }
  if (!ctx.headId) {
    throw createError({ statusCode: 422, message: 'This office has no office head assigned, so release can\'t be approved. Ask your administrator to assign one.' })
  }
  if ((doc.checkpoint_cleared_step ?? null) === step) {
    throw createError({ statusCode: 409, message: 'This document is already approved for release.', data: { code: 'ALREADY_APPROVED' } })
  }

  const finalStop = isFinalStep(route, step)
  const { data: request, error } = await lifecycleDb()
    .from('document_release_requests')
    .insert({
      document_id: doc.id,
      org_id: actor.orgId,
      office_id: officeId,
      step_number: step,
      requested_by: actor.userId,
      remarks: remarks || null,
      status: 'PENDING',
    })
    .select('id, requested_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw createError({ statusCode: 409, message: 'A release request for this document is already waiting for the office head.', data: { code: 'REQUEST_PENDING' } })
    }
    throw createError({ statusCode: 500, message: 'We could not send the release request. Please try again.' })
  }

  const nextStop = routeStopAt(route, step + 1)
  tracked.push(await recordTrackingEvent({
    document_id: doc.id,
    org_id: actor.orgId,
    status: 'ARRIVED_AT_OFFICE',
    step_index: step,
    office_name: officeName,
    actor_id: actor.userId,
    actor_role: actor.userRole,
    actor_name: actor.fullName,
    event_type: 'RELEASE_REQUESTED',
    notes: `${actor.fullName ?? 'Staff'} asked the office head to ${finalStop ? 'complete' : 'release'} "${doc.title}".` +
      (remarks ? ` Remarks: ${remarks}` : ''),
    metadata: { office_id: officeId, request_id: request.id, final_stop: finalStop },
  }))
  assertHistorySaved(tracked, 'The release request')

  if (ctx.headId !== actor.userId) {
    await notifyUser({
      orgId: actor.orgId,
      documentId: doc.id,
      documentTitle: doc.title,
      userId: ctx.headId,
      title: finalStop ? 'Completion Approval Requested' : 'Release Approval Requested',
      message: `${actor.fullName ?? 'A staff member'} requests approval to ${finalStop ? 'complete' : `release "${doc.title}" to ${nextStop?.office_name ?? 'the next office'}`}` +
        (finalStop ? ` "${doc.title}".` : '.'),
    })
  }

  return {
    success: true,
    message: 'Release request sent to the office head.',
    data: { request_id: request.id, requested_at: request.requested_at, final_stop: finalStop },
  }
})
