import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)
    const { stage_id, id, name, step_number } = body

    const targetId = stage_id || id

    if (!targetId) {
      throw createError({
        statusCode: 400,
        message: 'stage_id or id is required to update a stage',
      })
    }

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (step_number !== undefined) updateData.step_number = step_number

    const { data, error } = await client
      .from('stages')
      .update(updateData)
      .eq('stage_id', targetId)
      .select('*')
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Error updating stage',
      })
    }

    return {
      success: true,
      message: 'Stage updated successfully',
      data
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }
})
