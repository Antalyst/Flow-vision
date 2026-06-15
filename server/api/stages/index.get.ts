import { serverSupabaseClient } from '#supabase/server'

/**
 * GET /api/stages
 *
 * Returns route templates visible to the caller, respecting the Global/Local
 * scope discriminator introduced by the mini-office architecture:
 *
 *   Global stages  (office_id IS NULL):  created by client admins; visible to
 *                                        every member of the organisation.
 *
 *   Local stages   (office_id IS NOT NULL): created by employees for their own
 *                  sub-office; only returned when officeId param is provided
 *                  and matches stages.office_id.
 *
 * Query params:
 *   orgId     string  required — organisation scope
 *   officeId  string  optional — if provided, returns global + this office's local routes
 *   scope     string  optional — 'global' | 'local' | 'all' (default 'all')
 */
export default defineEventHandler(async (event) => {
  try {
    const client  = await serverSupabaseClient(event)
    const query   = getQuery(event)
    const org_id  = query.orgId   as string | undefined
    const officeId = query.officeId as string | undefined
    const scope   = (query.scope  as string | undefined) ?? 'all'

    if (!org_id) {
      throw createError({ statusCode: 400, message: 'orgId query parameter is required' })
    }

    // ── Build stages query based on scope ──────────────────────────────
    let stagesQuery = client
      .from('stages')
      .select('*')
      .eq('org_id', org_id)
      .order('step_number', { ascending: true })

    if (scope === 'global') {
      // Only global route templates (office_id IS NULL)
      stagesQuery = stagesQuery.is('office_id', null)
    } else if (scope === 'local' && officeId) {
      // Only local templates for a specific office
      stagesQuery = stagesQuery.eq('office_id', String(officeId))
    } else if (officeId) {
      // Default 'all': global + local for the given office
      // Supabase OR: office_id IS NULL OR office_id = officeId (UUID string)
      stagesQuery = stagesQuery.or(`office_id.is.null,office_id.eq.${String(officeId)}`)
    }
    // If no officeId and scope='all': returns everything for the org (admin view)

    const { data: stages, error: stagesError } = await stagesQuery

    if (stagesError) {
      throw createError({ statusCode: 500, message: stagesError.message || 'Error fetching stages' })
    }

    // ── Fetch all workflow steps for these stages ──────────────────────
    const stageIds = (stages ?? []).map((s: any) => s.stage_id)
    let stepRows: any[] = []

    if (stageIds.length > 0) {
      const { data: steps, error: stepsError } = await client
        .from('stage_steps')
        .select('stage_id, office_id, step_number')
        .in('stage_id', stageIds)
        .order('step_number', { ascending: true })

      if (stepsError) {
        throw createError({ statusCode: 500, message: stepsError.message || 'Error fetching stage workflow items' })
      }

      stepRows = steps ?? []
    }

    // ── Enrich each stage with its workflow steps and scope label ──────
    const enrichedStages = (stages ?? []).map((stage: any) => ({
      ...stage,
      scope: stage.office_id == null ? 'global' : 'local',
      workflow_items: stepRows.filter(
        (item) => String(item.stage_id) === String(stage.stage_id)
      ),
    }))

    return { success: true, data: enrichedStages }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }
})
