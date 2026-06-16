import { serverSupabaseServiceRole } from '#supabase/server'
// server/api/test/index.get.ts

export default eventHandler(async (event) => {
  const client = await serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('account_types')
    .select('*')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { sensitiveData: data }
})
