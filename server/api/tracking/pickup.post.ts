import { serverSupabaseClient } from '#supabase/server'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { notifyClientStatusUpdate } from '~~/server/utils/notifications'

/**
 * POST /api/tracking/pickup
 *
 * Handshake Part 1 – Messenger scans the QR code on a physical document.
 *
 * Flow:
 *   PICKED_UP (after accept)  →  IN_TRANSIT
 *   CREATED / ARRIVED_AT_OFFICE (legacy)  →  PICKED_UP  →  IN_TRANSIT
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body   = await readBody(event)

  const { qr_code_data, document_id } = body

  let qrLookup = qr_code_data?.trim() ?? ''

  if (!qrLookup && document_id) {
    const { data: idDoc } = await client
      .from('documents')
      .select('qr_code_data')
      .eq('id', document_id)
      .maybeSingle()
    qrLookup = idDoc?.qr_code_data?.trim() ?? ''
  }

  if (!qrLookup) {
    throw createError({ statusCode: 400, message: 'qr_code_data or document_id is required' })
  }

  const actorId   = getCookie(event, 'user_session')
  const actorRole = getCookie(event, 'user_role')

  if (!actorId) throw createError({ statusCode: 401, message: 'Authentication required' })
  if (!['messenger', 'client'].includes(actorRole)) {
    throw createError({ statusCode: 403, message: 'Forbidden: only messenger or client accounts can perform document pickups' })
  }

  const { data: actorRow, error: actorErr } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (actorErr || !actorRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Messenger account has no organisation assigned' })
  }

  const messengerOrgId = String(actorRow.org_id)

  const { data: doc, error: docErr } = await client
    .from('documents')
    .select('id, org_id, user_id, title, tracking_status, current_step, stage_id, assigned_messenger_id, origin_office_id, checkpoint_cleared_step')
    .eq('qr_code_data', qrLookup)
    .maybeSingle()

  if (docErr) throw createError({ statusCode: 500, message: docErr.message })

  if (!doc) {
    throw createError({
      statusCode: 404,
      message: 'No document found for this QR code. Ensure you are scanning a valid FlowVision document.',
    })
  }

  if (String(doc.org_id) !== messengerOrgId) {
    throw createError({
      statusCode: 403,
      message: 'SECURITY_ORG_MISMATCH: This document belongs to a different organisation. Scanning is not permitted.',
      data: { code: 'SECURITY_ORG_MISMATCH' },
    })
  }

  if (doc.assigned_messenger_id && doc.assigned_messenger_id !== actorId) {
    throw createError({
      statusCode: 403,
      message: 'This package is assigned to another messenger. Only the assigned messenger may scan this document.',
    })
  }

  const isPostClaim = doc.tracking_status === 'PICKED_UP'
  const allowedFromStates = ['CREATED', 'ARRIVED_AT_OFFICE', 'PICKED_UP']

  if (!allowedFromStates.includes(doc.tracking_status)) {
    throw createError({
      statusCode: 422,
      message: `Cannot pick up a document in "${doc.tracking_status}" status. Document must be CREATED, ARRIVED_AT_OFFICE, or PICKED_UP.`,
    })
  }

  if (
    doc.tracking_status === 'ARRIVED_AT_OFFICE' &&
    (doc.checkpoint_cleared_step ?? null) !== (doc.current_step ?? 0)
  ) {
    throw createError({
      statusCode: 422,
      message: 'This document is awaiting office desk review. An employee must mark the checkpoint done before messenger pickup.',
    })
  }

  const nextStep = doc.current_step + 1
  let officeId:   number | null = null
  let officeName: string | null = null

  if (doc.stage_id) {
    const { data: stepRow } = await client
      .from('stage_steps')
      .select('office_id, offices(name)')
      .eq('stage_id', doc.stage_id)
      .eq('step_number', nextStep)
      .maybeSingle()

    if (stepRow) {
      officeId   = stepRow.office_id
      officeName = (stepRow as { offices?: { name?: string } }).offices?.name ?? null
    }
  }

  const now = new Date().toISOString()

  if (!isPostClaim) {
    await client.from('document_tracking_events').insert({
      document_id:  doc.id,
      org_id:       messengerOrgId,
      status:       'PICKED_UP',
      step_index:   doc.current_step,
      actor_id:     actorId,
      actor_role:   'messenger',
      actor_name:   actorRow.full_name,
      notes:        `Document physically acquired by ${actorRow.full_name}.`,
      created_at:   now,
    })
  }

  await client.from('document_tracking_events').insert({
    document_id:  doc.id,
    org_id:       messengerOrgId,
    status:       'IN_TRANSIT',
    step_index:   nextStep,
    office_id:    officeId,
    office_name:  officeName,
    actor_id:     actorId,
    actor_role:   'messenger',
    actor_name:   actorRow.full_name,
    notes:        officeName
      ? `In transit to ${officeName} (Step ${nextStep}).`
      : `In transit toward Step ${nextStep}.`,
  })

  const { data: updatedDoc, error: updateErr } = await client
    .from('documents')
    .update({
      tracking_status:       'IN_TRANSIT',
      current_step:          nextStep,
      assigned_messenger_id: actorId,
      current_office_id:     null,
    })
    .eq('id', doc.id)
    .select('id, title, tracking_status, current_step, assigned_messenger_id, current_office_id')
    .single()

  if (updateErr) throw createError({ statusCode: 500, message: updateErr.message })

  const scanMessage = `${actorRow.full_name} scanned QR for "${doc.title}" and moved it to IN_TRANSIT`

  await logActivitySafe({
    orgId: messengerOrgId,
    officeId: doc.origin_office_id ?? null,
    userId: actorId,
    userName: actorRow.full_name,
    actorName: actorRow.full_name,
    actionType: 'scan',
    details: scanMessage,
    message: scanMessage,
    documentId: doc.id,
    metadata: { tracking_status: 'IN_TRANSIT', step: nextStep },
  }, client)

  await notifyClientStatusUpdate({
    orgId: messengerOrgId,
    documentId: doc.id,
    documentTitle: doc.title,
    trackingStatus: 'IN_TRANSIT',
    clientUserId: doc.user_id ? String(doc.user_id) : null,
  })

  return {
    success: true,
    message: `Document "${doc.title}" is now IN TRANSIT${officeName ? ` toward ${officeName}` : ''}.`,
    data: {
      document:    updatedDoc,
      destination: { office_id: officeId, office_name: officeName, step: nextStep },
      messenger:   { id: actorId, name: actorRow.full_name },
    },
  }
})
