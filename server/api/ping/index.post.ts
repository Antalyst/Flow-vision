import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const client = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  )

  const { data, error } = await client
    .from('users')
    .select('user_id, email, full_name, role')

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Error: ${error.message}`,
    })
  }

  return {
    success: true,
    total_users: data.length,
    users: data
  }
})