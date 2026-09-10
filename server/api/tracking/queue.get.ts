import { serverSupabaseClient } from '#supabase/server'
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
  const client = await serverSupabaseClient(event)
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
      'id, title, description, status, tracking_status, current_step, stage_id, ' +
      'office_id, origin_office_id, current_office_id, qr_code_data, ' +
      'checkpoint_cleared_step, assigned_messenger_id, created_at, user_id, creator_role',
    )
    .eq('org_id', actor.orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Apply tracking status filter (e.g. hide COMPLETED from active queue)
  if (statusFilter.length > 0) {
    dbQuery = dbQuery.in('tracking_status', statusFilter)
  }

  // ── Role + scope filters ──────────────────────────────────────────────────

  if (String(actor.userRole).toLowerCase() === 'messenger') {
    // Messengers only see documents assigned to them OR unassigned CREATED docs
    // Scope toggle does not apply — messengers are always in "LOCAL" context
    dbQuery = dbQuery.or(
      `assigned_messenger_id.eq.${actor.userId},` +
      `and(tracking_status.eq.CREATED,assigned_messenger_id.is.null)`
    )
  } else if (scope === 'INCOMING') {
    // ── INCOMING: Documents in transit heading to this employee's assigned offices ─
    if (actor.officeIds.length === 0) {
      dbQuery = dbQuery.eq('user_id', actor.userId).in('tracking_status', ['IN_TRANSIT', 'PICKED_UP'])
    } else {
      const { data: targetSteps } = await client
        .from('stage_steps')
        .select('stage_id, step_number, office_id')
        .in('office_id', actor.officeIds)

      const orConditions: string[] = []
      const officeList = actor.officeIds.join(',')
      orConditions.push(`office_id.in.(${officeList})`)

      if (targetSteps && targetSteps.length > 0) {
        for (const step of targetSteps) {
          orConditions.push(`and(stage_id.eq.${step.stage_id},current_step.eq.${step.step_number})`)
        }
      }

      dbQuery = dbQuery
        .in('tracking_status', statusFilter.length > 0 ? statusFilter : ['IN_TRANSIT', 'PICKED_UP'])
        .or(orConditions.join(','))
    }
  } else if (scope === 'LOCAL') {
    // ── LOCAL: Documents at or originating from employee's assigned offices ────────
    if (actor.officeIds.length === 0) {
      dbQuery = dbQuery.eq('user_id', actor.userId)
    } else {
      const officeList = actor.officeIds.join(',')
      dbQuery = dbQuery.or(
        `user_id.eq.${actor.userId},` +
        `current_office_id.in.(${officeList}),` +
        `origin_office_id.in.(${officeList}),` +
        `office_id.in.(${officeList})`,
      )
    }
  }
  // GLOBAL: No extra office filter, fetches all org docs

  const { data: docs, error } = await dbQuery

  if (error) {
    console.error('[queue.get.ts] Supabase Query Error:', error)
    return { success: false, error: error.message, data: [], summary: {} }
  }

  console.log(`[queue.get.ts] Fetched ${docs?.length || 0} docs for userRole=${actor.userRole}, scope=${scope}, officeIds=${actor.officeIds.length}`)

  const rows = docs ?? []

  // ── Bulk-resolve stage metadata ───────────────────────────────────────────
  const stageIds = [...new Set(rows.map((d: any) => d.stage_id).filter(Boolean))]
  let stageById: Record<string, { name: string; total_steps: number; stepsByNumber: Record<number, { office_id: string | null }> }> = {}

  if (stageIds.length) {
    const [{ data: stageRows }, { data: stepRows }] = await Promise.all([
      client.from('stages').select('stage_id, name').in('stage_id', stageIds),
      client.from('stage_steps').select('stage_id, step_number, office_id').in('stage_id', stageIds),
    ])

    const stepsMap: Record<string, { total_steps: number; stepsByNumber: Record<number, { office_id: string | null }> }> = {}
    for (const s of stepRows ?? []) {
      const sId = String(s.stage_id)
      if (!stepsMap[sId]) {
        stepsMap[sId] = { total_steps: 0, stepsByNumber: {} }
      }
      stepsMap[sId].total_steps++
      if (s.step_number != null) {
        stepsMap[sId].stepsByNumber[Number(s.step_number)] = { office_id: s.office_id ? String(s.office_id) : null }
      }
    }

    stageById = (stageRows ?? []).reduce((acc: any, s: any) => {
      const sId = String(s.stage_id)
      acc[sId] = {
        name:            s.name,
        total_steps:     stepsMap[sId]?.total_steps ?? 0,
        stepsByNumber:   stepsMap[sId]?.stepsByNumber ?? {},
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
  // Collect all direct office IDs and step destination office IDs
  const targetStepOfficeIds: string[] = []
  for (const doc of rows) {
    if (doc.stage_id && doc.current_step != null) {
      const stageMeta = stageById[String(doc.stage_id)]
      const stepOffice = stageMeta?.stepsByNumber?.[Number(doc.current_step)]?.office_id
      if (stepOffice) targetStepOfficeIds.push(stepOffice)
    }
  }

  const allOfficeIds = [...new Set([
    ...rows.flatMap((d: any) => [d.office_id, d.origin_office_id, d.current_office_id]).filter(Boolean),
    ...targetStepOfficeIds,
  ])]
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
    const destOfficeId = doc.stage_id && doc.current_step != null
      ? (stage?.stepsByNumber?.[Number(doc.current_step)]?.office_id ?? doc.office_id ?? null)
      : (doc.office_id ?? null)

    return {
      ...doc,
      stage_name:              stage?.name ?? null,
      total_steps:             stage?.total_steps ?? 0,
      progress_pct:            stage?.total_steps
        ? Math.round((doc.current_step / stage.total_steps) * 100)
        : 0,
      messenger_name:          doc.assigned_messenger_id
        ? (messengerNameById[String(doc.assigned_messenger_id)] ?? 'Unknown')
        : null,
      office_label:            doc.office_id         ? (officeLabelById[String(doc.office_id)]         ?? null) : null,
      origin_label:            doc.origin_office_id  ? (officeLabelById[String(doc.origin_office_id)]  ?? null) : null,
      current_label:           doc.current_office_id ? (officeLabelById[String(doc.current_office_id)] ?? null) : null,
      destination_office_id:   destOfficeId,
      destination_office_name: destOfficeId ? (officeLabelById[String(destOfficeId)] ?? null) : null,
      is_own_upload:           String(doc.user_id) === String(actor.userId),
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
