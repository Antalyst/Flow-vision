import { serverSupabaseClient } from '#supabase/server'
import { logActivitySafe } from '~~/server/utils/activityLog'
import {
  broadcastInboundDispatchRealtime,
  broadcastInboundOfficeNotification,
  notifyClientStatusUpdate,
  notifyDocumentOwner,
} from '~~/server/utils/notifications'

/**
 * POST /api/tracking/checkpoint-pickup
 *
 * Messenger scans a client dispatch station QR (flowvision://track/checkpoint?office_id=…).
 * Picks up the next CREATED document awaiting collection at that origin checkpoint.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body = await readBody(event)
  const officeId = String(body?.office_id ?? '').trim()

  if (!officeId) {
    throw createError({ statusCode: 400, message: 'office_id is required.' })
  }

  const actorId = getCookie(event, 'user_session')
  const actorRole = getCookie(event, 'user_role')

  if (!actorId) throw createError({ statusCode: 401, message: 'Authentication required.' })
  if (!['messenger', 'client', 'employee'].includes(actorRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only messenger, client, or employee accounts can perform checkpoint pickups',
    })
  }

  const { data: actorRow, error: actorErr } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (actorErr || !actorRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Messenger account has no organisation assigned.' })
  }

  const messengerOrgId = String(actorRow.org_id)

  const { data: office, error: officeErr } = await client
    .from('offices')
    .select('id, name, code, org_id, is_client_station')
    .eq('id', officeId)
    .maybeSingle()

  if (officeErr) throw createError({ statusCode: 500, message: officeErr.message })
  if (!office) {
    throw createError({ statusCode: 404, message: 'Checkpoint station not found.' })
  }

  if (String(office.org_id) !== messengerOrgId) {
    throw createError({
      statusCode: 403,
      message: 'SECURITY_ORG_MISMATCH: This checkpoint belongs to a different organisation.',
      data: { code: 'SECURITY_ORG_MISMATCH' },
    })
  }

  const isClientStation = Boolean((office as { is_client_station?: boolean }).is_client_station)

  let docQuery = client
    .from('documents')
    .select('id, org_id, user_id, title, tracking_status, current_step, stage_id, assigned_messenger_id, origin_office_id, office_id')
    .eq('org_id', messengerOrgId)
    .eq('tracking_status', 'CREATED')
    .order('created_at', { ascending: true })
    .limit(1)

  if (isClientStation) {
    docQuery = docQuery.or(`origin_office_id.eq.${officeId},origin_office_id.is.null`)
  } else {
    docQuery = docQuery.eq('origin_office_id', officeId)
  }

  const { data: docs, error: docErr } = await docQuery

  if (docErr) throw createError({ statusCode: 500, message: docErr.message })

  const doc = (docs ?? [])[0]

  if (!doc) {
    const checkInMessage =
      `${actorRow.full_name} scanned origin checkpoint "${office.name}" — no documents awaiting pickup.`

    await logActivitySafe({
      orgId: messengerOrgId,
      officeId,
      userId: actorId,
      userName: actorRow.full_name,
      actorName: actorRow.full_name,
      actionType: 'checkpoint_scan',
      details: checkInMessage,
      message: checkInMessage,
      metadata: {
        office_name: office.name,
        checkpoint_type: isClientStation ? 'client_station' : 'office',
        documents_picked_up: 0,
      },
    }, client)

    return {
      success: true,
      message: `Checked in at ${office.name}. No documents are waiting for pickup at this station.`,
      data: {
        office: { id: office.id, name: office.name, code: office.code },
        document: null,
        checkpoint_only: true,
      },
    }
  }

  if (doc.assigned_messenger_id && doc.assigned_messenger_id !== actorId) {
    throw createError({
      statusCode: 403,
      message: 'The next document at this station is assigned to another messenger.',
    })
  }

  const nextStep = (doc.current_step ?? 0) + 1
  let destOfficeId: string | null = null
  let destOfficeName: string | null = null

  if (doc.stage_id) {
    const { data: stepRow } = await client
      .from('stage_steps')
      .select('office_id, offices(name)')
      .eq('stage_id', doc.stage_id)
      .eq('step_number', nextStep)
      .maybeSingle()

    if (stepRow?.office_id) {
      destOfficeId = String(stepRow.office_id)
      destOfficeName = (stepRow as { offices?: { name?: string } } | null)?.offices?.name ?? null
    }
  }

  if (!destOfficeId && doc.office_id && String(doc.office_id) !== String(officeId)) {
    destOfficeId = String(doc.office_id)
    const { data: offRow } = await client.from('offices').select('name').eq('id', destOfficeId).maybeSingle()
    if (offRow?.name) destOfficeName = offRow.name
  }

  const pickupNote =
    `Picked up from source / origin at "${office.name}"` +
    `${office.code ? ` (${office.code})` : ''} by ${actorRow.full_name}.`

  await client.from('document_tracking_events').insert({
    document_id: doc.id,
    org_id: messengerOrgId,
    status: 'PICKED_UP',
    step_index: doc.current_step ?? 0,
    office_id: officeId,
    office_name: office.name,
    actor_id: actorId,
    actor_role: 'messenger',
    actor_name: actorRow.full_name,
    notes: pickupNote,
  })

  await client.from('document_tracking_events').insert({
    document_id: doc.id,
    org_id: messengerOrgId,
    status: 'IN_TRANSIT',
    step_index: nextStep,
    office_id: destOfficeId,
    office_name: destOfficeName,
    actor_id: actorId,
    actor_role: 'messenger',
    actor_name: actorRow.full_name,
    notes: destOfficeName
      ? `In transit to ${destOfficeName} (Step ${nextStep}).`
      : `In transit toward Step ${nextStep}.`,
  })

  const { data: updatedDoc, error: updateErr } = await client
    .from('documents')
    .update({
      tracking_status: 'IN_TRANSIT',
      current_step: nextStep,
      assigned_messenger_id: actorId,
      current_office_id: null,
      origin_office_id: doc.origin_office_id ?? officeId,
    })
    .eq('id', doc.id)
    .select('id, title, tracking_status, current_step, assigned_messenger_id')
    .single()

  if (updateErr) throw createError({ statusCode: 500, message: updateErr.message })

  const activityMessage =
    `${actorRow.full_name} picked up "${doc.title}" from origin checkpoint "${office.name}".`

  await logActivitySafe({
    orgId: messengerOrgId,
    officeId,
    userId: actorId,
    userName: actorRow.full_name,
    actorName: actorRow.full_name,
    actionType: 'pickup',
    details: activityMessage,
    message: activityMessage,
    documentId: doc.id,
    metadata: {
      tracking_status: 'IN_TRANSIT',
      checkpoint_office_id: officeId,
      origin_pickup: true,
    },
  }, client)

  // Claim any open messenger pool pickup notifications for this document
  await client
    .from('notifications')
    .update({
      is_claimed: true,
      claimed_by_user_id: actorId,
      is_read: true,
    })
    .eq('document_id', doc.id)
    .eq('org_id', messengerOrgId)
    .eq('target_role', 'messenger')
    .eq('is_claimed', false)

  // 1. Notify Origin Station / Office (Departure Notice)
  if (officeId) {
    await broadcastInboundOfficeNotification({
      orgId: messengerOrgId,
      documentId: doc.id,
      documentTitle: doc.title,
      messengerName: actorRow.full_name,
      officeId,
      officeName: office.name,
      title: 'Document Departed Office',
      message: `${actorRow.full_name} has picked up "${doc.title}" from ${office.name}.`,
    })

    await broadcastInboundDispatchRealtime(
      messengerOrgId,
      officeId,
      'OUTGOING_DISPATCH',
      {
        type: 'OUTGOING_DISPATCH',
        event: 'OUTGOING_DISPATCH',
        document_id: doc.id,
        document_title: doc.title,
        batch_manifest_id: null,
        origin_office_id: officeId,
        origin_office_name: office.name,
        target_office_id: destOfficeId,
        target_office_name: destOfficeName,
        assigned_messenger_id: actorId,
        messenger_name: actorRow.full_name,
        tracking_status: 'IN_TRANSIT',
        dispatched_at: new Date().toISOString(),
        notes: `${actorRow.full_name} picked up "${doc.title}" from ${office.name}.`,
      },
    )
  }

  // 2. Notify destination office (Inbound ASN)
  if (destOfficeId) {
    await broadcastInboundOfficeNotification({
      orgId: messengerOrgId,
      documentId: doc.id,
      documentTitle: doc.title,
      messengerName: actorRow.full_name,
      officeId: destOfficeId,
      officeName: destOfficeName,
      type: 'ASN_EN_ROUTE',
      title: 'Inbound Document En Route',
      message: `${actorRow.full_name} has picked up "${doc.title}" and is currently in transit to ${destOfficeName || 'your station'}.`,
    })
  }

  // 3. Notify client / document owner
  if (doc.user_id) {
    const originLabel = office.name ? office.name : 'Office'
    await notifyDocumentOwner({
      orgId: messengerOrgId,
      documentId: doc.id,
      documentTitle: doc.title,
      userId: String(doc.user_id),
      title: `Document Departed ${originLabel}`,
      message: `${actorRow.full_name} picked up "${doc.title}" from ${office.name || 'origin station'} and it is now in transit${destOfficeName ? ` toward ${destOfficeName}` : ''}.`,
      trackingStatus: 'IN_TRANSIT',
      originOfficeId: officeId,
      originOfficeName: office.name,
      targetOfficeId: destOfficeId,
      targetOfficeName: destOfficeName,
    })
  }

  await notifyClientStatusUpdate({
    orgId: messengerOrgId,
    documentId: doc.id,
    documentTitle: doc.title,
    trackingStatus: 'IN_TRANSIT',
    clientUserId: doc.user_id ? String(doc.user_id) : null,
  })

  // 4. Broadcast Realtime dispatch alerts to Destination Office
  const nowIso = new Date().toISOString()
  const dispatchPayload = {
    type: 'INCOMING_DISPATCH',
    event: 'INCOMING_DISPATCH',
    document_id: doc.id,
    document_title: doc.title,
    batch_manifest_id: null,
    origin_office_id: officeId,
    origin_office_name: office.name,
    target_office_id: destOfficeId,
    target_office_name: destOfficeName,
    next_step: nextStep,
    assigned_messenger_id: actorId,
    messenger_name: actorRow.full_name,
    tracking_status: 'IN_TRANSIT',
    dispatched_at: nowIso,
    notes: destOfficeName
      ? `In transit to ${destOfficeName} (Step ${nextStep}).`
      : `In transit toward Step ${nextStep}.`,
  }

  await broadcastInboundDispatchRealtime(
    messengerOrgId,
    destOfficeId,
    'INCOMING_DISPATCH',
    dispatchPayload,
  )
  await broadcastInboundDispatchRealtime(
    messengerOrgId,
    destOfficeId,
    'ASN_PROACTIVE_ALERT',
    dispatchPayload,
  )

  return {
    success: true,
    message: `Picked up "${doc.title}" from ${office.name}. Now IN TRANSIT.`,
    data: {
      office: { id: office.id, name: office.name, code: office.code },
      document: updatedDoc,
      destination: destOfficeName
        ? { office_id: destOfficeId, office_name: destOfficeName, step: nextStep }
        : { office_id: destOfficeId, step: nextStep },
      messenger: { id: actorId, name: actorRow.full_name },
      dispatch_alert: dispatchPayload,
    },
  }
})
