/**
 * GET /api/employee/my-offices
 * Returns offices strictly scoped to the authenticated employee:
 *   - filtered by their org_id (cross-tenant isolation)
 *   - filtered by their user_id as assigned_user (personal scope)
 *
 * Query params:
 *   orgId   – the employee's org_id
 *   userId  – the employee's user_id
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const orgId  = query.orgId  as string | undefined
  const userId = query.userId as string | undefined

  if (!orgId || !userId) {
    throw createError({
      statusCode: 400,
      message: 'orgId and userId query parameters are required',
    })
  }

  const client = useServerSupabase()

  const { data, error } = await client
    .from('offices')
    .select('*')
    .eq('org_id', orgId)
    .eq('assigned_user', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch employee offices',
    })
  }

  return { success: true, data: data ?? [] }
})
