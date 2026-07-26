import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event);
  const { user_id, org_id } = body;

  const client = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  if (!user_id && !org_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID or Org ID is required',
    });
  }

  try {
    let query = client.from('org').select('*');
    
    if (org_id) {
      query = query.eq('org_id', org_id);
    } else {
      query = query.eq('user_id', user_id);
    }

    const { data: org, error } = await query.single();

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