export default defineEventHandler(async(event) => {
  try {
    const body = await readBody(event);
    const org_id = body?.org_id ?? body?.orgId;

    if (org_id == null || org_id === '') {
      throw createError({
        statusCode: 400,
        message: 'org_id is required',
      });
    }

    const client = useServerSupabase()

    const { data, error } = await client
      .from('users')
      .select('user_id, full_name, email, role, org_id')
      .eq('org_id', org_id)
      .eq('role', 'employee')
      .order('full_name', { ascending: true })

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Failed to fetch employees',
      });
    }

    console.log('[Backend Data Check]:', data)

    return {
      success: true,
      data: data || [],
    };
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || "Internal Server Error",
    });
  }
});
