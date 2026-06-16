import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {

  try {
    const body = await readBody(event);
    const inputCode = (body?.code || '').trim();

    if (!inputCode) {
      return {
        success: false,
        message: 'Organization code is required'
      }
    }

    const client = await serverSupabaseServiceRole(event)

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
});
