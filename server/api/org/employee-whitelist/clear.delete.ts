import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const org_id = requireOrgAuth(event, ['client'], query.org_id).orgId

  const client = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  if (!org_id) {
    throw createError({ statusCode: 400, statusMessage: 'Organization ID is required' })
  }

  try {
    const { error } = await client
      .from('org_employee_whitelists')
      .delete()
      .eq('org_id', org_id)

    if (error) {
      throw error
    }

    return { success: true, message: 'Whitelist cleared successfully' }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Error clearing whitelist',
    })
  }
})
