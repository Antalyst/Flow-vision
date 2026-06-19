import { serverSupabaseClient } from '#supabase/server'
import { logActivitySafe } from '~~/server/utils/activityLog'
import {
  broadcastPickupNotification,
  notifyClientStatusUpdate,
} from '~~/server/utils/notifications'
import { getRouteContext, isDocumentAtFinalRouteStop, resolveOfficeName } from '~~/server/utils/routeCompletion'

/**
 * POST /api/documents/complete-checkpoint
 *
 * Employee verifies a document at the current office desk after messenger drop-off.
 *
 * Intermediate stop:
 *   - Marks checkpoint cleared for current_step
 *   - Notifies document owner (client)
 *   - Broadcasts messenger pickup for the next leg
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
    throw createError({ statusCode: 400, message: 'document_id is required' })
  }

  const actorId = getCookie(event, 'user_session')
  const actorRole = getCookie(event, 'user_role')

  if (!actorId || !actorRole) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  if (actorRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees may approve office checkpoint reviews' })
  }

  const { data: actorRow } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (!actorRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Employee account has no organisation assigned' })
  }

  const orgId = String(actorRow.org_id)

  const { data: doc, error: docErr } = await client
    .from('documents')
    .select(
      'id, org_id, user_id, title, status, tracking_status, current_step, stage_id, ' +
      'current_office_id, office_id, checkpoint_cleared_step, assigned_messenger_id',
    )
    .eq('id', document_id)
    .single()

  if (docErr || !doc) {
    throw createError({ statusCode: 404, message: 'Document not found' })
  }

  if (String(doc.org_id) !== orgId) {
    throw createError({ statusCode: 403, message: 'Forbidden: document belongs to a different organisation' })
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
      message: `Document must be checked in at an office before review (current: ${doc.tracking_status}).`,
    })
  }

  const currentStep = doc.current_step ?? 0
  if ((doc.checkpoint_cleared_step ?? null) === currentStep) {
    throw createError({
      statusCode: 422,
      message: 'This checkpoint has already been marked done. Messengers have been notified for pickup.',
    })
  }

  const officeId = doc.current_office_id ?? doc.office_id ?? null
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

    if (updateErr) throw createError({ statusCode: 500, message: updateErr.message })

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

  if (updateErr) throw createError({ statusCode: 500, message: updateErr.message })

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
      'A messenger will pick it up for the next route leg shortly.',
  })

  await broadcastPickupNotification(client, {
    orgId,
    documentId: doc.id,
    documentTitle: doc.title,
  })

  return {
    success: true,
    is_final: false,
    message: `Checkpoint marked done. Document owner and messenger pool have been notified.`,
    data: { document: updatedDoc },
  }
})
