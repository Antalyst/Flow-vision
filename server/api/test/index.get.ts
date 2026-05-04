// server/api/test/index.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'

export default eventHandler(async (event) => {
  /* 
  // Temporarily comment this out to test the connection
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  */

  const client = serverSupabaseServiceRole(event)
  
  // Explicitly selecting all columns
  const { data, error } = await client
    .from('account_types')
    .select('*')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { sensitiveData: data }
})