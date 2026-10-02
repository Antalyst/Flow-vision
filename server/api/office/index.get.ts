import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)
    const query = getQuery(event)
    // Only the caller's own organization's offices.
    const org_id = requireOrgAuth(event, undefined, query.orgId).orgId

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
