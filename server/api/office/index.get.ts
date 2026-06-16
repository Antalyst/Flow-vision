export default defineEventHandler(async (event) => {
  try {
    const client = useServerSupabase()
    const query = getQuery(event)
    const org_id = query.orgId

    if (!org_id) {
      throw createError({
        statusCode: 400,
        message: 'orgId query parameter is required',
      })
    }

    const { data, error } = await client
      .from('offices')
      .select('*')
      .eq('org_id', org_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Error fetching offices',
      })
    }

    return {
      success: true,
      data: data || []
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }
})
