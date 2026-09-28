import { serverSupabaseClient } from '#supabase/server'
import { logActivitySafe } from '~~/server/utils/activityLog'
import {
  broadcastInboundDispatchRealtime,
  broadcastInboundOfficeNotification,
  broadcastOfficeReviewNotification,
  notifyClientStatusUpdate,
  notifyDocumentOwner,
} from '~~/server/utils/notifications'
import { emitArrivedEmail } from '~~/server/utils/email/emailEvents'
import { getDeskByQr, getDeskWithOffice, type DeskWithOffice } from '~~/server/utils/deskAccess'

/**
 * POST /api/tracking/dropoff
 *
 * Handshake Part 2 – Messenger scans the QR code posted on an office wall.
 *
 * Flow:
 *   IN_TRANSIT  →  ARRIVED_AT_OFFICE  (employee desk review required before pickup / completion)
 *
 * Validation chain:
 *   1. Messenger is authenticated and belongs to the same org as the office.
 *   2. Office exists and belongs to the same org (cross-tenant leakage guard).
 *   3. Messenger has exactly one IN_TRANSIT document assigned to them.
 *   4. The scanned office matches the document's expected next step in the route.
 *
 * Body:
 *   office_id   string (UUID)   From flowvision://office/{uuid} or flowvision://track/checkpoint?office_id={uuid}
 *
 * Security:
 *   - org_id is ALWAYS read server-side from the session; never trusted from the body.
 *   - SECURITY_ORG_MISMATCH: thrown if office belongs to a different org.
 *   - ROUTE_MISMATCH: thrown if office is not the expected next stop.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body   = await readBody(event)

  const deskQr = body?.desk_qr ? String(body.desk_qr).trim() : ''
  const deskIdInput = body?.desk_id ? String(body.desk_id).trim() : ''
  let office_id = body?.office_id ? String(body.office_id).trim() : ''

  // ── Optional desk-level delivery ────────────────────────────────────────
  // If the Liaison scanned a desk QR (or the client resolved one and sent its
  // id), the desk's office is the authoritative destination office for every
  // check below — desks are a sub-location INSIDE an office, never a second
  // routing system (stage_steps still only ever lists offices).
  let deliveryDesk: DeskWithOffice | null = null

  if (deskQr || deskIdInput) {
    deliveryDesk = deskQr
      ? await getDeskByQr(client, deskQr)
      : await getDeskWithOffice(client, deskIdInput)

    if (!deliveryDesk) {
      throw createError({ statusCode: 404, message: 'This desk could not be found.', data: { code: 'DESK_NOT_FOUND' } })
    }
    if (!deliveryDesk.is_active) {
      throw createError({ statusCode: 422, message: 'This desk is currently inactive.', data: { code: 'DESK_INACTIVE' } })
    }
    office_id = String(deliveryDesk.office_id)
  }

  if (!office_id) {
    throw createError({ statusCode: 400, message: 'Please scan an office or desk QR code to continue.' })
  }

  // ── Auth: messenger only ──────────────────────────────────────────────
  const actorId   = getCookie(event, 'user_session')
  const actorRole = getCookie(event, 'user_role')

  if (!actorId) throw createError({ statusCode: 401, message: 'Authentication required' })
  // employee_sub_user included: assign-liaison.post.ts allows this role as an eligible
  // Liaison, so whoever is actually assigned must be able to perform the physical scan.
  // This is only the identity gate — the real authorization is the assigned_messenger_id
  // filter on the activeDocs query below, which is role-agnostic and remains unchanged.
  if (!['messenger', 'client', 'employee', 'employee_sub_user'].includes(actorRole)) {
    throw createError({ statusCode: 403, message: 'You do not have permission to deliver documents.' })
  }

  // ── Resolve messenger org ─────────────────────────────────────────────
  const { data: actorRow, error: actorErr } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (actorErr || !actorRow?.org_id) {
    throw createError({ statusCode: 403, message: 'We could not find your office account. Please contact your administrator.' })
  }

  const messengerOrgId = String(actorRow.org_id)

  // ── Verify office exists and belongs to messenger's org ───────────────
  // offices.id is UUID — pass as raw string, never Number()
  const { data: office, error: officeErr } = await client
    .from('offices')
    .select('id, name, code, org_id')
    .eq('id', String(office_id))
    .maybeSingle()

  if (officeErr) throw createError({ statusCode: 500, message: officeErr.message })

  if (!office) {
    throw createError({
      statusCode: 404,
      message: 'We could not find this office. Please scan a valid FlowVision office QR code.',
    })
  }

  // ── SECURITY: cross-org leakage guard ─────────────────────────────────
  if (String(office.org_id) !== messengerOrgId) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to deliver documents to this office.',
      data: { code: 'SECURITY_ORG_MISMATCH', office_org: office.org_id, messenger_org: messengerOrgId },
    })
  }

  // ── Find this messenger's active IN_TRANSIT document ──────────────────
  const { data: activeDocs, error: docErr } = await client
    .from('documents')
    .select('id, org_id, user_id, title, tracking_status, current_step, stage_id, creator_role, qr_code_data')
    .eq('assigned_messenger_id', actorId)
    .eq('org_id', messengerOrgId)
    .eq('tracking_status', 'IN_TRANSIT')

  if (docErr) throw createError({ statusCode: 500, message: 'We could not load your documents. Please try again.' })

  if (!activeDocs || activeDocs.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'You do not have a document on the way. Please pick up a document first.',
    })
  }

  // Find the document whose current route step targets THIS office
  let targetDoc: (typeof activeDocs)[0] | null = null
  let totalSteps = 0

  for (const doc of activeDocs) {
    if (!doc.stage_id) continue

    const { data: stepRow } = await client
      .from('stage_steps')
      .select('office_id, step_number')
      .eq('stage_id', doc.stage_id)
      .eq('step_number', doc.current_step)
      .eq('office_id', String(office_id))
      .maybeSingle()

    if (stepRow) {
      // Count total steps for completion check
      const { count } = await client
        .from('stage_steps')
        .select('*', { count: 'exact', head: true })
        .eq('stage_id', doc.stage_id)

      totalSteps = count ?? 0
      targetDoc  = doc
      break
    }
  }

  // ── ROUTE validation ──────────────────────────────────────────────────
  if (!targetDoc) {
    throw createError({
      statusCode: 422,
      message: `This document is not scheduled for "${office.name}". Please continue to the correct office.`,
      data: { code: 'ROUTE_MISMATCH', scanned_office: office.name },
    })
  }

  // ── Determine if this is the final route stop (employee still must verify) ─
  const isFinalStop = totalSteps > 0 && targetDoc.current_step >= totalSteps
  const finalStatus = 'ARRIVED_AT_OFFICE'

  // ── Write ARRIVED_AT_OFFICE event (+ desk arrival details, if scanned) ──
  const deskArrivalNote = deliveryDesk ? ` Delivered to the ${deliveryDesk.name} desk.` : ''

  await client.from('document_tracking_events').insert({
    document_id:  targetDoc.id,
    org_id:       messengerOrgId,
    status:       'ARRIVED_AT_OFFICE',
    step_index:   targetDoc.current_step,
    office_id:    null,
    office_name:  office.name,
    actor_id:     actorId,
    actor_role:   'messenger',
    actor_name:   actorRow.full_name,
    event_type:   deliveryDesk ? 'DOCUMENT_ARRIVED_AT_DESK' : null,
    desk_id:      deliveryDesk?.id ?? null,
    handler_id:   deliveryDesk?.assigned_user_id ?? null,
    metadata:     deliveryDesk ? {
      from_office_id: office.id,
      to_office_id: office.id,
      to_office_name: office.name,
      to_desk_id: deliveryDesk.id,
      to_desk_name: deliveryDesk.name,
      to_handler_id: deliveryDesk.assigned_user_id,
      liaison_id: actorId,
      liaison_name: actorRow.full_name,
    } : null,
    notes:        `Arrived and checked in at ${office.name}${office.code ? ` (${office.code})` : ''}` +
      (isFinalStop ? ' — awaiting final desk review.' : '.') + deskArrivalNote,
  })

  // ── Update document state ─────────────────────────────────────────────
  const docUpdate: Record<string, any> = {
    tracking_status: finalStatus,
    current_office_id: String(office_id),
    checkpoint_cleared_step: null,
    assigned_messenger_id: null,
    current_desk_id: deliveryDesk?.id ?? null,
    current_handler_id: deliveryDesk?.assigned_user_id ?? null,
  }

  const { data: updatedDoc, error: updateErr } = await client
    .from('documents')
    .update(docUpdate)
    .eq('id', targetDoc.id)
    .select('id, title, tracking_status, current_step, current_desk_id, current_handler_id')
    .single()

  if (updateErr) throw createError({ statusCode: 500, message: 'We could not save this delivery. Please try again.' })

  const dropoffMessage = isFinalStop
    ? `${actorRow.full_name} delivered "${targetDoc.title}" to final stop ${office.name} — awaiting desk review`
    : `${actorRow.full_name} checked in "${targetDoc.title}" at ${office.name}`

  await logActivitySafe({
    orgId: messengerOrgId,
    officeId: String(office_id),
    userId: actorId,
    userName: actorRow.full_name,
    actorName: actorRow.full_name,
    actionType: 'dropoff',
    details: dropoffMessage,
    message: dropoffMessage,
    documentId: targetDoc.id,
    metadata: { tracking_status: finalStatus, office_name: office.name, is_final_stop: isFinalStop },
  }, client)

  const destinationOfficeId = String(office_id)
  const destinationOfficeName = office.name

  // Desk-aware wording for the creator: "arrived at the Evaluation Desk of the
  // Budget Office and is now assigned to Maria Santos" — falls back to the
  // existing office-only phrasing when no desk was scanned.
  let deskHandlerName: string | null = null
  if (deliveryDesk?.assigned_user_id) {
    const { data: handlerRow } = await client
      .from('users')
      .select('full_name')
      .eq('user_id', deliveryDesk.assigned_user_id)
      .maybeSingle()
    deskHandlerName = handlerRow?.full_name ?? null
  }

  const arrivalLocationLabel = deliveryDesk
    ? `the ${deliveryDesk.name} desk of ${destinationOfficeName}`
    : destinationOfficeName || 'the receiving office'
  const handlerSuffix = deliveryDesk
    ? (deskHandlerName ? ` and is now assigned to ${deskHandlerName}` : ' and is awaiting an assigned staff member')
    : ''

  if (targetDoc.user_id) {
    await notifyDocumentOwner({
      orgId: messengerOrgId,
      documentId: targetDoc.id,
      documentTitle: targetDoc.title,
      userId: String(targetDoc.user_id),
      title: `Document Received by ${destinationOfficeName || 'the receiving office'}`,
      message: `Your document "${targetDoc.title}" has arrived at ${arrivalLocationLabel}${handlerSuffix}.`,
      trackingStatus: finalStatus,
      targetOfficeId: destinationOfficeId,
      targetOfficeName: destinationOfficeName,
    })
  }

  await notifyClientStatusUpdate({
    orgId: messengerOrgId,
    documentId: targetDoc.id,
    documentTitle: targetDoc.title,
    trackingStatus: finalStatus,
    clientUserId: targetDoc.user_id ? String(targetDoc.user_id) : null,
    message: isFinalStop
      ? `Your document "${targetDoc.title}" has reached its final office (${office.name}) and will be verified shortly.`
      : `Your document "${targetDoc.title}" has arrived at ${arrivalLocationLabel}${handlerSuffix}.`,
  })

  try {
    await broadcastInboundOfficeNotification({
      orgId: messengerOrgId,
      documentId: targetDoc.id,
      documentTitle: targetDoc.title,
      messengerName: actorRow.full_name,
      officeId: destinationOfficeId,
      officeName: destinationOfficeName,
      title: 'Document Received — Please Verify',
      message: `${actorRow.full_name} delivered "${targetDoc.title}" to ${destinationOfficeName || 'your office'}. Open the document, confirm the paper copy, and mark it received to release it for the next pickup.`,
    })

    const dropoffDispatchPayload = {
      type: 'INCOMING_DISPATCH',
      event: 'INCOMING_DISPATCH',
      document_id: targetDoc.id,
      document_title: targetDoc.title,
      batch_manifest_id: null,
      target_office_id: destinationOfficeId,
      target_office_name: destinationOfficeName,
      next_step: targetDoc.current_step,
      assigned_messenger_id: null,
      messenger_name: actorRow.full_name,
      tracking_status: 'ARRIVED_AT_OFFICE',
      dispatched_at: new Date().toISOString(),
      notes: `${actorRow.full_name} delivered "${targetDoc.title}" to ${destinationOfficeName} — awaiting desk review.`,
    }

    await broadcastInboundDispatchRealtime(
      messengerOrgId,
      destinationOfficeId,
      'INCOMING_DISPATCH',
      dropoffDispatchPayload,
    )
    await broadcastInboundDispatchRealtime(
      messengerOrgId,
      destinationOfficeId,
      'ASN_PROACTIVE_ALERT',
      dropoffDispatchPayload,
    )
  } catch (hookErr) {
    console.warn('[Dropoff] Office review notification failed:', hookErr)
  }

  try {
    await emitArrivedEmail({
      orgId: messengerOrgId,
      documentId: targetDoc.id,
      title: targetDoc.title,
      trackingCode: (targetDoc as any).qr_code_data ?? null,
      creatorUserId: targetDoc.user_id ? String(targetDoc.user_id) : null,
      creatorRole: (targetDoc as any).creator_role ?? null,
      status: 'ARRIVED_AT_OFFICE',
      currentStep: targetDoc.current_step ?? 0,
      currentOfficeName: destinationOfficeName,
    })
  } catch (emailErr) {
    console.warn('[Dropoff] Non-fatal: arrival email failed:', emailErr)
  }

  return {
    success:        true,
    is_final_stop:  isFinalStop,
    message:        isFinalStop
      ? `Delivered to ${arrivalLocationLabel}. Waiting for office staff to confirm receipt and complete delivery.`
      : `Delivered to ${arrivalLocationLabel}. Received by office — waiting to be checked before the next pickup.`,
    data: {
      document: updatedDoc,
      office:   { id: office.id, name: office.name, code: office.code },
      desk:     deliveryDesk ? { id: deliveryDesk.id, name: deliveryDesk.name, code: deliveryDesk.code } : null,
      handler:  deliveryDesk?.assigned_user_id ? { id: deliveryDesk.assigned_user_id, name: deskHandlerName } : null,
      step:     targetDoc.current_step,
      total_steps: totalSteps,
    },
  }
})
