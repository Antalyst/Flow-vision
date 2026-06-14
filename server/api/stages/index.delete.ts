import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)
    const query = getQuery(event)
    const stage_id = query.stage_id || query.id

    if (!stage_id) {
      throw createError({
        statusCode: 400,
        message: 'stage_id or id is required to delete a stage',
      })
    }

    const { error: stepsError } = await client
      .from('stage_steps')
      .delete()
      .eq('stage_id', stage_id)

    if (stepsError) {
      console.error('[Backend Stage Error]:', stepsError)
      throw createError({
        statusCode: 500,
        message: stepsError.message || 'Error deleting stage workflow items',
      })
    }

    const { data, error } = await client
      .from('stages')
      .delete()
      .eq('stage_id', stage_id)
      .select('*')

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Error deleting stage',
      })
    }

    return {
      success: true,
      message: 'Stage deleted successfully',
      data
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }
})
