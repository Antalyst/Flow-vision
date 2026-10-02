/**
 * POST /api/tracking/receive
 *
 * A staff member of the destination office scans the document's QR when the
 * liaison hands it over. This scan is the official arrival + receipt: the
 * document moves to ARRIVED_AT_OFFICE at that office, the scanning user
 * becomes its current holder, and the liaison's delivery leg is closed.
 *
 * Body: { qr_code_data?: string, document_id?: string }
 *
 * The receiving user is always the signed-in session user — never an id in
 * the request. A repeated scan returns 409 ALREADY_RECEIVED and changes nothing.
 */
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { getDocumentRoute, isFinalStep, lifecycleDb, routeStopAt } from '~~/server/utils/documentRoute'
import { ACCESS_DOC_COLUMNS, notifyUser, recordTrackingEvent, userFullName, assertHistorySaved, type TrackingEventResult } from '~~/server/utils/documentAccess'
import { notifyDocumentCreator } from '~~/server/utils/notifications'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { parseDocumentScanBody } from '~~/server/utils/documentScan'
import { closeCycleOnCompletion } from '~~/server/utils/recurringRouting'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)
  // History entries this request writes; success is only reported once they're saved.
  const tracked: TrackingEventResult[] = []
  if (actor.userRole !== 'employee' && actor.userRole !== 'employee_sub_user') {
    throw createError({ statusCode: 403, message: 'Only office staff can receive documents.' })
  }

  const { qrCodeData, documentId } = parseDocumentScanBody(await readBody(event))
  const db = lifecycleDb()
  let query = db.from('documents').select(`${ACCESS_DOC_COLUMNS}, title, creator_role, qr_code_data`)
  query = documentId ? query.eq('id', documentId) : query.eq('qr_code_data', qrCodeData!)
  const { data: doc } = await query.maybeSingle()

  if (!doc || String(doc.org_id) !== actor.orgId) {
    throw createError({ statusCode: 404, message: 'We could not find a document for this QR code.' })
  }

  const step = doc.current_step ?? 0
  const mine = new Set(actor.officeIds)

  if (doc.tracking_status !== 'IN_TRANSIT') {
    if (doc.tracking_status === 'ARRIVED_AT_OFFICE' && doc.current_office_id && mine.has(String(doc.current_office_id))) {
      throw createError({ statusCode: 409, message: 'Your office has already received this document.', data: { code: 'ALREADY_RECEIVED' } })
    }
    if (doc.tracking_status === 'COMPLETED') {
      throw createError({ statusCode: 422, message: 'This document has already completed its route.', data: { code: 'DOCUMENT_COMPLETED' } })
    }
    throw createError({
      statusCode: 422,
      message: 'This document is not on its way to an office right now. A liaison must pick it up first.',
      data: { code: 'NOT_IN_TRANSIT', tracking_status: doc.tracking_status },
    })
  }

  const route = await getDocumentRoute(doc)
  // Step 0 is the origin office (it has no route stop) — reached only when a
  // flagged document is returned there for correction.
  let stop = routeStopAt(route, step)
  if (!stop && step === 0) {
    const originId = doc.origin_office_id ?? doc.office_id
    if (originId) {
      const { data: originOffice } = await db.from('offices').select('name').eq('id', originId).maybeSingle()
      stop = { step_number: 0, office_id: String(originId), office_name: originOffice?.name ?? 'Origin office' }
    }
  }
  if (!stop) {
    throw createError({ statusCode: 422, message: 'This document\'s route has no stop for its current leg.', data: { code: 'ROUTE_NOT_CONFIGURED' } })
  }
  if (!mine.has(stop.office_id)) {
    throw createError({
      statusCode: 403,
      message: `This document is being delivered to ${stop.office_name}, not to your office.`,
      data: { code: 'NOT_DESTINATION_OFFICE', destination: stop.office_name },
    })
  }

  // A flagged document being RETURNED for correction (open issue sent to this
  // office): it arrives still flagged, and the receiving office now holds it
  // to fix it and resolve the issue. It never completes a cycle or the route.
  const { data: openIssue } = await db
    .from('document_issues')
    .select('id, title, target_office_id')
    .eq('document_id', doc.id)
    .eq('status', 'OPEN')
    .limit(1)
    .maybeSingle()
  const returnedForCorrection = !!openIssue && String(openIssue.target_office_id) === stop.office_id

  // Recurring documents: receipt back at the creator's office (the return stop)
  // completes the routing cycle — nothing else is required at that stop.
  const completesCycle = !!stop.is_return && !returnedForCorrection

  // Conditional transition: only one receipt can ever win.
  const { data: updated, error: updateErr } = await db
    .from('documents')
    .update({
      tracking_status: returnedForCorrection ? 'DISCREPANCY_REPORTED' : completesCycle ? 'COMPLETED' : 'ARRIVED_AT_OFFICE',
      current_office_id: stop.office_id,
      current_handler_id: actor.userId,
      current_desk_id: null,
      checkpoint_cleared_step: completesCycle ? step : null,
      assigned_messenger_id: null,
    })
    .eq('id', doc.id)
    .eq('tracking_status', 'IN_TRANSIT')
    .eq('current_step', step)
    .select('id')
  if (updateErr) throw createError({ statusCode: 500, message: 'We could not record the receipt. Please try again.' })
  if (!updated || updated.length === 0) {
    throw createError({ statusCode: 409, message: 'This document was already received.', data: { code: 'ALREADY_RECEIVED' } })
  }

  const now = new Date().toISOString()
  const liaisonId = doc.assigned_messenger_id ? String(doc.assigned_messenger_id) : null
  const { error: legErr } = await db
    .from('document_liaison_assignments')
    .update({ status: 'COMPLETED', delivered_at: now, received_by: actor.userId })
    .eq('document_id', doc.id)
    .eq('status', 'ACTIVE')
  if (legErr) console.error('[receive] could not close liaison assignment:', legErr.message)

  const liaisonName = await userFullName(liaisonId)
  const finalStop = !returnedForCorrection && isFinalStep(route, step)

  // The document's COMPLETED state (committed above, conditionally) is the
  // authoritative completion. The cycle record follows it; if writing it fails
  // even after a retry, the receipt below still records the real receiver and
  // time, and the next reactivation repairs the cycle from that receipt
  // (repairStaleActiveCycle), so the document can't get stuck.
  const cycleRecordClosed = completesCycle
    ? await closeCycleOnCompletion(doc.id, stop.cycle_number ?? 1, actor.userId, now)
    : true

  tracked.push(await recordTrackingEvent({
    document_id: doc.id,
    org_id: actor.orgId,
    status: 'ARRIVED_AT_OFFICE',
    step_index: step,
    office_name: stop.office_name,
    actor_id: actor.userId,
    actor_role: actor.userRole,
    actor_name: actor.fullName,
    event_type: 'RECEIVED_BY_OFFICE',
    notes: (returnedForCorrection
      ? `Returned to ${stop.office_name} for correction — received by ${actor.fullName ?? 'office staff'}`
      : `Received at ${stop.office_name} by ${actor.fullName ?? 'office staff'}`) +
      (liaisonName ? ` from ${liaisonName}.` : '.'),
    metadata: {
      office_id: stop.office_id, receiver_id: actor.userId, liaison_id: liaisonId, final_stop: finalStop, cycle_number: stop.cycle_number ?? 1,
      ...(returnedForCorrection ? { returned_for_issue_id: openIssue!.id } : {}),
    },
  }))

  if (completesCycle) {
    tracked.push(await recordTrackingEvent({
      document_id: doc.id,
      org_id: actor.orgId,
      status: 'COMPLETED',
      step_index: step,
      office_name: stop.office_name,
      actor_id: actor.userId,
      actor_role: actor.userRole,
      actor_name: actor.fullName,
      event_type: 'CYCLE_COMPLETED',
      notes: `Routing cycle ${stop.cycle_number ?? 1} completed: "${doc.title}" was returned to ${stop.office_name}.`,
      metadata: {
        office_id: stop.office_id,
        cycle_number: stop.cycle_number ?? 1,
        receiver_id: actor.userId,
        ...(cycleRecordClosed ? {} : { cycle_record_pending: true }),
      },
    }))
  }
  assertHistorySaved(tracked, 'The receipt')

  await logActivitySafe({
    orgId: actor.orgId,
    officeId: stop.office_id,
    userId: actor.userId,
    userName: actor.fullName,
    actorName: actor.fullName,
    actionType: 'dropoff',
    details: `${actor.fullName ?? 'Office staff'} received "${doc.title}" at ${stop.office_name}`,
    message: `${actor.fullName ?? 'Office staff'} received "${doc.title}" at ${stop.office_name}`,
    documentId: doc.id,
    metadata: { tracking_status: 'ARRIVED_AT_OFFICE', office_name: stop.office_name, final_stop: finalStop },
  }, client)

  await notifyDocumentCreator({
    orgId: actor.orgId,
    documentId: doc.id,
    documentTitle: doc.title,
    userId: doc.user_id,
    creatorRole: doc.creator_role,
    officeId: doc.origin_office_id ?? doc.office_id ?? null,
    title: returnedForCorrection
      ? `Flagged Document Returned to ${stop.office_name}`
      : completesCycle
        ? `Routing Cycle ${stop.cycle_number ?? 1} Completed`
        : `Document Received by ${stop.office_name}`,
    message: returnedForCorrection
      ? `Your document "${doc.title}" was returned to ${stop.office_name} for correction and is held by ${actor.fullName ?? 'office staff'} until the issue is resolved.`
      : completesCycle
        ? `Your document "${doc.title}" was returned to ${stop.office_name}. Cycle ${stop.cycle_number ?? 1} is complete — you can reactivate it for another cycle from its details.`
        : `Your document "${doc.title}" has arrived at ${stop.office_name} and is now held by ${actor.fullName ?? 'office staff'}.`,
  })
  await notifyUser({
    orgId: actor.orgId,
    documentId: doc.id,
    documentTitle: doc.title,
    userId: liaisonId,
    title: 'Delivery Confirmed',
    message: `${stop.office_name} confirmed receipt of "${doc.title}". Your delivery is complete.`,
  })

  return {
    success: true,
    message: returnedForCorrection
      ? `Received at ${stop.office_name} for correction. You now hold it — fix the issue, then mark it resolved to send it on again.`
      : completesCycle
      ? `Received back at ${stop.office_name}. Routing cycle ${stop.cycle_number ?? 1} is complete.`
      : finalStop
        ? `Received at ${stop.office_name}. This is the final stop — ask the office head to approve completion when done.`
        : `Received at ${stop.office_name}. You are now holding this document.`,
    data: {
      document: { id: doc.id, title: doc.title, tracking_status: returnedForCorrection ? 'DISCREPANCY_REPORTED' : completesCycle ? 'COMPLETED' : 'ARRIVED_AT_OFFICE', current_step: step },
      returned_for_correction: returnedForCorrection,
      cycle_completed: completesCycle ? (stop.cycle_number ?? 1) : null,
      office: { id: stop.office_id, name: stop.office_name },
      holder: { id: actor.userId, name: actor.fullName },
      final_stop: finalStop,
    },
  }
})
