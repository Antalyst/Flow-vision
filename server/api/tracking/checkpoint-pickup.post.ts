import { serverSupabaseClient } from '#supabase/server'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { notifyClientStatusUpdate } from '~~/server/utils/notifications'

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
  if (!['messenger', 'client'].includes(actorRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only messenger or client accounts can perform checkpoint pickups',
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
    .select('id, org_id, user_id, title, tracking_status, current_step, stage_id, assigned_messenger_id, origin_office_id')
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
  let destOfficeName: string | null = null

  if (doc.stage_id) {
    const { data: stepRow } = await client
      .from('stage_steps')
      .select('office_id, offices(name)')
      .eq('stage_id', doc.stage_id)
      .eq('step_number', nextStep)
      .maybeSingle()

    destOfficeName = (stepRow as { offices?: { name?: string } } | null)?.offices?.name ?? null
  }

  const pickupNote =
    `Picked up from source / origin at "${office.name}"` +
    `${office.code ? ` (${office.code})` : ''} by ${actorRow.full_name}.`

  await client.from('document_tracking_events').insert({
    document_id: doc.id,
    org_id: messengerOrgId,
    status: 'PICKED_UP',
    step_index: doc.current_step ?? 0,
    office_id: null,
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
    office_id: null,
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

  await notifyClientStatusUpdate({
    orgId: messengerOrgId,
    documentId: doc.id,
    documentTitle: doc.title,
    trackingStatus: 'IN_TRANSIT',
    clientUserId: doc.user_id ? String(doc.user_id) : null,
  })

  return {
    success: true,
    message: `Picked up "${doc.title}" from ${office.name}. Now IN TRANSIT.`,
    data: {
      office: { id: office.id, name: office.name, code: office.code },
      document: updatedDoc,
      destination: destOfficeName
        ? { office_name: destOfficeName, step: nextStep }
        : { step: nextStep },
      messenger: { id: actorId, name: actorRow.full_name },
    },
  }
})
