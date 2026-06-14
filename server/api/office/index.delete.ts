import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)
    const query = getQuery(event)
    const id = query.id

    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'id is required to delete an office',
      })
    }

    const { data, error } = await client
      .from('offices')
      .delete()
      .eq('id', id)
      .select('*')

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Error deleting office',
      })
    }

    return {
      success: true,
      message: 'Office deleted successfully',
      data
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }
})
