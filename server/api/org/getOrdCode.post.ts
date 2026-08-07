import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { code } = body;
    const db = event.context.db;


    try {
      const config = useRuntimeConfig()
      const body = await readBody(event);
      const inputCode = (body?.code || '').trim();

      if (!inputCode) {
        return {
          success: false,
          message: 'Organization code is required'
        }
      }

      const client = createClient(
        config.public.supabaseUrl,
        config.supabaseServiceKey
      )

      const { data, error } = await client
        .from('org')
        .select('org_id, code, name')
        .eq('code', inputCode)
        .single()

      if (error || !data) {
        return {
          success: false,
          message: "Invalid organization code"
        }
      }

      return {
        success: true,
        rows: data
      }
    } catch (error) {
      console.error('DATABASE ERROR:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
      });
    }
  } catch (error) {
    console.error('REQUEST ERROR:', error);
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
    });
  }
});