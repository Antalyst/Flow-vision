import { serverSupabaseClient } from '#supabase/server'
import { logActivitySafe, trackingStatusToActionType } from '~~/server/utils/activityLog'
import { notifyClientStatusUpdate } from '~~/server/utils/notifications'
import { isDocumentAtFinalRouteStop } from '~~/server/utils/routeCompletion'

// ── Valid status pipeline ──────────────────────────────────────────────
const VALID_STATUSES = ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_OFFICE', 'DISCREPANCY_REPORTED', 'COMPLETED'] as const
type TrackingStatus = typeof VALID_STATUSES[number]

/**
 * Legal transitions for the state machine.
 * Key   = current status
 * Value = array of statuses the system accepts as the NEXT state
 */
const TRANSITIONS: Record<TrackingStatus, TrackingStatus[]> = {
  CREATED:               ['PICKED_UP'],
  PICKED_UP:             ['IN_TRANSIT'],
  IN_TRANSIT:            ['ARRIVED_AT_OFFICE'],
  ARRIVED_AT_OFFICE:     ['PICKED_UP', 'COMPLETED', 'DISCREPANCY_REPORTED'],
  DISCREPANCY_REPORTED:  ['ARRIVED_AT_OFFICE', 'PICKED_UP'],
  COMPLETED:             [],
}

