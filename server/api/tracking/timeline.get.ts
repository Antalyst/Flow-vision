
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
  const supabase      = useServerSupabase()
  const query       = getQuery(event)
  const documentId  = query.documentId as string | undefined

  if (!documentId) {
    throw createError({ statusCode: 400, message: 'documentId is required' })
  }

  // ── Auth: actor must belong to document's org ─────────────────────────
  const actorId = getCookie(event, 'user_session')
  if (!actorId) throw createError({ statusCode: 401, message: 'Authentication required' })

  // ── Fetch the document with stage info ────────────────────────────────
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, org_id, title, description, tracking_status, current_step, stage_id, qr_code_data, assigned_messenger_id, created_at')
    .eq('id', documentId)
    .single()

  if (docErr || !doc) {
    throw createError({ statusCode: 404, message: 'Document not found' })
  }

  // Org isolation check
  const { data: actorRow } = await supabase
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (!actorRow || String(actorRow.org_id) !== String(doc.org_id)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // ── Fetch tracking events (audit log) ─────────────────────────────────
  const { data: events, error: eventsErr } = await supabase
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
    const { data: steps } = await supabase
      .from('stage_steps')
      .select('step_number, office_id, offices(id, name, code)')
      .eq('stage_id', doc.stage_id)
      .order('step_number', { ascending: true })

    routeSteps = (steps ?? []).map((s: any) => ({
      step_number: s.step_number,
      office_id:   s.office_id,
      office_name: s.offices?.name ?? `Office #${s.office_id}`,
      office_code: s.offices?.code ?? null,
    }))
  }

  // ── Resolve assigned messenger display name ────────────────────────────
  let messengerName: string | null = null
  if (doc.assigned_messenger_id) {
    const { data: mRow } = await supabase
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
