import { serverSupabaseClient } from '#supabase/server'
import { logActivitySafe } from '~~/server/utils/activityLog'
import {
  broadcastInboundOfficeNotification,
  broadcastInboundDispatchRealtime,
  notifyClientStatusUpdate,
} from '~~/server/utils/notifications'
import { getRouteContext, isDocumentAtFinalRouteStop, resolveOfficeName, resolveRouteOfficeAtStep } from '~~/server/utils/routeCompletion'
import { emitCompletedEmail, emitVerifiedEmail } from '~~/server/utils/email/emailEvents'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

/**
 * POST /api/documents/complete-checkpoint
 *
 * Employee verifies a document at the current office desk after messenger drop-off.
 *
 * Intermediate stop:
 *   - Marks checkpoint cleared for current_step
 *   - Notifies document owner (client)
 *   - Sends an informational inbound alert to the NEXT office (not a courier
 *     assignment) — that office must then explicitly assign a Liaison via
 *     POST /api/tracking/assign-liaison before the document can move again.
 *
 * Final stop:
 *   - Sets tracking_status → COMPLETED and status → Approved
 *   - Notifies document owner
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body = await readBody(event)
  const { document_id } = body

  if (!document_id) {
    throw createError({ statusCode: 400, message: 'Please select a document.' })
  }

  const actorId = getCookie(event, 'user_session')
  const actorRole = getCookie(event, 'user_role')

  if (!actorId || !actorRole) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  if (actorRole !== 'employee' && actorRole !== 'employee_sub_user') {
    throw createError({ statusCode: 403, message: 'You do not have permission to confirm receipt of documents.' })
  }

  const { data: actorRow } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (!actorRow?.org_id) {
    throw createError({ statusCode: 403, message: 'We could not find your office account. Please contact your administrator.' })
  }

  const orgId = String(actorRow.org_id)

  const { data: doc, error: docErr } = await client
    .from('documents')
    .select(
      'id, org_id, user_id, title, status, tracking_status, current_step, stage_id, ' +
      'current_office_id, office_id, checkpoint_cleared_step, assigned_messenger_id, creator_role, qr_code_data',
    )
    .eq('id', document_id)
    .single()

  if (docErr || !doc) {
    throw createError({ statusCode: 404, message: 'We could not find this document.' })
  }

  if (String(doc.org_id) !== orgId) {
    throw createError({ statusCode: 403, message: 'You do not have permission to confirm this document.' })
  }

  if (doc.tracking_status === 'COMPLETED') {
    return {
      success: true,
      message: 'Document is already completed.',
      data: { document: doc, is_final: true },
    }
  }

  if (doc.tracking_status !== 'ARRIVED_AT_OFFICE') {
    throw createError({
      statusCode: 422,
      message: 'This document has not been received by an office yet.',
    })
  }

  const currentStep = doc.current_step ?? 0
  if ((doc.checkpoint_cleared_step ?? null) === currentStep) {
    throw createError({
      statusCode: 422,
      message: 'Receipt of this document has already been confirmed. Messengers have been notified for pickup.',
    })
  }

  const officeId = doc.current_office_id ?? doc.office_id ?? null

  // Only the office physically holding the document may review / complete it —
  // otherwise e.g. the creator's office could "Approve & Complete" a document
  // sitting at a different (final) office.
  const actor = await resolveActorContextWithOffices(event, client)
  if (!officeId || !actor.officeIds.includes(String(officeId))) {
    throw createError({
      statusCode: 403,
      message: 'Only the office currently holding this document can confirm or complete it.',
      data: { code: 'OFFICE_SCOPE_MISMATCH' },
    })
  }

  const officeName = await resolveOfficeName(client, officeId ? String(officeId) : null)
  const route = await getRouteContext(client, doc.stage_id)
  const atFinalStop = await isDocumentAtFinalRouteStop(client, doc)

  if (atFinalStop) {
    await client.from('document_tracking_events').insert({
      document_id: doc.id,
      org_id: orgId,
      status: 'COMPLETED',
      step_index: currentStep,
      office_id: null,
      office_name: officeName,
      actor_id: actorId,
      actor_role: 'employee',
      actor_name: actorRow.full_name,
      notes: `Final checkpoint approved by ${actorRow.full_name} at ${officeName ?? 'destination office'}.`,
    })

    const { data: updatedDoc, error: updateErr } = await client
      .from('documents')
      .update({
        tracking_status: 'COMPLETED',
        status: 'Approved',
        checkpoint_cleared_step: currentStep,
        assigned_messenger_id: null,
        current_office_id: null,
      })
      .eq('id', doc.id)
      .select('id, title, status, tracking_status, current_step, checkpoint_cleared_step')
      .single()

    if (updateErr) throw createError({ statusCode: 500, message: 'We could not confirm receipt of this document. Please try again.' })

    const completionMessage =
      `${actorRow.full_name} approved and completed "${doc.title}" at the final office checkpoint.`

    await logActivitySafe({
      orgId,
      officeId: officeId ? String(officeId) : null,
      userId: actorId,
      userName: actorRow.full_name,
      actorName: actorRow.full_name,
      actionType: 'system',
      details: completionMessage,
      message: completionMessage,
      documentId: doc.id,
      metadata: { tracking_status: 'COMPLETED', final_step: route.maxStepNumber },
    }, client)

    await notifyClientStatusUpdate({
      orgId,
      documentId: doc.id,
      documentTitle: doc.title,
      trackingStatus: 'COMPLETED',
      clientUserId: doc.user_id ? String(doc.user_id) : null,
      message: `Your document "${doc.title}" has been verified and completed at ${officeName ?? 'its final destination'}.`,
    })

    try {
      await emitCompletedEmail({
        orgId,
        documentId: doc.id,
        title: doc.title,
        trackingCode: (doc as any).qr_code_data ?? null,
        creatorUserId: doc.user_id ? String(doc.user_id) : null,
        creatorRole: (doc as any).creator_role ?? null,
        status: 'COMPLETED',
        currentStep,
        currentOfficeName: officeName,
      })
    } catch (emailErr) {
      console.warn('[complete-checkpoint] Non-fatal: completion email failed:', emailErr)
    }

    return {
      success: true,
      is_final: true,
      message: `Document "${doc.title}" marked Completed and Approved.`,
      data: { document: updatedDoc },
    }
  }

  await client.from('document_tracking_events').insert({
    document_id: doc.id,
    org_id: orgId,
    status: 'ARRIVED_AT_OFFICE',
    step_index: currentStep,
    office_id: null,
    office_name: officeName,
    actor_id: actorId,
    actor_role: 'employee',
    actor_name: actorRow.full_name,
    notes: `Office review completed by ${actorRow.full_name} at ${officeName ?? 'checkpoint desk'}. Released for next messenger pickup.`,
  })

  const { data: updatedDoc, error: updateErr } = await client
    .from('documents')
    .update({
      checkpoint_cleared_step: currentStep,
      assigned_messenger_id: null,
    })
    .eq('id', doc.id)
    .select('id, title, status, tracking_status, current_step, checkpoint_cleared_step, current_office_id')
    .single()

  if (updateErr) throw createError({ statusCode: 500, message: 'We could not confirm receipt of this document. Please try again.' })

  const reviewMessage =
    `${actorRow.full_name} verified "${doc.title}" at ${officeName ?? 'the office desk'} and released it for the next pickup leg.`

  await logActivitySafe({
    orgId,
    officeId: officeId ? String(officeId) : null,
    userId: actorId,
    userName: actorRow.full_name,
    actorName: actorRow.full_name,
    actionType: 'system',
    details: reviewMessage,
    message: reviewMessage,
    documentId: doc.id,
    metadata: { checkpoint_cleared_step: currentStep, office_name: officeName },
  }, client)

  await notifyClientStatusUpdate({
    orgId,
    documentId: doc.id,
    documentTitle: doc.title,
    trackingStatus: 'ARRIVED_AT_OFFICE',
    clientUserId: doc.user_id ? String(doc.user_id) : null,
    message:
      `Your document "${doc.title}" was reviewed and cleared at ${officeName ?? 'the current office'}. ` +
      'The next office will assign a messenger shortly.',
  })

  try {
    await emitVerifiedEmail({
      orgId,
      documentId: doc.id,
      title: doc.title,
      trackingCode: (doc as any).qr_code_data ?? null,
      creatorUserId: doc.user_id ? String(doc.user_id) : null,
      creatorRole: (doc as any).creator_role ?? null,
      status: 'ARRIVED_AT_OFFICE',
      currentStep,
      currentOfficeName: officeName,
    })
  } catch (emailErr) {
    console.warn('[complete-checkpoint] Non-fatal: verified email failed:', emailErr)
  }

  // NOTE: no automatic courier assignment here (old pool broadcast removed).
  // The NEXT office must explicitly assign a Liaison via
  // POST /api/tracking/assign-liaison before this document can move again.

  // Office-assigned Liaison model: it's the CURRENT office (the one that just cleared
  // the checkpoint — still holding the document) that must act next by assigning a
  // Liaison for the next leg, NOT the destination office (which has nothing to do
  // until a Liaison actually arrives). Alert the current office's desk accordingly.
  try {
    if (officeId) {
      const nextStep = currentStep + 1
      const destination = await resolveRouteOfficeAtStep(client, doc.stage_id, nextStep)
      const destinationLabel = destination.officeName ?? 'the next office'

      await broadcastInboundOfficeNotification({
        orgId,
        documentId: doc.id,
        documentTitle: doc.title,
        officeId: String(officeId),
        officeName,
        type: 'ASSIGN_LIAISON_REQUIRED',
        title: 'Ready to Assign a Messenger',
        message: `"${doc.title}" is ready — assign a messenger to deliver it to ${destinationLabel}.`,
        metadata: {
          type: 'ASSIGN_LIAISON_REQUIRED',
          current_office_id: String(officeId),
          current_office_name: officeName,
          destination_office_id: destination.officeId,
          destination_office_name: destination.officeName,
          target_step: nextStep,
        },
      })

      await broadcastInboundDispatchRealtime(
        orgId,
        String(officeId),
        'ASSIGN_LIAISON_REQUIRED',
        {
          type: 'ASSIGN_LIAISON_REQUIRED',
          event: 'ASSIGN_LIAISON_REQUIRED',
          document_id: doc.id,
          document_title: doc.title,
          current_office_id: String(officeId),
          current_office_name: officeName,
          destination_office_id: destination.officeId,
          destination_office_name: destination.officeName,
          step: nextStep,
          tracking_status: 'ARRIVED_AT_OFFICE',
          dispatched_at: new Date().toISOString(),
          notes: `Document received at ${officeName ?? 'the current office'} — assign a messenger to deliver it to ${destinationLabel}.`,
        },
      )
    }
  } catch (asnErr) {
    console.warn('[complete-checkpoint] Assign-liaison alert failed (non-fatal):', asnErr)
  }

  return {
    success: true,
    is_final: false,
    message: `Receipt confirmed. Document owner notified — this office can now assign the next messenger.`,
    data: { document: updatedDoc },
  }
})
