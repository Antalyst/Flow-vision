import { serverSupabaseClient } from '#supabase/server'

interface WorkflowItemInput {
  office_id: string | number
  step_number: number
}

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)
    const { stage_name, org_id, workflow_items } = body

    if (!stage_name?.trim()) {
      throw createError({
        statusCode: 400,
        message: 'stage_name is required',
      })
    }

    if (org_id == null || org_id === '') {
      throw createError({
        statusCode: 400,
        message: 'org_id is required',
      })
    }

    if (!Array.isArray(workflow_items)) {
      throw createError({
        statusCode: 400,
        message: 'workflow_items must be an array',
      })
    }

    const { data: existingStages, error: existingError } = await client
      .from('stages')
      .select('step_number')
      .eq('org_id', org_id)
      .order('step_number', { ascending: false })
      .limit(1)

    if (existingError) {
      console.error('[Backend Stage Error]:', existingError)
      throw createError({
        statusCode: 500,
        message: existingError.message || 'Failed to resolve stage order',
      })
    }

    const nextStageStep = existingStages?.length
      ? Number(existingStages[0].step_number || 0) + 1
      : 1

    const { data: stage, error: stageError } = await client
      .from('stages')
      .insert({
        name: stage_name.trim(),
        org_id,
        step_number: nextStageStep,
      })
      .select('*')
      .single()

    if (stageError) {
      console.error('[Backend Stage Error]:', stageError)
      throw createError({
        statusCode: 500,
        message: stageError.message || 'Failed to create stage',
      })
    }

    let persistedWorkflowItems: WorkflowItemInput[] = []

    if (workflow_items.length > 0) {
      const stepRows = workflow_items.map((item: WorkflowItemInput) => ({
        stage_id: stage.stage_id,
        office_id: item.office_id,
        step_number: item.step_number,
        org_id,
      }))

      const { data: steps, error: stepsError } = await client
        .from('stage_steps')
        .insert(stepRows)
        .select('office_id, step_number, stage_id, org_id')

      if (stepsError) {
        console.error('[Backend Stage Error]:', stepsError)
        await client.from('stages').delete().eq('stage_id', stage.stage_id)
        throw createError({
          statusCode: 500,
          message: stepsError.message || 'Failed to create workflow items',
        })
      }

      persistedWorkflowItems = steps || []
    }

    return {
      status: 201,
      success: true,
      message: 'Stage created successfully',
      data: {
        stage,
        workflow_items: persistedWorkflowItems,
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('[Backend Stage Error]:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }
})
