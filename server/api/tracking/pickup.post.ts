
/**
 * POST /api/tracking/pickup
 *
 * Handshake Part 1 – Messenger scans the QR code on a physical document.
 *
 * Flow:
 *   CREATED  →  PICKED_UP  →  IN_TRANSIT   (two atomic tracking events in one call)
 *
 * The PICKED_UP + IN_TRANSIT pair are written together because the physical act of
 * picking up a document implies immediate transit toward the first destination.
 *
 * Body:
 *   qr_code_data  string  The raw QR text scanned from the document (e.g. "QR-3F9A2C8B1")
 *
 * Security:
 *   - Actor org_id is derived server-side from the session cookie, never from the body.
 *   - If the document belongs to a different org, returns 403 SECURITY_ORG_MISMATCH.
 *   - Only messengers may call this endpoint.
 */
export default defineEventHandler(async (event) => {
  const supabase = useServerSupabase()
  const body   = await readBody(event)

  const { qr_code_data } = body

  if (!qr_code_data?.trim()) {
    throw createError({ statusCode: 400, message: 'qr_code_data is required' })
  }

  // ── Auth: messenger only ──────────────────────────────────────────────
  const actorId   = getCookie(event, 'user_session')
  const actorRole = getCookie(event, 'user_role')

  if (!actorId) throw createError({ statusCode: 401, message: 'Authentication required' })
  if (actorRole !== 'messenger') {
    throw createError({ statusCode: 403, message: 'Forbidden: only messenger accounts can perform document pickups' })
  }

  // ── Resolve messenger's org_id (server-side) ──────────────────────────
  const { data: actorRow, error: actorErr } = await supabase
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (actorErr || !actorRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Messenger account has no organisation assigned' })
  }

  const messengerOrgId = String(actorRow.org_id)

  // ── Find document by QR code ──────────────────────────────────────────
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, org_id, title, tracking_status, current_step, stage_id, assigned_messenger_id')
    .eq('qr_code_data', qr_code_data.trim())
    .maybeSingle()

  if (docErr) throw createError({ statusCode: 500, message: docErr.message })

  if (!doc) {
    throw createError({
      statusCode: 404,
      message: 'No document found for this QR code. Ensure you are scanning a valid FlowVision document.',
    })
  }

  // ── SECURITY: cross-org leakage guard ─────────────────────────────────
  if (String(doc.org_id) !== messengerOrgId) {
    throw createError({
      statusCode: 403,
      message: 'SECURITY_ORG_MISMATCH: This document belongs to a different organisation. Scanning is not permitted.',
      data: { code: 'SECURITY_ORG_MISMATCH' },
    })
  }

  // ── State validation ──────────────────────────────────────────────────
  const allowedFromStates = ['CREATED', 'ARRIVED_AT_OFFICE']
  if (!allowedFromStates.includes(doc.tracking_status)) {
    throw createError({
      statusCode: 422,
      message: `Cannot pick up a document in "${doc.tracking_status}" status. Document must be CREATED or ARRIVED_AT_OFFICE.`,
    })
  }

  // ── Resolve next route step and office ────────────────────────────────
  const nextStep = doc.current_step + 1
  let officeId:   number | null = null
  let officeName: string | null = null

  if (doc.stage_id) {
    const { data: stepRow } = await supabase
      .from('stage_steps')
      .select('office_id, offices(name)')
      .eq('stage_id', doc.stage_id)
      .eq('step_number', nextStep)
      .maybeSingle()

    if (stepRow) {
      officeId   = stepRow.office_id
      officeName = (stepRow as any).offices?.name ?? null
    }
  }

  const now = new Date().toISOString()

  // ── Write PICKED_UP event ─────────────────────────────────────────────
  await supabase.from('document_tracking_events').insert({
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

  // ── Write IN_TRANSIT event ────────────────────────────────────────────
  await supabase.from('document_tracking_events').insert({
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

  // ── Update document state ─────────────────────────────────────────────
  // current_office_id is cleared while the document is physically in transit
  // between offices — it will be set again on ARRIVED_AT_OFFICE.
  const { data: updatedDoc, error: updateErr } = await supabase
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