/**
 * POST /api/tracking/advance
 *
 * Advances a document's tracking status by exactly one state-machine step.
 * The server validates the transition, writes an immutable audit event,
 * and updates the document's denormalized status + current_step cursor.
 *
 * Body:
 *   document_id   string   required
 *   status        string   required — the NEXT status to transition to
 *   notes?        string   optional actor notes
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body   = await readBody(event)

  const { document_id, status: nextStatus, notes } = body

  // ── Input validation ─────────────────────────────────────────────────
  if (!document_id) throw createError({ statusCode: 400, message: 'document_id is required' })
  if (!nextStatus)  throw createError({ statusCode: 400, message: 'status is required' })
  if (!VALID_STATUSES.includes(nextStatus as TrackingStatus)) {
    throw createError({
      statusCode: 400,
      message: `Invalid status "${nextStatus}". Must be one of: ${VALID_STATUSES.join(', ')}`,
    })
  }

  // ── Actor identity from session cookies ──────────────────────────────
  const actorId   = getCookie(event, 'user_session')
  const actorRole = getCookie(event, 'user_role')

  if (!actorId || !actorRole) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  // ── Fetch the document (with org isolation check) ────────────────────
  const { data: doc, error: docErr } = await client
    .from('documents')
    .select('id, org_id, user_id, title, status, tracking_status, current_step, stage_id, assigned_messenger_id, current_office_id, office_id')
    .eq('id', document_id)
    .single()

  if (docErr || !doc) {
    throw createError({ statusCode: 404, message: 'Document not found' })
  }

  // ── Validate actor belongs to the document's org ─────────────────────
  const { data: actorRow } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (!actorRow || String(actorRow.org_id) !== String(doc.org_id)) {
    throw createError({ statusCode: 403, message: 'Forbidden: document belongs to a different organization' })
  }

  // ── State machine check ───────────────────────────────────────────────
  const currentStatus = (doc.tracking_status || 'CREATED') as TrackingStatus
  const allowed = TRANSITIONS[currentStatus] ?? []

  if (!allowed.includes(nextStatus as TrackingStatus)) {
    throw createError({
      statusCode: 422,
      message: `Invalid transition: "${currentStatus}" → "${nextStatus}". Allowed next states: [${allowed.join(', ') || 'none — document is completed'}]`,
    })
  }

  if (nextStatus === 'COMPLETED') {
    const atFinal = await isDocumentAtFinalRouteStop(client, doc)
    if (!atFinal) {
      throw createError({
        statusCode: 422,
        message: 'Document can only be marked Completed when it has arrived at the final route office checkpoint.',
      })
    }
  }

  // ── Resolve route step and office for this transition ─────────────────
  let nextStep    = doc.current_step
  let officeId:   number | null = null
  let officeName: string | null = null

  if (nextStatus === 'ARRIVED_AT_OFFICE' || nextStatus === 'PICKED_UP') {
    // Determine which office this transition targets
    const stepToLook = nextStatus === 'IN_TRANSIT' ? doc.current_step + 1 : doc.current_step
    if (doc.stage_id) {
      const { data: stepRow } = await client
        .from('stage_steps')
        .select('office_id')
        .eq('stage_id', doc.stage_id)
        .eq('step_number', stepToLook)
        .maybeSingle()

      if (stepRow) {
        officeId = stepRow.office_id
        const { data: officeRow } = await client
          .from('offices')
          .select('name')
          .eq('id', officeId)
          .maybeSingle()
        officeName = officeRow?.name ?? null
      }
    }
  }

  if (nextStatus === 'IN_TRANSIT') {
    // Advance the step cursor as we depart toward the next office
    nextStep = doc.current_step + 1

    if (doc.stage_id) {
      const { data: stepRow } = await client
        .from('stage_steps')
        .select('office_id, offices(name)')
        .eq('stage_id', doc.stage_id)
        .eq('step_number', nextStep)
        .maybeSingle()

      if (stepRow) {
        officeId = stepRow.office_id
        officeName = (stepRow as any).offices?.name ?? null
      }
    }
  }

  // ── Messenger assignment on PICKED_UP ─────────────────────────────────
  // ARRIVED_AT_OFFICE also clears it, matching dropoff.post.ts and
  // complete-checkpoint.post.ts — otherwise a document driven through this
  // endpoint can be left with a stale assigned_messenger_id after arrival.
  const messengerUpdate =
    nextStatus === 'PICKED_UP'          ? { assigned_messenger_id: actorId } :
    nextStatus === 'ARRIVED_AT_OFFICE'  ? { assigned_messenger_id: null }    :
    nextStatus === 'COMPLETED'          ? { assigned_messenger_id: null }    :
    {}

  // ── Atomic writes ─────────────────────────────────────────────────────
  // 1. Insert immutable tracking event
  const { data: trackingEvent, error: eventErr } = await client
    .from('document_tracking_events')
    .insert({
      document_id,
      org_id:      String(doc.org_id),
      status:      nextStatus,
      step_index:  nextStep,
      office_id:   officeId,
      office_name: officeName,
      actor_id:    actorId,
      actor_role:  actorRole,
      actor_name:  actorRow.full_name,
      notes:       notes ?? null,
    })
    .select('*')
    .single()

  if (eventErr) {
    throw createError({ statusCode: 500, message: `Failed to write tracking event: ${eventErr.message}` })
  }

  // 2. Update document's denormalized state
  const statusUpdate = nextStatus === 'COMPLETED' ? { status: 'Approved' } : {}

  const { data: updatedDoc, error: updateErr } = await client
    .from('documents')
    .update({
      tracking_status: nextStatus,
      current_step:    nextStep,
      ...messengerUpdate,
      ...statusUpdate,
      ...(nextStatus === 'COMPLETED' ? { current_office_id: null } : {}),
    })
    .eq('id', document_id)
    .select('id, title, tracking_status, current_step, assigned_messenger_id')
    .single()

  if (updateErr) {
    throw createError({ statusCode: 500, message: `Failed to update document status: ${updateErr.message}` })
  }

  const advanceMessage =
    notes ??
    `${actorRow.full_name} advanced "${doc.title}" from ${currentStatus} to ${nextStatus}`

  await logActivitySafe({
    orgId: String(doc.org_id),
    userId: actorId,
    userName: actorRow.full_name,
    actorName: actorRow.full_name,
    actionType: trackingStatusToActionType(nextStatus),
    details: advanceMessage,
    message: advanceMessage,
    documentId: document_id,
    metadata: { from_status: currentStatus, to_status: nextStatus },
  }, client)

  await notifyClientStatusUpdate({
    orgId: String(doc.org_id),
    documentId: document_id,
    documentTitle: doc.title,
    trackingStatus: nextStatus,
    clientUserId: doc.user_id ? String(doc.user_id) : null,
  })

  return {
    success: true,
    message: `Document advanced to ${nextStatus}`,
    data: {
      document:      updatedDoc,
      trackingEvent,
      transition:    { from: currentStatus, to: nextStatus },
    },
  }
})
