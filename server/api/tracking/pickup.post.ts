import { serverSupabaseClient } from '#supabase/server'
import { logActivitySafe } from '~~/server/utils/activityLog'
import {
  broadcastInboundDispatchRealtime,
  broadcastInboundOfficeNotification,
  notifyClientStatusUpdate,
  notifyDocumentOwner,
} from '~~/server/utils/notifications'
import { emitInTransitEmails } from '~~/server/utils/email/emailEvents'
import { getDocumentRoute, lifecycleDb, routeStopAt } from '~~/server/utils/documentRoute'
import { recordTrackingEvent, assertHistorySaved, type TrackingEventResult } from '~~/server/utils/documentAccess'
import { resolveOpenIssueReturn } from '~~/server/utils/documentIssues'

/**
 * POST /api/tracking/pickup
 *
 * Handshake Part 1 – Courier scans physical document(s) or batch manifest for pickup.
 *
 * Supports:
 *   - Single document: { qr_code_data?: string, document_id?: string }
 *   - Batch manifest:  { document_ids: string[], manifest_id?: string }
 *
 * Flow:
 *   PICKED_UP (after accept)  →  IN_TRANSIT
 *   CREATED / ARRIVED_AT_OFFICE (legacy)  →  PICKED_UP  →  IN_TRANSIT
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body   = await readBody(event)

  const actorId   = sessionUserId(event)
  const actorRole = sessionRole(event)

  if (!actorId) throw createError({ statusCode: 401, message: 'Authentication required.' })
  // employee_sub_user included: assign-liaison.post.ts allows this role as an eligible
  // Liaison, so whoever is actually assigned must be able to perform the physical scan.
  // This is only the identity gate — the real authorization is the assigned_messenger_id
  // check further down, which is role-agnostic and remains unchanged.
  if (!['messenger', 'client', 'employee', 'employee_sub_user'].includes(actorRole ?? '')) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to pick up documents.',
    })
  }

  const { data: actorRow, error: actorErr } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (actorErr || !actorRow?.org_id) {
    throw createError({ statusCode: 403, message: 'We could not find your office account. Please contact your administrator.' })
  }

  const messengerOrgId = String(actorRow.org_id)
  const now = new Date().toISOString()
  const allowedFromStates = ['CREATED', 'ARRIVED_AT_OFFICE', 'PICKED_UP']

  // ──────────────────────────────────────────────────────────────────────────
  // BATCH MANIFEST FLOW: document_ids array provided
  // ──────────────────────────────────────────────────────────────────────────
  if (Array.isArray(body?.document_ids)) {
    const rawIds: string[] = body.document_ids
    const docIds = Array.from(new Set(rawIds.map((id) => String(id || '').trim()).filter(Boolean)))

    if (docIds.length === 0) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Unprocessable Entity',
        message: 'Please select at least one document to pick up.',
        data: { code: 'EMPTY_BATCH_IDS', field: 'document_ids' },
      })
    }

    const manifestId = body.manifest_id ? String(body.manifest_id).trim() : null

    // 1. Fetch all documents in batch
    const { data: docs, error: docErr } = await client
      .from('documents')
      .select('id, org_id, user_id, title, tracking_status, current_step, stage_id, assigned_messenger_id, origin_office_id, office_id, checkpoint_cleared_step, current_office_id, creator_role, qr_code_data')
      .in('id', docIds)

    if (docErr) throw createError({ statusCode: 500, message: 'We could not load these documents. Please try again.' })

    if (!docs || docs.length === 0) {
      throw createError({ statusCode: 404, message: 'We could not find these documents.' })
    }

    if (docs.length !== docIds.length) {
      const foundIds = new Set(docs.map((d) => d.id))
      const missing = docIds.filter((id) => !foundIds.has(id))
      throw createError({
        statusCode: 404,
        message: `We could not find ${missing.length === 1 ? 'one of the selected documents' : 'some of the selected documents'}.`,
      })
    }

    // 2. Validate Org isolation and pickup eligibility for each document
    for (const doc of docs) {
      if (String(doc.org_id) !== messengerOrgId) {
        throw createError({
          statusCode: 403,
          message: `You do not have permission to pick up "${doc.title || doc.id}".`,
          data: { code: 'SECURITY_ORG_MISMATCH', document_id: doc.id },
        })
      }

      if (!doc.assigned_messenger_id) {
        throw createError({
          statusCode: 403,
          message: `Please assign a messenger to "${doc.title || doc.id}" before picking it up.`,
          data: { code: 'LIAISON_ASSIGNMENT_REQUIRED', document_id: doc.id },
        })
      }

      if (doc.assigned_messenger_id !== actorId) {
        throw createError({
          statusCode: 403,
          message: `"${doc.title || doc.id}" is assigned to another messenger.`,
          data: { code: 'NOT_ASSIGNED_LIAISON', document_id: doc.id },
        })
      }

      if (doc.tracking_status === 'DISCREPANCY_REPORTED') {
        throw createError({
          statusCode: 422,
          statusMessage: 'Unprocessable Entity',
          message: `"${doc.title || doc.id}" has an open issue and cannot be picked up until it is resolved.`,
          data: { code: 'DISCREPANCY_REPORTED', document_id: doc.id, tracking_status: doc.tracking_status },
        })
      }

      if (!allowedFromStates.includes(doc.tracking_status)) {
        throw createError({
          statusCode: 422,
          statusMessage: 'Unprocessable Entity',
          message: `"${doc.title || doc.id}" cannot be picked up right now. Please check its current status.`,
          data: { code: 'INVALID_STATUS', document_id: doc.id, tracking_status: doc.tracking_status, allowed_statuses: allowedFromStates },
        })
      }

      if (
        doc.tracking_status === 'ARRIVED_AT_OFFICE' &&
        (doc.checkpoint_cleared_step ?? null) !== (doc.current_step ?? 0)
      ) {
        throw createError({
          statusCode: 422,
          statusMessage: 'Unprocessable Entity',
          message: `"${doc.title || doc.id}" is waiting for office staff to confirm receipt before it can be picked up again.`,
          data: { code: 'CHECKPOINT_NOT_CLEARED', document_id: doc.id, current_step: doc.current_step, checkpoint_cleared_step: doc.checkpoint_cleared_step },
        })
      }
    }

    // 3. Resolve next step destination office and origin office for each document
    interface DocDestination {
      doc: typeof docs[0]
      nextStep: number
      officeId: string | null
      officeName: string | null
      originOfficeId: string | null
      originOfficeName: string | null
    }

    const destinations: DocDestination[] = []

    for (const doc of docs) {
      const nextStep = (doc.current_step ?? 0) + 1
      let officeId:   string | null = null
      let officeName: string | null = null

      const route = await getDocumentRoute(doc)
      if (route.length > 0) {
        const nextStop = routeStopAt(route, nextStep)
        if (nextStop) {
          officeId   = nextStop.office_id
          officeName = nextStop.office_name
        } else {
          // The route has no stop for the next step — fail loudly instead of
          // guessing an office.
          throw createError({
            statusCode: 422,
            message: `"${doc.title}" has no next checkpoint configured on its route. Ask an office admin to fix this document's route before it can be picked up.`,
            data: { code: 'ROUTE_NOT_CONFIGURED' },
          })
        }
      }

      if (!officeId && (doc.office_id || doc.origin_office_id)) {
        officeId = String(doc.office_id || doc.origin_office_id)
        const { data: offRow } = await client.from('offices').select('name').eq('id', officeId).maybeSingle()
        if (offRow?.name) officeName = offRow.name
      }

      const originOfficeId = doc.current_office_id
        ? String(doc.current_office_id)
        : doc.origin_office_id
        ? String(doc.origin_office_id)
        : doc.office_id
        ? String(doc.office_id)
        : null

      let originOfficeName: string | null = null
      if (originOfficeId) {
        const { data: origOffRow } = await client
          .from('offices')
          .select('name')
          .eq('id', originOfficeId)
          .maybeSingle()
        if (origOffRow?.name) originOfficeName = origOffRow.name
      }

      destinations.push({ doc, nextStep, officeId, officeName, originOfficeId, originOfficeName })
    }

    // 4. Update documents in database
    const updatedDocs: any[] = []

    for (const item of destinations) {
      const isPostClaim = item.doc.tracking_status === 'PICKED_UP'

      if (!isPostClaim) {
        await client.from('document_tracking_events').insert({
          document_id:  item.doc.id,
          org_id:       messengerOrgId,
          status:       'PICKED_UP',
          step_index:   item.doc.current_step ?? 0,
          actor_id:     actorId,
          actor_role:   'messenger',
          actor_name:   actorRow.full_name,
          notes:        manifestId
            ? `Batch manifest ${manifestId}: Physical custody acquired by ${actorRow.full_name}.`
            : `Physical custody acquired by ${actorRow.full_name}.`,
          created_at:   now,
        })
      }

      await client.from('document_tracking_events').insert({
        document_id:  item.doc.id,
        org_id:       messengerOrgId,
        status:       'IN_TRANSIT',
        step_index:   item.nextStep,
        office_id:    item.officeId,
        office_name:  item.officeName,
        actor_id:     actorId,
        actor_role:   'messenger',
        actor_name:   actorRow.full_name,
        notes:        item.officeName
          ? `In transit to ${item.officeName} (Step ${item.nextStep})${manifestId ? ` [Manifest: ${manifestId}]` : ''}.`
          : `In transit toward Step ${item.nextStep}${manifestId ? ` [Manifest: ${manifestId}]` : ''}.`,
        created_at:   now,
      })

      const { data: updatedDoc, error: updateErr } = await client
        .from('documents')
        .update({
          tracking_status:       'IN_TRANSIT',
          current_step:          item.nextStep,
          assigned_messenger_id: actorId,
          current_office_id:     null,
        })
        .eq('id', item.doc.id)
        .select('id, title, tracking_status, current_step, assigned_messenger_id, current_office_id')
        .single()

      if (updateErr) throw createError({ statusCode: 500, message: updateErr.message })

      updatedDocs.push(updatedDoc)

      const scanMessage = `${actorRow.full_name} picked up batch item "${item.doc.title}" → IN_TRANSIT (Step ${item.nextStep})`
      await logActivitySafe({
        orgId: messengerOrgId,
        officeId: item.originOfficeId ?? null,
        userId: actorId,
        userName: actorRow.full_name,
        actorName: actorRow.full_name,
        actionType: 'pickup',
        details: scanMessage,
        message: scanMessage,
        documentId: item.doc.id,
        metadata: { manifest_id: manifestId, tracking_status: 'IN_TRANSIT', step: item.nextStep },
      }, client)

      // Claim any open messenger pool pickup notifications for this document
      await client
        .from('notifications')
        .update({
          is_claimed: true,
          claimed_by_user_id: actorId,
          is_read: true,
        })
        .eq('document_id', item.doc.id)
        .eq('org_id', messengerOrgId)
        .eq('target_role', 'messenger')
        .eq('is_claimed', false)

      // 1. Notify Origin/Current Office (Departure Notice)
      if (item.originOfficeId) {
        await broadcastInboundOfficeNotification({
          orgId: messengerOrgId,
          documentId: item.doc.id,
          documentTitle: item.doc.title,
          messengerName: actorRow.full_name,
          officeId: item.originOfficeId,
          officeName: item.originOfficeName,
          title: 'Document Departed Office',
          message: `${actorRow.full_name} has picked up "${item.doc.title}" from your office.`,
        })

        await broadcastInboundDispatchRealtime(
          messengerOrgId,
          item.originOfficeId,
          'OUTGOING_DISPATCH',
          {
            type: 'OUTGOING_DISPATCH',
            event: 'OUTGOING_DISPATCH',
            document_id: item.doc.id,
            document_title: item.doc.title,
            batch_manifest_id: manifestId,
            origin_office_id: item.originOfficeId,
            origin_office_name: item.originOfficeName,
            target_office_id: item.officeId,
            target_office_name: item.officeName,
            assigned_messenger_id: actorId,
            messenger_name: actorRow.full_name,
            tracking_status: 'IN_TRANSIT',
            dispatched_at: now,
            notes: `${actorRow.full_name} picked up "${item.doc.title}" from your office.`,
          },
        )
      }

      // 2. Notify Destination Office (Inbound ASN)
      if (item.officeId) {
        await broadcastInboundOfficeNotification({
          orgId: messengerOrgId,
          documentId: item.doc.id,
          documentTitle: item.doc.title,
          messengerName: actorRow.full_name,
          officeId: item.officeId,
          officeName: item.officeName,
          type: 'ASN_EN_ROUTE',
          title: 'Inbound Document En Route',
          message: `${actorRow.full_name} has picked up "${item.doc.title}" and is currently in transit to ${item.officeName || 'your station'}.`,
        })
      }

      // 3. Notify client / document owner
      if (item.doc.user_id) {
        const originLabel = item.originOfficeName ? item.originOfficeName : 'Office'
        await notifyDocumentOwner({
          orgId: messengerOrgId,
          documentId: item.doc.id,
          documentTitle: item.doc.title,
          userId: String(item.doc.user_id),
          title: `Document Departed ${originLabel}`,
          message: `${actorRow.full_name} picked up "${item.doc.title}" from ${item.originOfficeName || 'origin office'} and it is now in transit${item.officeName ? ` toward ${item.officeName}` : ''}.`,
          trackingStatus: 'IN_TRANSIT',
          originOfficeId: item.originOfficeId,
          originOfficeName: item.originOfficeName,
          targetOfficeId: item.officeId,
          targetOfficeName: item.officeName,
        })
      }

      await notifyClientStatusUpdate({
        orgId: messengerOrgId,
        documentId: item.doc.id,
        documentTitle: item.doc.title,
        trackingStatus: 'IN_TRANSIT',
        clientUserId: item.doc.user_id ? String(item.doc.user_id) : null,
      })

      // 4. Broadcast Advance Shipping Notice (ASN) / Inbound Dispatch Alert for this document to Destination Office
      const singleDispatchPayload = {
        type: 'INCOMING_DISPATCH',
        event: 'INCOMING_DISPATCH',
        document_id: item.doc.id,
        document_title: item.doc.title,
        batch_manifest_id: manifestId,
        origin_office_id: item.originOfficeId,
        origin_office_name: item.originOfficeName,
        target_office_id: item.officeId,
        target_office_name: item.officeName,
        next_step: item.nextStep,
        assigned_messenger_id: actorId,
        messenger_name: actorRow.full_name,
        tracking_status: 'IN_TRANSIT',
        dispatched_at: now,
        notes: item.officeName
          ? `In transit to ${item.officeName} (Step ${item.nextStep}).`
          : `In transit toward Step ${item.nextStep}.`,
      }

      await broadcastInboundDispatchRealtime(
        messengerOrgId,
        item.officeId,
        'INCOMING_DISPATCH',
        singleDispatchPayload,
      )
      await broadcastInboundDispatchRealtime(
        messengerOrgId,
        item.officeId,
        'ASN_PROACTIVE_ALERT',
        singleDispatchPayload,
      )

      try {
        await emitInTransitEmails({
          orgId: messengerOrgId,
          documentId: item.doc.id,
          title: item.doc.title,
          trackingCode: (item.doc as any).qr_code_data ?? null,
          creatorUserId: item.doc.user_id ? String(item.doc.user_id) : null,
          creatorRole: (item.doc as any).creator_role ?? null,
          status: 'IN_TRANSIT',
          currentStep: item.nextStep,
          originOfficeName: item.originOfficeName,
          destinationOfficeId: item.officeId,
          destinationOfficeName: item.officeName,
          liaisonName: actorRow.full_name,
        })
      } catch (emailErr) {
        console.warn('[Pickup:Batch] Non-fatal: in-transit/ASN email failed:', emailErr)
      }
    }

    return {
      success: true,
      batch: true,
      manifest_id: manifestId,
      count: updatedDocs.length,
      message: `${updatedDocs.length} document${updatedDocs.length === 1 ? '' : 's'} picked up and now on the way.`,
      data: {
        documents: updatedDocs,
        manifest_id: manifestId,
        messenger: { id: actorId, name: actorRow.full_name },
      },
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SINGLE DOCUMENT FLOW: qr_code_data or document_id provided
  // ──────────────────────────────────────────────────────────────────────────
  const { qr_code_data, document_id } = body || {}

  const rawQr = qr_code_data ? String(qr_code_data).trim() : ''
  const rawDocId = document_id ? String(document_id).trim() : ''

  if (!rawQr && !rawDocId) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: 'Please scan a document QR code to continue.',
      data: { code: 'MISSING_PAYLOAD_PROPERTY', required_fields: ['qr_code_data', 'document_id'] },
    })
  }

  let docQuery = client
    .from('documents')
    .select('id, org_id, user_id, title, tracking_status, current_step, stage_id, assigned_messenger_id, origin_office_id, office_id, checkpoint_cleared_step, current_office_id, creator_role, qr_code_data')

  if (rawQr) {
    docQuery = docQuery.eq('qr_code_data', rawQr)
  } else {
    docQuery = docQuery.eq('id', rawDocId)
  }

  const { data: doc, error: docErr } = await docQuery.maybeSingle()

  if (docErr) throw createError({ statusCode: 500, message: 'We could not load this document. Please try again.' })

  if (!doc) {
    throw createError({
      statusCode: 404,
      message: rawQr
        ? 'We could not find a document matching this QR code.'
        : 'We could not find this document.',
      data: { code: 'DOCUMENT_NOT_FOUND', query: rawQr || rawDocId },
    })
  }

  if (String(doc.org_id) !== messengerOrgId) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to pick up this document.',
      data: { code: 'SECURITY_ORG_MISMATCH' },
    })
  }

  if (!doc.assigned_messenger_id) {
    throw createError({
      statusCode: 403,
      message: 'Please assign a messenger before picking up this document.',
      data: { code: 'LIAISON_ASSIGNMENT_REQUIRED', document_id: doc.id },
    })
  }

  if (doc.assigned_messenger_id !== actorId) {
    throw createError({
      statusCode: 403,
      message: 'This document is assigned to another messenger.',
      data: { code: 'NOT_ASSIGNED_LIAISON', document_id: doc.id },
    })
  }

  // A flagged document only moves on its RETURN leg: back to the office the
  // open issue sends it to, carried by the liaison the holder assigned for it
  // (recorded in document_liaison_assignments with that office and its step).
  let returnLeg: { officeId: string; step: number } | null = null
  if (doc.tracking_status === 'DISCREPANCY_REPORTED') {
    const [{ data: leg }, open] = await Promise.all([
      lifecycleDb()
        .from('document_liaison_assignments')
        .select('to_office_id, step_number')
        .eq('document_id', doc.id)
        .eq('status', 'ACTIVE')
        .eq('liaison_id', actorId)
        .is('picked_up_at', null)
        .maybeSingle(),
      resolveOpenIssueReturn(client, doc.id),
    ])
    if (leg && open?.target && String(leg.to_office_id) === open.target.officeId && Number(leg.step_number) === open.target.newStep) {
      returnLeg = { officeId: open.target.officeId, step: open.target.newStep }
    } else {
      throw createError({
        statusCode: 422,
        statusMessage: 'Unprocessable Entity',
        message: `"${doc.title || doc.id}" has an open issue. It can only be picked up to be returned to the office the issue was sent to.`,
        data: { code: 'DISCREPANCY_REPORTED', document_id: doc.id, tracking_status: doc.tracking_status },
      })
    }
  }

  const isPostClaim = doc.tracking_status === 'PICKED_UP'
  // History entries this request writes; success is only reported once they're saved.
  const tracked: TrackingEventResult[] = []

  if (!returnLeg && !allowedFromStates.includes(doc.tracking_status)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: `"${doc.title || doc.id}" cannot be picked up right now. Please check its current status.`,
      data: { code: 'INVALID_STATUS', document_id: doc.id, tracking_status: doc.tracking_status, allowed_statuses: allowedFromStates },
    })
  }

  if (
    doc.tracking_status === 'ARRIVED_AT_OFFICE' &&
    (doc.checkpoint_cleared_step ?? null) !== (doc.current_step ?? 0)
  ) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: `"${doc.title || doc.id}" is waiting for office staff to confirm receipt before it can be picked up again.`,
      data: { code: 'CHECKPOINT_NOT_CLEARED', document_id: doc.id, current_step: doc.current_step, checkpoint_cleared_step: doc.checkpoint_cleared_step },
    })
  }

  const nextStep = returnLeg ? returnLeg.step : (doc.current_step ?? 0) + 1
  let officeId:   string | null = returnLeg?.officeId ?? null
  let officeName: string | null = null

  // The document's own route (snapshot), falling back to its stage for older documents.
  const route = await getDocumentRoute(doc)
  if (returnLeg) {
    const { data: offRow } = await client.from('offices').select('name').eq('id', returnLeg.officeId).maybeSingle()
    officeName = offRow?.name ?? null
  } else if (route.length > 0) {
    const nextStop = routeStopAt(route, nextStep)
    if (!nextStop) {
      throw createError({
        statusCode: 422,
        message: `"${doc.title}" has no next office on its route, so it can't be picked up.`,
        data: { code: 'ROUTE_NOT_CONFIGURED' },
      })
    }
    officeId = nextStop.office_id
    officeName = nextStop.office_name
  }

  if (!officeId && (doc.office_id || doc.origin_office_id)) {
    officeId = String(doc.office_id || doc.origin_office_id)
    const { data: offRow } = await client.from('offices').select('name').eq('id', officeId).maybeSingle()
    if (offRow?.name) officeName = offRow.name
  }

  const originOfficeId = doc.current_office_id
    ? String(doc.current_office_id)
    : doc.origin_office_id
    ? String(doc.origin_office_id)
    : doc.office_id
    ? String(doc.office_id)
    : null

  let originOfficeName: string | null = null
  if (originOfficeId) {
    const { data: origOffRow } = await client
      .from('offices')
      .select('name')
      .eq('id', originOfficeId)
      .maybeSingle()
    if (origOffRow?.name) originOfficeName = origOffRow.name
  }

  // Conditional transition first: only one pickup can win, and history is
  // written only after it does (a failed or duplicate pickup leaves no trace).
  const { data: updatedRows, error: updateErr } = await client
    .from('documents')
    .update({
      tracking_status:       'IN_TRANSIT',
      current_step:          nextStep,
      assigned_messenger_id: actorId,
      current_office_id:     null,
      current_handler_id:    null,
    })
    .eq('id', doc.id)
    .eq('tracking_status', doc.tracking_status)
    .eq('current_step', doc.current_step ?? 0)
    .eq('assigned_messenger_id', actorId)
    .select('id, title, tracking_status, current_step, assigned_messenger_id, current_office_id')

  if (updateErr) throw createError({ statusCode: 500, message: updateErr.message })
  const updatedDoc = updatedRows?.[0]
  if (!updatedDoc) {
    throw createError({
      statusCode: 409,
      message: `"${doc.title}" was already picked up.`,
      data: { code: 'ALREADY_PICKED_UP', document_id: doc.id },
    })
  }

  const { error: legErr } = await lifecycleDb()
    .from('document_liaison_assignments')
    .update({ picked_up_at: now })
    .eq('document_id', doc.id)
    .eq('status', 'ACTIVE')
    .is('picked_up_at', null)
  if (legErr) console.error('[Pickup] could not stamp liaison pickup:', legErr.message)

  if (!isPostClaim) {
    tracked.push(await recordTrackingEvent({
      document_id: doc.id,
      org_id: messengerOrgId,
      status: 'PICKED_UP',
      step_index: doc.current_step ?? 0,
      office_name: originOfficeName,
      actor_id: actorId,
      actor_role: actorRole ?? 'messenger',
      actor_name: actorRow.full_name,
      event_type: 'LIAISON_PICKUP',
      notes: `Document physically acquired by ${actorRow.full_name}${originOfficeName ? ` at ${originOfficeName}` : ''}.`,
      metadata: { from_office_id: originOfficeId, liaison_id: actorId },
    }))
  }

  tracked.push(await recordTrackingEvent({
    document_id: doc.id,
    org_id: messengerOrgId,
    status: 'IN_TRANSIT',
    step_index: nextStep,
    office_name: officeName,
    actor_id: actorId,
    actor_role: actorRole ?? 'messenger',
    actor_name: actorRow.full_name,
    event_type: 'IN_TRANSIT',
    notes: officeName
      ? `In transit to ${officeName} (Step ${nextStep}).`
      : `In transit toward Step ${nextStep}.`,
    metadata: { to_office_id: officeId, liaison_id: actorId },
  }))
  assertHistorySaved(tracked, 'The pickup')

  const scanMessage = `${actorRow.full_name} scanned QR for "${doc.title}" and moved it to IN_TRANSIT (Step ${nextStep})`

  await logActivitySafe({
    orgId: messengerOrgId,
    officeId: originOfficeId ?? null,
    userId: actorId,
    userName: actorRow.full_name,
    actorName: actorRow.full_name,
    actionType: 'pickup',
    details: scanMessage,
    message: scanMessage,
    documentId: doc.id,
    metadata: { tracking_status: 'IN_TRANSIT', step: nextStep, target_office_id: officeId },
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

  // 1. Notify Origin/Current Office (Departure Notice)
  if (originOfficeId) {
    await broadcastInboundOfficeNotification({
      orgId: messengerOrgId,
      documentId: doc.id,
      documentTitle: doc.title,
      messengerName: actorRow.full_name,
      officeId: originOfficeId,
      officeName: originOfficeName,
      title: 'Document Departed Office',
      message: `${actorRow.full_name} has picked up "${doc.title}" from your office.`,
    })

    await broadcastInboundDispatchRealtime(
      messengerOrgId,
      originOfficeId,
      'OUTGOING_DISPATCH',
      {
        type: 'OUTGOING_DISPATCH',
        event: 'OUTGOING_DISPATCH',
        document_id: doc.id,
        document_title: doc.title,
        batch_manifest_id: null,
        origin_office_id: originOfficeId,
        origin_office_name: originOfficeName,
        target_office_id: officeId,
        target_office_name: officeName,
        assigned_messenger_id: actorId,
        messenger_name: actorRow.full_name,
        tracking_status: 'IN_TRANSIT',
        dispatched_at: now,
        notes: `${actorRow.full_name} picked up "${doc.title}" from your office.`,
      },
    )
  }

  // 2. Notify Destination Office (Inbound ASN)
  if (officeId) {
    await broadcastInboundOfficeNotification({
      orgId: messengerOrgId,
      documentId: doc.id,
      documentTitle: doc.title,
      messengerName: actorRow.full_name,
      officeId,
      officeName,
      type: 'ASN_EN_ROUTE',
      title: 'Inbound Document En Route',
      message: `${actorRow.full_name} has picked up "${doc.title}" and is currently in transit to ${officeName || 'your station'}.`,
    })
  }

  // 3. Notify client / document owner
  if (doc.user_id) {
    const originLabel = originOfficeName ? originOfficeName : 'Office'
    await notifyDocumentOwner({
      orgId: messengerOrgId,
      documentId: doc.id,
      documentTitle: doc.title,
      userId: String(doc.user_id),
      title: `Document Departed ${originLabel}`,
      message: `${actorRow.full_name} picked up "${doc.title}" from ${originOfficeName || 'origin office'} and it is now in transit${officeName ? ` toward ${officeName}` : ''}.`,
      trackingStatus: 'IN_TRANSIT',
      originOfficeId,
      originOfficeName,
      targetOfficeId: officeId,
      targetOfficeName: officeName,
    })
  }

  await notifyClientStatusUpdate({
    orgId: messengerOrgId,
    documentId: doc.id,
    documentTitle: doc.title,
    trackingStatus: 'IN_TRANSIT',
    clientUserId: doc.user_id ? String(doc.user_id) : null,
  })

  // 4. Broadcast Advance Shipping Notice (ASN) / Inbound Dispatch Alert to Destination Office
  const dispatchPayload = {
    type: 'INCOMING_DISPATCH',
    event: 'INCOMING_DISPATCH',
    document_id: doc.id,
    document_title: doc.title,
    batch_manifest_id: null,
    origin_office_id: originOfficeId,
    origin_office_name: originOfficeName,
    target_office_id: officeId,
    target_office_name: officeName,
    next_step: nextStep,
    assigned_messenger_id: actorId,
    messenger_name: actorRow.full_name,
    tracking_status: 'IN_TRANSIT',
    dispatched_at: now,
    notes: officeName
      ? `In transit to ${officeName} (Step ${nextStep}).`
      : `In transit toward Step ${nextStep}.`,
  }

  await broadcastInboundDispatchRealtime(
    messengerOrgId,
    officeId,
    'INCOMING_DISPATCH',
    dispatchPayload,
  )
  await broadcastInboundDispatchRealtime(
    messengerOrgId,
    officeId,
    'ASN_PROACTIVE_ALERT',
    dispatchPayload,
  )

  try {
    await emitInTransitEmails({
      orgId: messengerOrgId,
      documentId: doc.id,
      title: doc.title,
      trackingCode: (doc as any).qr_code_data ?? null,
      creatorUserId: doc.user_id ? String(doc.user_id) : null,
      creatorRole: (doc as any).creator_role ?? null,
      status: 'IN_TRANSIT',
      currentStep: nextStep,
      originOfficeName,
      destinationOfficeId: officeId,
      destinationOfficeName: officeName,
      liaisonName: actorRow.full_name,
    })
  } catch (emailErr) {
    console.warn('[Pickup] Non-fatal: in-transit/ASN email failed:', emailErr)
  }

  return {
    success: true,
    message: `"${doc.title}" picked up and now on the way${officeName ? ` to ${officeName}` : ''}.`,
    data: {
      document:    updatedDoc,
      destination: { office_id: officeId, office_name: officeName, step: nextStep },
      messenger:   { id: actorId, name: actorRow.full_name },
      dispatch_alert: dispatchPayload,
    },
  }
})
