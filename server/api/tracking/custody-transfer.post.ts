/**
 * POST /api/tracking/custody-transfer
 *
 * Hands a document to another staff member of the SAME office (no QR needed —
 * the actor is the signed-in user). Allowed for the current holder, or the
 * office head. Records previous holder, new holder, actor, time and notes.
 *
 * Body: { document_id: string, to_user_id: string, notes?: string }
 */
import { lifecycleDb } from '~~/server/utils/documentRoute'
import { getOfficeMembers, notifyUser, recordTrackingEvent, assertHistorySaved, type TrackingEventResult } from '~~/server/utils/documentAccess'
import { notifyDocumentCreator } from '~~/server/utils/notifications'
import { loadDocumentAtMyOffice } from '~~/server/utils/officeWorkflow'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ctx = await loadDocumentAtMyOffice(event, body?.document_id)
  const { actor, doc, officeId, officeName, step } = ctx
  // History entries this request writes; success is only reported once they're saved.
  const tracked: TrackingEventResult[] = []

  if (!ctx.isHolder && !ctx.isHead) {
    throw createError({
      statusCode: 403,
      message: 'Only the staff member holding this document, or the office head, can hand it over.',
      data: { code: 'NOT_CURRENT_HOLDER' },
    })
  }

  const toUserId = String(body?.to_user_id ?? '').trim()
  const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 500) : ''
  const members = await getOfficeMembers(actor.orgId, officeId)
  const target = members.find((m) => m.user_id === toUserId)
  if (!target) {
    throw createError({ statusCode: 422, message: 'You can only hand this document to an active member of this office.' })
  }

  const previousHolderId = doc.current_handler_id ? String(doc.current_handler_id) : null
  if (previousHolderId === target.user_id) {
    throw createError({ statusCode: 409, message: `${target.full_name ?? 'This person'} is already holding this document.` })
  }

  // Conditional on the holder we just read, so two simultaneous handoffs can't both win.
  let update = lifecycleDb()
    .from('documents')
    .update({ current_handler_id: target.user_id })
    .eq('id', doc.id)
    .eq('tracking_status', 'ARRIVED_AT_OFFICE')
    .eq('current_office_id', officeId)
  update = previousHolderId ? update.eq('current_handler_id', previousHolderId) : update.is('current_handler_id', null)
  const { data: updated, error } = await update.select('id')
  if (error) throw createError({ statusCode: 500, message: 'We could not hand over this document. Please try again.' })
  if (!updated || updated.length === 0) {
    throw createError({ statusCode: 409, message: 'This document changed hands a moment ago. Refresh and try again.' })
  }

  const previousName = members.find((m) => m.user_id === previousHolderId)?.full_name ?? null
  tracked.push(await recordTrackingEvent({
    document_id: doc.id,
    org_id: actor.orgId,
    status: 'ARRIVED_AT_OFFICE',
    step_index: step,
    office_name: officeName,
    actor_id: actor.userId,
    actor_role: actor.userRole,
    actor_name: actor.fullName,
    event_type: 'CUSTODY_TRANSFER',
    notes: `${actor.fullName ?? 'Staff'} handed "${doc.title}" to ${target.full_name ?? 'a colleague'} at ${officeName}.` +
      (notes ? ` Note: ${notes}` : ''),
    metadata: {
      office_id: officeId,
      from_holder_id: previousHolderId,
      from_holder_name: previousName,
      to_holder_id: target.user_id,
      to_holder_name: target.full_name,
      notes: notes || null,
    },
  }))
  assertHistorySaved(tracked, 'The hand-over')

  await notifyUser({
    orgId: actor.orgId,
    documentId: doc.id,
    documentTitle: doc.title,
    userId: target.user_id,
    title: 'Document Handed to You',
    message: `${actor.fullName ?? 'A colleague'} handed you "${doc.title}" at ${officeName}.`,
  })
  await notifyDocumentCreator({
    orgId: actor.orgId,
    documentId: doc.id,
    documentTitle: doc.title,
    userId: doc.user_id,
    creatorRole: doc.creator_role,
    officeId: doc.origin_office_id ?? doc.office_id ?? null,
    title: 'Document Holder Changed',
    message: `Your document "${doc.title}" is now held by ${target.full_name ?? 'another staff member'} at ${officeName}.`,
  })

  return {
    success: true,
    message: `Handed to ${target.full_name ?? 'your colleague'}.`,
    data: { holder: { id: target.user_id, name: target.full_name } },
  }
})
