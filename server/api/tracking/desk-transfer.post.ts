import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { isDeskHandler, validateDeskTransfer } from '~~/server/utils/deskAccess'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { notifyClientStatusUpdate } from '~~/server/utils/notifications'

/**
 * POST /api/tracking/desk-transfer
 *
 * Internal, same-office movement: the staff member currently handling a
 * document at their desk scans the QR code of the desk they're physically
 * handing it to. This is NOT a route leg — current_office_id, current_step
 * and tracking_status are untouched; only current_desk_id/current_handler_id
 * move. Cross-office movement is out of scope here by design (see
 * validateDeskTransfer) — that must go through assign-liaison/pickup/dropoff.
 *
 * Body:
 *   documentId            UUID    required
 *   destinationDeskQr      string  required — raw scanned QR (flowvision://desk?id=...)
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (!['employee', 'employee_sub_user', 'client'].includes(actor.userRole)) {
    throw createError({ statusCode: 403, message: 'You do not have permission to transfer documents between desks.' })
  }

  const body = await readBody(event)
  const documentId = String(body?.documentId ?? body?.document_id ?? '').trim()
  const destinationDeskQr = String(body?.destinationDeskQr ?? body?.destination_desk_qr ?? '').trim()

  if (!documentId) throw createError({ statusCode: 400, message: 'Please select a document.' })
  if (!destinationDeskQr) throw createError({ statusCode: 400, message: 'Please scan the destination desk QR code.' })

  const { data: doc, error: docErr } = await client
    .from('documents')
    .select('id, org_id, user_id, title, tracking_status, current_step, current_office_id, current_desk_id, current_handler_id, creator_role, qr_code_data')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) throw createError({ statusCode: 500, message: 'We could not load this document. Please try again.' })
  if (!doc) throw createError({ statusCode: 404, message: 'We could not find this document.' })

  if (String(doc.org_id) !== actor.orgId) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to transfer this document.',
      data: { code: 'SECURITY_ORG_MISMATCH' },
    })
  }

  if (doc.tracking_status === 'COMPLETED') {
    throw createError({ statusCode: 422, message: 'This document is already completed and can no longer be moved.' })
  }

  if (doc.tracking_status === 'DISCREPANCY_REPORTED') {
    throw createError({
      statusCode: 422,
      message: 'This document has an unresolved issue and cannot be moved.',
      data: { code: 'DISCREPANCY_BLOCK' },
    })
  }

  if (!doc.current_desk_id) {
    throw createError({
      statusCode: 422,
      message: 'This document is not currently at a desk.',
      data: { code: 'INVALID_DESK_TRANSFER' },
    })
  }

  // Only the desk's own assigned staff — the person actually holding the
  // document right now — may hand it off to another desk.
  if (String(doc.current_handler_id ?? '') !== String(actor.userId)) {
    throw createError({
      statusCode: 403,
      message: 'This document is currently assigned to another desk.',
      data: { code: 'WRONG_CURRENT_DESK' },
    })
  }

  const { fromDesk, toDesk } = await validateDeskTransfer(client, actor.orgId, String(doc.current_desk_id), destinationDeskQr)

  if (!isDeskHandler(actor.userId, fromDesk)) {
    // Defensive: current_handler_id and the desk's own assigned_user_id should
    // always agree, but never trust the document snapshot alone for the
    // authorization decision — re-check against the desk record itself.
    throw createError({
      statusCode: 403,
      message: 'This document is currently assigned to another desk.',
      data: { code: 'WRONG_CURRENT_DESK' },
    })
  }

  const { data: toHandlerRow } = await client
    .from('users')
    .select('full_name')
    .eq('user_id', toDesk.assigned_user_id as string)
    .maybeSingle()
  const toHandlerName = toHandlerRow?.full_name ?? null

  const { data: updatedDoc, error: updateErr } = await client
    .from('documents')
    .update({
      current_desk_id: toDesk.id,
      current_handler_id: toDesk.assigned_user_id,
    })
    .eq('id', doc.id)
    .select('id, title, tracking_status, current_step, current_office_id, current_desk_id, current_handler_id')
    .single()

  if (updateErr) {
    throw createError({ statusCode: 500, message: 'We could not transfer this document. Please try again.' })
  }

  const transferNotes = `${actor.fullName ?? 'Staff'} transferred "${doc.title}" from ${fromDesk.name} to ${toDesk.name}` +
    (toHandlerName ? ` (now with ${toHandlerName})` : '') + '.'

  await client.from('document_tracking_events').insert({
    document_id: doc.id,
    org_id: actor.orgId,
    status: 'ARRIVED_AT_OFFICE',
    step_index: doc.current_step ?? 0,
    office_id: null,
    office_name: null,
    actor_id: actor.userId,
    actor_role: actor.userRole,
    actor_name: actor.fullName,
    event_type: 'DESK_TRANSFER',
    desk_id: toDesk.id,
    handler_id: toDesk.assigned_user_id,
    metadata: {
      from_desk_id: fromDesk.id,
      from_desk_name: fromDesk.name,
      from_handler_id: actor.userId,
      from_handler_name: actor.fullName,
      to_desk_id: toDesk.id,
      to_desk_name: toDesk.name,
      to_handler_id: toDesk.assigned_user_id,
      to_handler_name: toHandlerName,
    },
    notes: transferNotes,
  })

  await logActivitySafe({
    orgId: actor.orgId,
    officeId: doc.current_office_id ?? null,
    userId: actor.userId,
    userName: actor.fullName,
    actorName: actor.fullName,
    actionType: 'system',
    details: transferNotes,
    message: transferNotes,
    documentId: doc.id,
    metadata: { from_desk_id: fromDesk.id, to_desk_id: toDesk.id },
  }, client)

  await notifyClientStatusUpdate({
    orgId: actor.orgId,
    documentId: doc.id,
    documentTitle: doc.title,
    trackingStatus: 'ARRIVED_AT_OFFICE',
    clientUserId: doc.user_id ? String(doc.user_id) : null,
    message: `Your document "${doc.title}" moved from ${fromDesk.name} to ${toDesk.name}` +
      (toHandlerName ? ` and is now handled by ${toHandlerName}.` : '.'),
  })

  return {
    success: true,
    message: `Transferred to ${toDesk.name}${toHandlerName ? ` (${toHandlerName})` : ''}.`,
    data: {
      document: updatedDoc,
      fromDesk: { id: fromDesk.id, name: fromDesk.name, code: fromDesk.code },
      toDesk: { id: toDesk.id, name: toDesk.name, code: toDesk.code },
      toHandler: toDesk.assigned_user_id ? { id: toDesk.assigned_user_id, name: toHandlerName } : null,
    },
  }
})
