import { resolveActorContextWithOffices, parseScope } from '~~/server/utils/actorContext'

/**
 * GET /api/tracking/queue
 *
 * In-flight document queue for the tracking operations dashboard.
 * Supports a dual-perspective scope toggle for the employee role.
 *
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ Role      │ scope=GLOBAL                    │ scope=LOCAL                  │
 * ├────────────────────────────────────────────────────────────────────────────┤
 * │ client    │ All org docs (scope ignored)    │ —                            │
 * │ employee  │ All org in-flight docs          │ Only docs in their offices   │
 * │ messenger │ Own assigned + unassigned CREATED (scope ignored)             │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * LOCAL filter for employees: documents where origin_office_id OR
 * current_office_id is one of the employee's assigned office UUIDs.
 * (current_office_id tracks where the physical document currently rests.)
 *
 * Security:
 *   org_id is ALWAYS resolved from the session via DB lookup — never from the
 *   orgId query param.  The query param is still accepted and validated against
 *   the session value for legacy compatibility, but it cannot expand access.
 *
 * Query params:
 *   scope   'GLOBAL' | 'LOCAL'   default 'GLOBAL'
 *   status  string               comma-separated tracking statuses to filter
 *   limit   number               default 100, max 500
 */
export default defineEventHandler(async (event) => {
  const client = useServerSupabase()
  const query  = getQuery(event)

  const scope        = parseScope(query.scope as string | undefined)
  const limit        = Math.min(Number(query.limit ?? 100), 500)
  const statusFilter = (query.status as string | undefined)?.split(',').map((s) => s.trim()).filter(Boolean) ?? []

  // ── Resolve actor from session ────────────────────────────────────────────
  const actor = await resolveActorContextWithOffices(event, client)

  // Optional: validate the legacy orgId param against session org (warn but don't block)
  const qOrgId = query.orgId as string | undefined
  if (qOrgId && String(qOrgId) !== actor.orgId) {
    console.warn(
      `[tracking/queue] orgId param (${qOrgId}) differs from session org (${actor.orgId}). ` +
      'Session org_id takes precedence.',
    )
  }

  // ── Build base document query ─────────────────────────────────────────────
  let dbQuery = client
    .from('documents')
    .select(
      'id, title, description, tracking_status, current_step, stage_id, ' +
      'office_id, origin_office_id, current_office_id, qr_code_data, ' +
      'assigned_messenger_id, created_at, user_id, creator_role',
    )
    .eq('org_id', actor.orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Apply tracking status filter (e.g. hide COMPLETED from active queue)
  if (statusFilter.length > 0) {
    dbQuery = dbQuery.in('tracking_status', statusFilter)
  }

  // ── Role + scope filters ──────────────────────────────────────────────────

  if (actor.userRole === 'messenger') {
    // Messengers only see documents assigned to them OR unassigned CREATED docs
    // Scope toggle does not apply — messengers are always in "LOCAL" context
    dbQuery = dbQuery.or(
      `assigned_messenger_id.eq.${actor.userId},` +
      `and(tracking_status.eq.CREATED,assigned_messenger_id.is.null)`,
    )
  } else if (actor.userRole === 'employee' && scope === 'LOCAL') {
    // ── Employee LOCAL — Small Picture ──────────────────────────────────────
    // Only documents that originate from or are currently resting in one of
    // this employee's assigned mini-office branches.
    if (actor.officeIds.length === 0) {
      // No assigned offices: show only their own uploads in the queue
      dbQuery = dbQuery.eq('user_id', actor.userId)
    } else {
      const officeList = actor.officeIds.join(',')
      // Filter on current_office_id first (where the doc physically is now),
      // then fall back to origin_office_id (where it started),
      // and include their own uploads regardless.
      dbQuery = dbQuery.or(
        `user_id.eq.${actor.userId},` +
        `current_office_id.in.(${officeList}),` +
        `origin_office_id.in.(${officeList})`,
      )
    }
  }
  // client + GLOBAL employee: no additional filter — full org queue

  const { data: docs, error } = await dbQuery

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const rows = docs ?? []

  // ── Bulk-resolve stage metadata ───────────────────────────────────────────
  const stageIds = [...new Set(rows.map((d: any) => d.stage_id).filter(Boolean))]
  let stageById: Record<string, { name: string; total_steps: number }> = {}

  if (stageIds.length) {
    const [{ data: stageRows }, { data: stepCounts }] = await Promise.all([
      client.from('stages').select('stage_id, name').in('stage_id', stageIds),
      client.from('stage_steps').select('stage_id').in('stage_id', stageIds),
    ])

    const countByStage: Record<string, number> = {}
    for (const s of stepCounts ?? []) {
      countByStage[String(s.stage_id)] = (countByStage[String(s.stage_id)] ?? 0) + 1
    }

    stageById = (stageRows ?? []).reduce((acc: any, s: any) => {
      acc[String(s.stage_id)] = {
        name:        s.name,
        total_steps: countByStage[String(s.stage_id)] ?? 0,
      }
      return acc
    }, {})
  }

  // ── Bulk-resolve messenger names ──────────────────────────────────────────
  const messengerIds = [...new Set(rows.map((d: any) => d.assigned_messenger_id).filter(Boolean))]
  let messengerNameById: Record<string, string> = {}

  if (messengerIds.length) {
    const { data: userRows } = await client
      .from('users')
      .select('user_id, full_name')
      .in('user_id', messengerIds)

    messengerNameById = (userRows ?? []).reduce((acc: any, u: any) => {
      acc[String(u.user_id)] = u.full_name
      return acc
    }, {})
  }

  // ── Bulk-resolve office labels ────────────────────────────────────────────
  const allOfficeIds = [...new Set(
    rows.flatMap((d: any) => [d.office_id, d.origin_office_id, d.current_office_id]).filter(Boolean),
  )]
  let officeLabelById: Record<string, string> = {}

  if (allOfficeIds.length) {
    const { data: officeRows } = await client
      .from('offices')
      .select('id, name, code')
      .in('id', allOfficeIds)

    officeLabelById = (officeRows ?? []).reduce((acc: any, o: any) => {
      acc[String(o.id)] = o.code ? `${o.name} (${o.code})` : o.name
      return acc
    }, {})
  }

  // ── Enrich rows ───────────────────────────────────────────────────────────
  const enriched = rows.map((doc: any) => {
    const stage = doc.stage_id ? stageById[String(doc.stage_id)] : null
    return {
      ...doc,
      stage_name:      stage?.name ?? null,
      total_steps:     stage?.total_steps ?? 0,
      progress_pct:    stage?.total_steps
        ? Math.round((doc.current_step / stage.total_steps) * 100)
        : 0,
      messenger_name:  doc.assigned_messenger_id
        ? (messengerNameById[String(doc.assigned_messenger_id)] ?? 'Unknown')
        : null,
      office_label:    doc.office_id         ? (officeLabelById[String(doc.office_id)]         ?? null) : null,
      origin_label:    doc.origin_office_id  ? (officeLabelById[String(doc.origin_office_id)]  ?? null) : null,
      current_label:   doc.current_office_id ? (officeLabelById[String(doc.current_office_id)] ?? null) : null,
      is_own_upload:   String(doc.user_id) === String(actor.userId),
    }
  })

  // ── Summary counts ────────────────────────────────────────────────────────
  const summary = {
    scope,
    total:             enriched.length,
    created:           enriched.filter((d: any) => d.tracking_status === 'CREATED').length,
    picked_up:         enriched.filter((d: any) => d.tracking_status === 'PICKED_UP').length,
    in_transit:        enriched.filter((d: any) => d.tracking_status === 'IN_TRANSIT').length,
    arrived_at_office: enriched.filter((d: any) => d.tracking_status === 'ARRIVED_AT_OFFICE').length,
    completed:         enriched.filter((d: any) => d.tracking_status === 'COMPLETED').length,
  }

  return { success: true, scope, org_id: actor.orgId, data: enriched, summary }
})
