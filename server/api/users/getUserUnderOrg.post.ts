import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const body = await readBody(event);
    const { orgId } = body;

    if (!orgId) {
      throw createError({
        statusCode: 400,
        message: "orgId is required",
      });
    }

    const client = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceKey
    )

    const { data, error } = await client
      .from('users')
      .select('user_id, full_name, email, role, org_id')
      .eq('org_id', orgId)
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