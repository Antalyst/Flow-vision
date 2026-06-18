import { serverSupabaseClient } from '#supabase/server'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { broadcastPickupNotification, notifyClientStatusUpdate } from '~~/server/utils/notifications'

/**
 * POST /api/tracking/dropoff
 *
 * Handshake Part 2 – Messenger scans the QR code posted on an office wall.
 *
 * Flow:
 *   IN_TRANSIT  →  ARRIVED_AT_OFFICE  (→ COMPLETED if this was the final step)
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

  const { office_id } = body

  if (!office_id) {
    throw createError({ statusCode: 400, message: 'office_id is required' })
  }

  // ── Auth: messenger only ──────────────────────────────────────────────
  const actorId   = getCookie(event, 'user_session')
  const actorRole = getCookie(event, 'user_role')

  if (!actorId) throw createError({ statusCode: 401, message: 'Authentication required' })
  if (actorRole !== 'messenger') {
    throw createError({ statusCode: 403, message: 'Forbidden: only messenger accounts can perform office drop-offs' })
  }

  // ── Resolve messenger org ─────────────────────────────────────────────
  const { data: actorRow, error: actorErr } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (actorErr || !actorRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Messenger account has no organisation assigned' })
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
      message: 'Office checkpoint not found. Ensure you are scanning a valid FlowVision office QR code.',
    })
  }

  // ── SECURITY: cross-org leakage guard ─────────────────────────────────
  if (String(office.org_id) !== messengerOrgId) {
    throw createError({
      statusCode: 403,
      message: 'SECURITY_ORG_MISMATCH: This office checkpoint belongs to a different organisation. Access denied.',
      data: { code: 'SECURITY_ORG_MISMATCH', office_org: office.org_id, messenger_org: messengerOrgId },
    })
  }

  // ── Find this messenger's active IN_TRANSIT document ──────────────────
  const { data: activeDocs, error: docErr } = await client
    .from('documents')
    .select('id, org_id, user_id, title, tracking_status, current_step, stage_id')
    .eq('assigned_messenger_id', actorId)
    .eq('org_id', messengerOrgId)
    .eq('tracking_status', 'IN_TRANSIT')

  if (docErr) throw createError({ statusCode: 500, message: docErr.message })

  if (!activeDocs || activeDocs.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'No active in-transit document found. Please perform a document pickup first.',
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
      message: `ROUTE_MISMATCH: Office "${office.name}" is not the expected next checkpoint for your current delivery. Please continue to the correct destination.`,
      data: { code: 'ROUTE_MISMATCH', scanned_office: office.name },
    })
  }

  // ── Determine if this is the final stop ───────────────────────────────
  const isFinalStop = totalSteps > 0 && targetDoc.current_step >= totalSteps
  const finalStatus = isFinalStop ? 'COMPLETED' : 'ARRIVED_AT_OFFICE'

  // ── Write ARRIVED_AT_OFFICE event ─────────────────────────────────────
  await client.from('document_tracking_events').insert({
    document_id:  targetDoc.id,
    org_id:       messengerOrgId,
    status:       'ARRIVED_AT_OFFICE',
    step_index:   targetDoc.current_step,
    // document_tracking_events.office_id is INTEGER (existing column — no FK);
    // store the numeric portion if the UUID is purely numeric, else store null.
    // The office name is denormalised so queries don't need to join back.
    office_id:    null,
    office_name:  office.name,
    actor_id:     actorId,
    actor_role:   'messenger',
    actor_name:   actorRow.full_name,
    notes:        `Arrived and checked in at ${office.name}${office.code ? ` (${office.code})` : ''}.`,
  })

  // ── If final stop, also write COMPLETED event ─────────────────────────
  if (isFinalStop) {
    await client.from('document_tracking_events').insert({
      document_id:  targetDoc.id,
      org_id:       messengerOrgId,
      status:       'COMPLETED',
      step_index:   targetDoc.current_step,
      office_id:    null,
      office_name:  office.name,
      actor_id:     actorId,
      actor_role:   'messenger',
      actor_name:   actorRow.full_name,
      notes:        `All route stages completed. Final delivery confirmed at ${office.name}.`,
    })
  }

  // ── Update document state ─────────────────────────────────────────────
  const docUpdate: Record<string, any> = {
    tracking_status:   finalStatus,
    // Keep current_office_id in sync with the document's physical location.
    // Cleared on COMPLETED (no longer at a specific office in transit sense).
    // current_office_id is UUID FK → offices(id); pass as raw UUID string
    current_office_id: isFinalStop ? null : String(office_id),
  }
  if (isFinalStop) {
    docUpdate.assigned_messenger_id = null  // release messenger
  }

  const { data: updatedDoc, error: updateErr } = await client
    .from('documents')
    .update(docUpdate)
    .eq('id', targetDoc.id)
    .select('id, title, tracking_status, current_step')
    .single()

  if (updateErr) throw createError({ statusCode: 500, message: updateErr.message })

  const dropoffMessage = isFinalStop
    ? `${actorRow.full_name} completed delivery of "${targetDoc.title}" at ${office.name}`
    : `${actorRow.full_name} checked in "${targetDoc.title}" at ${office.name}`

  await logActivitySafe({
    orgId: messengerOrgId,
    officeId: String(office_id),
    userId: actorId,
    userName: actorRow.full_name,
    actorName: actorRow.full_name,
    actionType: isFinalStop ? 'system' : 'dropoff',
    details: dropoffMessage,
    message: dropoffMessage,
    documentId: targetDoc.id,
    metadata: { tracking_status: finalStatus, office_name: office.name },
  }, client)

  await notifyClientStatusUpdate({
    orgId: messengerOrgId,
    documentId: targetDoc.id,
    documentTitle: targetDoc.title,
    trackingStatus: finalStatus,
    clientUserId: targetDoc.user_id ? String(targetDoc.user_id) : null,
  })

  if (!isFinalStop) {
    try {
      await broadcastPickupNotification(client, {
        orgId: messengerOrgId,
        documentId: targetDoc.id,
        documentTitle: targetDoc.title,
      })
    } catch (hookErr) {
      console.warn('[Dropoff] Pickup notification broadcast failed:', hookErr)
    }
  }

  return {
    success:        true,
    is_final_stop:  isFinalStop,
    message:        isFinalStop
      ? `Delivery COMPLETED. "${targetDoc.title}" has reached its final destination at ${office.name}.`
      : `Checked in at ${office.name}. Document is now ARRIVED_AT_OFFICE. Ready for next leg.`,
    data: {
      document: updatedDoc,
      office:   { id: office.id, name: office.name, code: office.code },
      step:     targetDoc.current_step,
      total_steps: totalSteps,
    },
  }
})
