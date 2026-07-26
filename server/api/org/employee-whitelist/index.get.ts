import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const org_id = query.org_id as string

  const client = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  if (!org_id) {
    throw createError({ statusCode: 400, statusMessage: 'Organization ID is required' })
  }

  try {
    const { data, error } = await client
      .from('org_employee_whitelists')
      .select('*')
      .eq('org_id', org_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Error fetching whitelist',
    })
  }
})
