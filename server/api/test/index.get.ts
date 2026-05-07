// server/api/test/index.get.ts
import { createClient } from '@supabase/supabase-js'

export default eventHandler(async (event) => {
  const config = useRuntimeConfig()

  const client = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  )

  const { data, error } = await client
    .from('account_types')
    .select('*')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { sensitiveData: data }
})