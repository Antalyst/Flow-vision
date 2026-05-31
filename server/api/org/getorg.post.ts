import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event);
  const { user_id } = body;

  const client = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  )

  if (!user_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID is required',
    });
  }

  try {
    const { data: org, error } = await client
      .from('org')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return org || null;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Error fetching organization',
    });
  }
});