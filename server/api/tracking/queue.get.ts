import { serverSupabaseClient } from '#supabase/server'

/**
 * GET /api/tracking/queue
 *
 * Returns in-flight documents for the operations dashboard.
 * Scope depends on caller role:
 *   client / employee → all org documents in any in-flight status
 *   messenger         → only documents assigned to them OR available for pickup
 *
 * Query params:
 *   orgId   string  required
 *   status  string  optional filter — comma-separated list of statuses
 *   limit   number  default 100
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const query  = getQuery(event)

  const orgId   = query.orgId  as string | undefined
  const limit   = Math.min(Number(query.limit ?? 100), 500)
  const statusFilter = (query.status as string | undefined)?.split(',').map((s) => s.trim()) ?? []

  if (!orgId) throw createError({ statusCode: 400, message: 'orgId is required' })

  const actorId   = getCookie(event, 'user_session')
  const actorRole = getCookie(event, 'user_role')

  if (!actorId || !actorRole) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  // Verify caller belongs to this org
  const { data: actorRow } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (!actorRow || String(actorRow.org_id) !== String(orgId)) {
    throw createError({ statusCode: 403, message: 'Forbidden: org_id mismatch' })
  }

  // Build query
  let dbQuery = client
    .from('documents')
    .select('id, title, description, tracking_status, current_step, stage_id, office_id, qr_code_data, assigned_messenger_id, created_at, user_id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (statusFilter.length > 0) {
    dbQuery = dbQuery.in('tracking_status', statusFilter)
  }

  // Messengers only see their own documents + unassigned CREATED ones
  if (actorRole === 'messenger') {
    dbQuery = dbQuery.or(`assigned_messenger_id.eq.${actorId},and(tracking_status.eq.CREATED,assigned_messenger_id.is.null)`)
  }

  const { data: docs, error } = await dbQuery

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const rows = docs ?? []

  // Resolve stage and messenger names in bulk
  const stageIds    = [...new Set(rows.map((d: any) => d.stage_id).filter(Boolean))]
  const messengerIds = [...new Set(rows.map((d: any) => d.assigned_messenger_id).filter(Boolean))]

  let stageById: Record<string, { name: string; total_steps: number }> = {}
  if (stageIds.length) {
    const { data: stageRows } = await client
      .from('stages')
      .select('stage_id, name')
      .in('stage_id', stageIds)

    const { data: stepCounts } = await client
      .from('stage_steps')
      .select('stage_id')
      .in('stage_id', stageIds)

    const countByStage: Record<string, number> = {}
    for (const s of stepCounts ?? []) {
      countByStage[s.stage_id] = (countByStage[s.stage_id] ?? 0) + 1
    }

    stageById = (stageRows ?? []).reduce((acc: any, s: any) => {
      acc[String(s.stage_id)] = { name: s.name, total_steps: countByStage[s.stage_id] ?? 0 }
      return acc
    }, {})
  }

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
    }
  })

  // Summary counts
  const summary = {
    total:            enriched.length,
    created:          enriched.filter((d: any) => d.tracking_status === 'CREATED').length,
    picked_up:        enriched.filter((d: any) => d.tracking_status === 'PICKED_UP').length,
    in_transit:       enriched.filter((d: any) => d.tracking_status === 'IN_TRANSIT').length,
    arrived_at_office: enriched.filter((d: any) => d.tracking_status === 'ARRIVED_AT_OFFICE').length,
    completed:        enriched.filter((d: any) => d.tracking_status === 'COMPLETED').length,
  }

  return { success: true, data: enriched, summary }
})
