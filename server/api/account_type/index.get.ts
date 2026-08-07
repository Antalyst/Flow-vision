import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  )

  try {
    const db = event.context.db;
    const [rows] = await db.query('SELECT * FROM account_types');
    
    const { data: accountTypes, error } = await client
      .from('account_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return rows;
    return accountTypes;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Error fetching account types',
    });
  }
});