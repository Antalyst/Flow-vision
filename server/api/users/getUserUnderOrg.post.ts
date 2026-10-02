import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async(event) => {
  try {
    const config = useRuntimeConfig()
    const body = await readBody(event);
    // Only the caller's own organization; a different org_id in the body is refused.
    const org_id = requireOrgAuth(event, undefined, body?.org_id ?? body?.orgId).orgId;

    if (org_id == null || org_id === '') {
      throw createError({
        statusCode: 400,
        message: 'org_id is required',
      });
    }

    const client = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceKey
    )

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