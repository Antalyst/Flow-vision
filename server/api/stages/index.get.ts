import { resolveActorContextWithOffices, parseScope } from '~~/server/utils/actorContext'

/**
 * GET /api/stages
 *
 * Returns route templates with dual-perspective scope support.
 *
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ scope=GLOBAL  │ All stages in the org (global + all local templates)       │
 * │               │ → macro view for supabase admins and the employee big-picture │
 * ├────────────────────────────────────────────────────────────────────────────┤
 * │ scope=LOCAL   │ Global templates (accessible to everyone) PLUS any local   │
 * │               │ templates scoped to the employee's own office branches.    │
 * │               │ → employee small-picture / route builder view              │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Stage taxonomy (from mini_office_architecture migration):
 *   office_id IS NULL  → Global template  (supabase admin created; org-wide)
 *   office_id = UUID   → Local template   (employee created; branch-scoped)
 *
 * Security:
 *   org_id resolved from session — query param `orgId` is accepted only as a
 *   convenience cache-busting hint and validated against the session value.
 *
 * Query params:
 *   scope     'GLOBAL' | 'LOCAL'   default 'GLOBAL'
 *   officeId  UUID string           optional override — explicit office filter
 *                                   (takes precedence over session-derived list)
 */
export default defineEventHandler(async (event) => {
  try {
    const supabase = useServerSupabase()
    const query  = getQuery(event)

    const scope          = parseScope(query.scope as string | undefined)
    const explicitOffice = (query.officeId as string | undefined)?.trim() || null

    // ── Resolve actor (org_id from session) ──────────────────────────────────
    const actor = await resolveActorContextWithOffices(event, supabase)

    // ── Determine the office filter set ──────────────────────────────────────
    // An explicit officeId param takes precedence (used by the route builder
    // when the employee selects a specific office from the UI).
    const targetOfficeIds: string[] =
      explicitOffice
        ? [explicitOffice]
        : actor.officeIds          // session-derived list for LOCAL scope

    // ── Build stages query ────────────────────────────────────────────────────
    let stagesQuery = supabase
      .from('stages')
      .select('*')
      .eq('org_id', actor.orgId)
      .order('step_number', { ascending: true })

    if (scope === 'GLOBAL') {
      // Big Picture: return every stage in the organisation
      // (global templates + all local templates from all branches)
      // No additional filter beyond org_id
    } else {
      // LOCAL: global templates + local templates for the employee's offices
      if (targetOfficeIds.length === 0) {
        // No assigned offices — return global templates only
        stagesQuery = stagesQuery.is('office_id', null)
      } else if (targetOfficeIds.length === 1) {
        // Single office — global OR that specific office
        stagesQuery = stagesQuery.or(
          `office_id.is.null,office_id.eq.${targetOfficeIds[0]}`,
        )
      } else {
        // Multiple offices — global OR any of the employee's offices
        const officeList = targetOfficeIds.join(',')
        stagesQuery = stagesQuery.or(
          `office_id.is.null,office_id.in.(${officeList})`,
        )
      }
    }

    const { data: stages, error: stagesError } = await stagesQuery

    if (stagesError) {
      throw createError({
        statusCode: 500,
        message: stagesError.message || 'Error fetching stages',
      })
    }

    // ── Fetch workflow steps for all returned stages ───────────────────────
    const stageIds = (stages ?? []).map((s: any) => s.stage_id)
    let stepRows: any[] = []

    if (stageIds.length > 0) {
      const { data: steps, error: stepsError } = await supabase
        .from('stage_steps')
        .select('stage_id, office_id, step_number')
        .in('stage_id', stageIds)
        .order('step_number', { ascending: true })

      if (stepsError) {
        throw createError({
          statusCode: 500,
          message: stepsError.message || 'Error fetching stage steps',
        })
      }

      stepRows = steps ?? []
    }

    // ── Resolve office names for stages (for scope label) ─────────────────
    const localOfficeIds = [...new Set(
      (stages ?? []).map((s: any) => s.office_id).filter(Boolean),
    )]
    let officeNameById: Record<string, string> = {}

    if (localOfficeIds.length > 0) {
      const { data: officeRows } = await supabase
        .from('offices')
        .select('id, name, code')
        .in('id', localOfficeIds)

      officeNameById = (officeRows ?? []).reduce((acc: Record<string, string>, o: any) => {
        acc[String(o.id)] = o.code ? `${o.name} (${o.code})` : o.name
        return acc
      }, {})
    }

    // ── Enrich stages ─────────────────────────────────────────────────────
    const enrichedStages = (stages ?? []).map((stage: any) => ({
      ...stage,
      scope:         stage.office_id == null ? 'global' : 'local',
      office_name:   stage.office_id ? (officeNameById[String(stage.office_id)] ?? null) : null,
      workflow_items: stepRows.filter(
        (item) => String(item.stage_id) === String(stage.stage_id),
      ),
    }))

    return {
      success:   true,
      scope,
      org_id:    actor.orgId,
      total:     enrichedStages.length,
      data:      enrichedStages,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message:    error.message    || 'Internal Server Error',
    })
  }
})
