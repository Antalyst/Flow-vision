import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { resolveOfficeDisplayLabel } from '~~/server/utils/officeLabel'

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
    .select('id, org_id, title, description, tracking_status, current_step, stage_id, qr_code_data, assigned_messenger_id, created_at, origin_office_id, office_id, user_id')
    .eq('id', documentId)
    .single()

  if (docErr || !doc) {
    throw createError({ statusCode: 404, message: 'Document not found' })
  }

  // Org isolation check
  if (String(actor.orgId) !== String(doc.org_id)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

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

  // ── Fetch stage route (the planned path) ──────────────────────────────
  let routeSteps: any[] = []
  if (doc.stage_id) {
    const { data: steps } = await client
      .from('stage_steps')
      .select('step_number, office_id, offices(id, name, code)')
      .eq('stage_id', doc.stage_id)
      .order('step_number', { ascending: true })

    const rawSteps = (steps ?? []).map((s: any) => ({
      step_number: s.step_number,
      office_id:   s.office_id,
      office_name: s.offices?.name ?? `Office #${s.office_id}`,
      office_code: s.offices?.code ?? null,
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
    const matchesStep = (e: any, step: { step_number: number, office_id: number, office_name: string }) => {
      if (e.step_index !== null && e.step_index !== undefined) return Number(e.step_index) === step.step_number
      if (e.office_id !== null && e.office_id !== undefined) return String(e.office_id) === String(step.office_id)
      return e.office_name === step.office_name
    }

    routeSteps = rawSteps.map((step) => {
      const arrivalEvent = eventsAsc.find((e: any) => e.status === 'ARRIVED_AT_OFFICE' && matchesStep(e, step))

      const arrivedAt = arrivalEvent?.created_at ?? null
      const deliveredBy = arrivalEvent?.actor_name ?? null

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

  return {
    success: true,
    data: {
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
        progress_pct:   routeSteps.length
          ? Math.round((doc.current_step / routeSteps.length) * 100)
          : 0,
      },
    },
  }
})
