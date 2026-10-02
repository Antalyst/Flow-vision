import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { resolveOfficeDisplayLabel } from '~~/server/utils/officeLabel'
import { getDocumentRoute, getOfficeHeadId, lifecycleDb, routeStopAt } from '~~/server/utils/documentRoute'
import { assertFullDocumentAccess, documentAccessLevel } from '~~/server/utils/documentAccess'
import { planStaleCycleRepair } from '~~/server/utils/recurringRouting'
import { resolveOpenIssueReturn } from '~~/server/utils/documentIssues'

/**
 * GET /api/tracking/timeline
 *
 * Returns the full immutable event history for a single document,
 * enriched with the complete stage route so the UI can render both
 * past events AND the remaining route steps ahead.
 *
 * Query params:
 *   documentId  string  required
 */
export default defineEventHandler(async (event) => {
  const client      = await serverSupabaseClient(event)
  const query       = getQuery(event)
  const documentId  = query.documentId as string | undefined

  if (!documentId) {
    throw createError({ statusCode: 400, message: 'documentId is required' })
  }

  // ── Auth: actor must belong to document's org (also resolves the actor's
  // own office IDs, needed below to label the origin stop "My Office") ─────
  const actor = await resolveActorContextWithOffices(event, client)

  // ── Fetch the document with stage info ────────────────────────────────
  const { data: doc, error: docErr } = await client
    .from('documents')
    .select('id, org_id, title, description, tracking_status, current_step, stage_id, qr_code_data, assigned_messenger_id, created_at, origin_office_id, office_id, current_office_id, user_id, current_handler_id, checkpoint_cleared_step')
    .eq('id', documentId)
    .single()

  if (docErr || !doc) {
    throw createError({ statusCode: 404, message: 'Document not found' })
  }

  // Org isolation + office visibility: an office the document already left
  // gets only its "Released" status (see documentAccess.ts), never details.
  const documentRoute = await getDocumentRoute(doc)
  assertFullDocumentAccess(documentAccessLevel(actor, doc, documentRoute))

  // ── Fetch tracking events (audit log) ─────────────────────────────────
  const { data: events, error: eventsErr } = await client
    .from('document_tracking_events')
    .select('id, status, step_index, office_id, office_name, actor_id, actor_role, actor_name, notes, created_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true })

  if (eventsErr) {
    throw createError({ statusCode: 500, message: eventsErr.message })
  }

  const eventsAsc = events ?? []

  // ── Resolve assigned messenger display name ────────────────────────────
  let messengerName: string | null = null
  if (doc.assigned_messenger_id) {
    const { data: mRow } = await client
      .from('users')
      .select('full_name')
      .eq('user_id', doc.assigned_messenger_id)
      .single()
    messengerName = mRow?.full_name ?? null
  }

  // ── Resolve when the CURRENT assignment was made ────────────────────────
  // `assigned_messenger_id` is reused for every leg of the route (cleared on
  // arrival, re-set on the next assign-liaison call), so at most one
  // assignment is ever "live" at a time — there is never ambiguity about
  // which assign_liaison log entry this is. No new column needed: every
  // assignment code path (assign-liaison.post.ts, upload.post.ts,
  // scan/register.post.ts) already writes an activity_logs row tagged
  // action_type='assign_liaison' with document_id + created_at.
  let currentAssignmentAt: string | null = null
  if (doc.assigned_messenger_id) {
    const { data: assignLog } = await client
      .from('activity_logs')
      .select('created_at')
      .eq('document_id', documentId)
      .eq('action_type', 'assign_liaison')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    currentAssignmentAt = assignLog?.created_at ?? null
  }

  // ── Custody, liaison and release state ───────────────────────────────
  const db = lifecycleDb()
  const [{ data: legs }, { data: releaseRows }, { data: cycleRows }] = await Promise.all([
    db.from('document_liaison_assignments')
      .select('id, from_office_id, to_office_id, step_number, liaison_id, assigned_by, assigned_at, picked_up_at, delivered_at, received_by, status')
      .eq('document_id', documentId)
      .order('assigned_at', { ascending: true }),
    db.from('document_release_requests')
      .select('id, office_id, step_number, requested_by, requested_at, remarks, status, decided_by, decided_at, decision_remarks')
      .eq('document_id', documentId)
      .order('requested_at', { ascending: true }),
    // Recurring routing (table from a separate migration — an error just means no cycles).
    db.from('document_routing_cycles')
      .select('cycle_number, start_step, end_step, status, started_by, started_at, completed_at, completed_by')
      .eq('document_id', documentId)
      .order('cycle_number', { ascending: true }),
  ])
  const peopleIds = [...new Set([
    doc.current_handler_id,
    ...(legs ?? []).flatMap((l: any) => [l.liaison_id, l.assigned_by, l.received_by]),
    ...(releaseRows ?? []).flatMap((r: any) => [r.requested_by, r.decided_by]),
    ...(cycleRows ?? []).flatMap((c: any) => [c.started_by, c.completed_by]),
  ].filter(Boolean).map(String))]
  const { data: people } = peopleIds.length
    ? await db.from('users').select('user_id, full_name').in('user_id', peopleIds)
    : { data: [] as any[] }
  const nameOf = (id: unknown) => (id ? (people ?? []).find((p: any) => String(p.user_id) === String(id))?.full_name ?? null : null)

  // ── Fetch stage route (the planned path) ──────────────────────────────
  let routeSteps: any[] = []
  if (documentRoute.length > 0) {
    const rawSteps = documentRoute.map((s) => ({
      step_number: s.step_number,
      office_id:   s.office_id,
      office_name: s.office_name,
      office_code: null as string | null,
      cycle_number: s.cycle_number ?? 1,
      is_return:   !!s.is_return,
    }))

    // ── Fill in who handled each stop, and when it arrived / moved on ──────
    // A stop's "arrival" is its ARRIVED_AT_OFFICE event ONLY, matched by
    // step_index (the reliable join key — some flows, e.g. QR drop-off,
    // write office_id as null but always set step_index to the route step
    // number). Falls back to office_id/office_name for older rows without
    // step_index. Stop 1 used to fall back to the CREATED event when it had
    // no real arrival yet — that's wrong now that the origin block (below)
    // exists separately: it made a document that had only just been
    // *registered* (or was still in transit toward stop 1) look like it had
    // already been delivered there, using the registering employee's name
    // as if they'd dropped it off. A stop's "release" is whichever
    // PICKED_UP or COMPLETED event for that same step happens next in the
    // log after its arrival.
    const matchesStep = (e: any, step: { step_number: number, office_id: string, office_name: string }) => {
      if (e.step_index !== null && e.step_index !== undefined) return Number(e.step_index) === step.step_number
      if (e.office_id !== null && e.office_id !== undefined) return String(e.office_id) === String(step.office_id)
      return e.office_name === step.office_name
    }

    routeSteps = rawSteps.map((step) => {
      const arrivalEvent = eventsAsc.find((e: any) => e.status === 'ARRIVED_AT_OFFICE' && matchesStep(e, step))
      // Fallback: the liaison leg the receiving office's scan closed. Covers
      // receipts whose history entry could not be written (see
      // recordTrackingEvent) so a received stop never reads "On the Way".
      const receivedLeg = arrivalEvent
        ? null
        : (legs ?? []).find((l: any) => l.delivered_at && Number(l.step_number) === step.step_number)

      const arrivedAt = arrivalEvent?.created_at ?? receivedLeg?.delivered_at ?? null
      const deliveredBy = arrivalEvent?.actor_name ?? (receivedLeg ? nameOf(receivedLeg.received_by) : null)
      // Who recorded the arrival: an office receipt (receive scan) or a
      // liaison drop-off (older documents, before drop-off was retired).
      const arrivalKind = arrivalEvent
        ? (arrivalEvent.actor_role === 'messenger' ? 'DROPOFF' : 'RECEIPT')
        : receivedLeg ? 'RECEIPT' : null

      let releasedAt: string | null = null
      let releasedBy: string | null = null
      let releasedStatus: string | null = null
      if (arrivedAt) {
        // Step-matched only — an earlier version fell back to "any later
        // PICKED_UP/COMPLETED event" with no step check, which could
        // misattribute a different stop's pickup to this one. Showing
        // nothing is safer than showing the wrong courier's name.
        const releaseEvent = eventsAsc.find(
          (e: any) =>
            (e.status === 'PICKED_UP' || e.status === 'COMPLETED')
            && new Date(e.created_at).getTime() >= new Date(arrivedAt).getTime()
            && matchesStep(e, step),
        )
        if (releaseEvent) {
          releasedAt = releaseEvent.created_at
          releasedBy = releaseEvent.actor_name ?? null
          releasedStatus = releaseEvent.status
        }
      }

      // "Out for delivery" pending state: this stop is the document's
      // current location, a messenger has been assigned for the next leg,
      // but they haven't scanned pickup yet (no release event recorded).
      const isPendingNextLeg =
        step.step_number === doc.current_step &&
        doc.tracking_status === 'ARRIVED_AT_OFFICE' &&
        !releasedStatus &&
        !!doc.assigned_messenger_id

      // This stop is the courier's current destination but they haven't
      // scanned drop-off yet — show who's currently carrying it rather than
      // nothing (or, before the fix above, a false "already dropped off").
      // The carrying courier stays the SAME name shown at pickup until a
      // real drop-off event exists; it never gets replaced early.
      const isInTransitToHere =
        step.step_number === doc.current_step &&
        doc.tracking_status === 'IN_TRANSIT' &&
        !arrivedAt

      return {
        ...step,
        delivered_by: deliveredBy,
        arrived_at: arrivedAt,
        arrival_kind: arrivalKind,
        // Authoritative "received" state: a recorded arrival, or the document
        // is sitting at this stop right now (tracking_status is the source of truth).
        received: !!arrivedAt || (step.step_number === doc.current_step && doc.tracking_status === 'ARRIVED_AT_OFFICE'),
        released_at: releasedAt,
        released_by: releasedBy,
        released_status: releasedStatus,
        pending_next_messenger_name: isPendingNextLeg ? messengerName : null,
        pending_next_assigned_at: isPendingNextLeg ? currentAssignmentAt : null,
        in_transit_courier_name: isInTransitToHere ? messengerName : null,
      }
    })
  }

  // ── Build the origin block (the registering office, before Stop 1) ─────
  // Kept separate from routeSteps rather than folded in as a numbered
  // stop — the origin is where the document was PHYSICALLY REGISTERED,
  // which is not necessarily the route's own first configured stop.
  const originOfficeId = doc.origin_office_id ?? doc.office_id ?? null

  // Combines the office's own name with the CREATOR's personal desk name,
  // when they have one (e.g. "Treasurer Office · Joeval's Desk") — see
  // server/utils/officeLabel.ts for why this is a reverse lookup by creator
  // rather than a walk up originOfficeId's own parent_office_id.
  const originLabel = await resolveOfficeDisplayLabel(client, originOfficeId, doc.user_id)
  const originOfficeName = originLabel.office_name

  const createdEvent = eventsAsc.find((e: any) => e.status === 'CREATED')
  // The event that carried the document away from the origin for leg 1
  // (step_index 0, or null on older rows written before step_index existed).
  const originDepartureEvent = eventsAsc.find(
    (e: any) => e.status === 'PICKED_UP' && (e.step_index === 0 || e.step_index === null),
  )

  // Pending-assignment sub-state gated strictly to "still at the origin,
  // not yet picked up for leg 1" — assigned_messenger_id alone is NOT a
  // safe signal here, since it's reused for every later leg too; checking
  // it without this gate would show a downstream courier as if departing
  // the origin (the exact misattribution this endpoint is meant to fix).
  const isPendingFirstLeg = doc.current_step === 0 && doc.tracking_status === 'CREATED' && !!doc.assigned_messenger_id

  const origin = {
    office_id: originOfficeId,
    // "{office} · {creator's desk}" when the creator has a personal desk
    // under this office; otherwise just the office name. desk_name is also
    // exposed on its own so the client can still show it as a sub-label
    // even in the "My Office" case, where office_name is overridden.
    office_name: originOfficeId ? originLabel.label : 'Org-wide',
    desk_name: originLabel.desk_name,
    is_my_office: originOfficeId ? actor.officeIds.includes(String(originOfficeId)) : false,
    registered_by: createdEvent?.actor_name ?? null,
    registered_at: createdEvent?.created_at ?? doc.created_at,
    pending_messenger_name: isPendingFirstLeg ? messengerName : null,
    pending_assigned_at: isPendingFirstLeg ? currentAssignmentAt : null,
    departed: doc.current_step >= 1,
    departed_by: originDepartureEvent?.actor_name ?? null,
    departed_at: originDepartureEvent?.created_at ?? null,
  }

  const officeNameOf = (id: unknown) => {
    if (!id) return null
    const stop = documentRoute.find((s) => s.office_id === String(id))
    if (stop) return stop.office_name
    return String(id) === String(originOfficeId) ? originOfficeName : null
  }

  const liaisonAssignments = (legs ?? []).map((l: any) => ({
    ...l,
    liaison_name: nameOf(l.liaison_id),
    assigned_by_name: nameOf(l.assigned_by),
    received_by_name: nameOf(l.received_by),
    from_office_name: officeNameOf(l.from_office_id),
    to_office_name: officeNameOf(l.to_office_id),
  }))
  const releaseRequests = (releaseRows ?? []).map((r: any) => ({
    ...r,
    requested_by_name: nameOf(r.requested_by),
    decided_by_name: nameOf(r.decided_by),
  }))
  const pendingRelease = releaseRequests.find((r) => r.status === 'PENDING') ?? null
  const currentStep = doc.current_step ?? 0
  const atOffice = doc.tracking_status === 'ARRIVED_AT_OFFICE'
  const officeHeadId = atOffice ? await getOfficeHeadId(doc.current_office_id) : null
  const releaseApproved = atOffice && (doc.checkpoint_cleared_step ?? null) === currentStep
  const nextStop = routeStopAt(documentRoute, currentStep + 1)

  // A flagged document stays with its holder; it moves only when a liaison
  // returns it to the office the open issue names.
  const openReturn = doc.tracking_status === 'DISCREPANCY_REPORTED' ? await resolveOpenIssueReturn(client, documentId) : null

  let handlingState: string
  if (doc.tracking_status === 'COMPLETED') handlingState = 'COMPLETED'
  else if (doc.tracking_status === 'DISCREPANCY_REPORTED') handlingState = 'FLAGGED'
  else if (doc.tracking_status === 'IN_TRANSIT' || doc.tracking_status === 'PICKED_UP') handlingState = 'DISPATCHED'
  else if (doc.tracking_status === 'CREATED') handlingState = doc.assigned_messenger_id ? 'AWAITING_PICKUP' : 'REGISTERED'
  else if (releaseApproved) handlingState = doc.assigned_messenger_id ? 'AWAITING_PICKUP' : 'RELEASE_APPROVED'
  else if (pendingRelease) handlingState = 'AWAITING_RELEASE_APPROVAL'
  else handlingState = 'BEING_HANDLED'

  const cycles = (cycleRows ?? []).map((c: any) => {
    // A cycle record left ACTIVE after its document completed (its closing
    // write failed) is shown as completed — the document state is
    // authoritative; reactivation repairs the stored record.
    const stale = planStaleCycleRepair(doc, c, null).repair
    return {
      ...c,
      status: stale ? 'COMPLETED' : c.status,
      record_pending_repair: stale,
      started_by_name: nameOf(c.started_by),
      completed_by_name: nameOf(c.completed_by),
    }
  })
  const { data: routingRow } = await db.from('documents').select('routing_type').eq('id', documentId).maybeSingle()
  const routingType = (routingRow as any)?.routing_type === 'RECURRING' ? 'RECURRING' : 'STANDARD'
  // Same rule as reactivate.post.ts: creator, org admin, or anyone from the originating office.
  const recurringDone = routingType === 'RECURRING' && doc.tracking_status === 'COMPLETED'
  const inOriginOffice = recurringDone && !!originOfficeId && (
    actor.officeIds.map(String).includes(String(originOfficeId))
    || (actor.userRole === 'employee' && (await getOfficeHeadId(String(originOfficeId))) === actor.userId)
  )
  const canReactivate = recurringDone
    && (actor.userRole === 'client' || (!!doc.user_id && String(doc.user_id) === actor.userId) || inOriginOffice)

  const custody = {
    handling_state: handlingState,
    holder_id: doc.current_handler_id ?? null,
    holder_name: nameOf(doc.current_handler_id),
    office_head_id: officeHeadId,
    viewer_is_holder: !!doc.current_handler_id && String(doc.current_handler_id) === actor.userId,
    viewer_is_head: !!officeHeadId && officeHeadId === actor.userId,
    release_approved: releaseApproved,
    pending_release: pendingRelease,
    is_final_stop: atOffice && !nextStop && documentRoute.length > 0,
    next_stop: nextStop,
    active_liaison: liaisonAssignments.find((l: any) => l.status === 'ACTIVE') ?? null,
    // Where a flagged document is to be returned (null = it stays where it is).
    discrepancy_return: openReturn?.target
      ? { issue_id: openReturn.issue.id, office_id: openReturn.target.officeId, office_name: openReturn.target.officeName, step: openReturn.target.newStep }
      : null,
  }

  return {
    success: true,
    data: {
      routing: {
        type: routingType,
        cycles,
        current_cycle: (documentRoute.find((s) => s.step_number === currentStep) ?? documentRoute[documentRoute.length - 1])?.cycle_number ?? 1,
        can_reactivate: canReactivate,
      },
      custody,
      liaison_assignments: liaisonAssignments,
      release_requests: releaseRequests,
      document: {
        ...doc,
        messenger_name: messengerName,
      },
      origin,
      events:    eventsAsc,
      routeSteps,
      summary: {
        total_steps:    routeSteps.length,
        current_step:   doc.current_step,
        tracking_status: doc.tracking_status,
        is_complete:    doc.tracking_status === 'COMPLETED',
        // Whether the VIEWER belongs to the office physically holding the
        // document right now — only that office may review / complete it
        // (same rule complete-checkpoint.post.ts enforces server-side).
        viewer_at_current_office: doc.current_office_id
          ? actor.officeIds.includes(String(doc.current_office_id))
          : false,
        progress_pct:   routeSteps.length
          ? Math.round((doc.current_step / routeSteps.length) * 100)
          : 0,
      },
    },
  }
})
