import { serverSupabaseClient } from '#supabase/server'

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

  // ── Auth: actor must belong to document's org ─────────────────────────
  const actorId = getCookie(event, 'user_session')
  if (!actorId) throw createError({ statusCode: 401, message: 'Authentication required' })

  // ── Fetch the document with stage info ────────────────────────────────
  const { data: doc, error: docErr } = await client
    .from('documents')
    .select('id, org_id, title, description, tracking_status, current_step, stage_id, qr_code_data, assigned_messenger_id, created_at')
    .eq('id', documentId)
    .single()

  if (docErr || !doc) {
    throw createError({ statusCode: 404, message: 'Document not found' })
  }

  // Org isolation check
  const { data: actorRow } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (!actorRow || String(actorRow.org_id) !== String(doc.org_id)) {
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
    // A stop's "arrival" is its ARRIVED_AT_OFFICE event, matched by
    // step_index (the reliable join key — some flows, e.g. QR drop-off,
    // write office_id as null but always set step_index to the route step
    // number). Falls back to office_id/office_name for older rows without
    // step_index. The very first stop instead uses the CREATED event, since
    // the document originates there rather than being carried in. A stop's
    // "release" is whichever PICKED_UP or COMPLETED event for that same
    // step happens next in the log after its arrival.
    const eventsAsc = events ?? []
    const matchesStep = (e: any, step: { step_number: number, office_id: number, office_name: string }) => {
      if (e.step_index !== null && e.step_index !== undefined) return Number(e.step_index) === step.step_number
      if (e.office_id !== null && e.office_id !== undefined) return String(e.office_id) === String(step.office_id)
      return e.office_name === step.office_name
    }

    routeSteps = rawSteps.map((step) => {
      let arrivalEvent = eventsAsc.find((e: any) => e.status === 'ARRIVED_AT_OFFICE' && matchesStep(e, step))
      if (!arrivalEvent && step.step_number === 1) {
        arrivalEvent = eventsAsc.find((e: any) => e.status === 'CREATED')
      }

      const arrivedAt = arrivalEvent?.created_at ?? null
      const deliveredBy = arrivalEvent?.actor_name ?? null

      let releasedAt: string | null = null
      let releasedBy: string | null = null
      let releasedStatus: string | null = null
      if (arrivedAt) {
        const releaseEvent = eventsAsc.find(
          (e: any) =>
            (e.status === 'PICKED_UP' || e.status === 'COMPLETED')
            && new Date(e.created_at).getTime() >= new Date(arrivedAt).getTime()
            && matchesStep(e, step),
        ) ?? eventsAsc.find(
          (e: any) =>
            (e.status === 'PICKED_UP' || e.status === 'COMPLETED')
            && new Date(e.created_at).getTime() > new Date(arrivedAt).getTime(),
        )
        if (releaseEvent) {
          releasedAt = releaseEvent.created_at
          releasedBy = releaseEvent.actor_name ?? null
          releasedStatus = releaseEvent.status
        }
      }

      return {
        ...step,
        delivered_by: deliveredBy,
        arrived_at: arrivedAt,
        released_at: releasedAt,
        released_by: releasedBy,
        released_status: releasedStatus,
      }
    })
  }

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

  return {
    success: true,
    data: {
      document: {
        ...doc,
        messenger_name: messengerName,
      },
      events:    events ?? [],
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
