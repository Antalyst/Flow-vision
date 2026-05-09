import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  try {
<<<<<<< HEAD
    const db = event.context.db;
    const [rows] = await db.query('SELECT * FROM account_types');
    return rows;
  } catch (error) {

    console.error('DATABASE ERROR:', error); 
    
=======
    const { data: accountTypes, error } = await client
      .from('account_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return accountTypes;
  } catch (error: any) {
>>>>>>> 3c0c7fff94b7d8972c6af2b25fd3807c7797dfb7
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Error fetching account types',
    });
  }
});