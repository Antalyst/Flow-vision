import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseServiceRole(event)

  try {
    const { data: accountTypes, error } = await client
      .from('account_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return accountTypes;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Error fetching account types',
    });
  }
});
