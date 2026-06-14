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

    const { data: documents, error } = await client
      .from('documents')
      .select('*')
      .eq('org_id', org_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Error fetching documents',
      })
    }

    const rows = documents || []

    // Enrich with uploader display names without relying on FK relationship naming.
    const uploaderIds = Array.from(
      new Set(rows.map((doc) => doc.user_id).filter((id) => id != null))
    )

    let nameById: Record<string, string> = {}
    if (uploaderIds.length > 0) {
      const { data: users } = await client
        .from('users')
        .select('user_id, full_name')
        .in('user_id', uploaderIds)

      nameById = (users || []).reduce((acc: Record<string, string>, user) => {
        acc[String(user.user_id)] = user.full_name
        return acc
      }, {})
    }

    const enriched = rows.map((doc) => ({
      ...doc,
      uploader_name: nameById[String(doc.user_id)] || null,
    }))

    return {
      success: true,
      data: enriched,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }
})
