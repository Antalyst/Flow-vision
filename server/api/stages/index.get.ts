import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)
    const query = getQuery(event)
    const org_id = query.orgId

    if (!org_id) {
      throw createError({
        statusCode: 400,
        message: 'orgId query parameter is required',
      })
    }

    const { data: stages, error: stagesError } = await client
      .from('stages')
      .select('*')
      .eq('org_id', org_id)
      .order('step_number', { ascending: true })

    if (stagesError) {
      throw createError({
        statusCode: 500,
        message: stagesError.message || 'Error fetching stages',
      })
    }

    const { data: stepRows, error: stepsError } = await client
      .from('stage_steps')
      .select('stage_id, office_id, step_number')
      .eq('org_id', org_id)
      .order('step_number', { ascending: true })

    if (stepsError) {
      console.error('[Backend Stage Error]:', stepsError)
      throw createError({
        statusCode: 500,
        message: stepsError.message || 'Error fetching stage workflow items',
      })
    }

    const enrichedStages = (stages || []).map((stage) => ({
      ...stage,
      workflow_items: (stepRows || []).filter(
        (item) => String(item.stage_id) === String(stage.stage_id)
      ),
    }))

    return {
      success: true,
      data: enrichedStages,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }
})
