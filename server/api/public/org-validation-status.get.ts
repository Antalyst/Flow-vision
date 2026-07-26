import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const code = query.code as string

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Organization code is required' })
  }

  const client = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  try {
    const { data: orgData, error: orgError } = await client
      .from('org')
      .select('enable_employee_validation')
      .eq('code', code)
      .single()

    if (orgError) {
      // If org not found, return false instead of error to not leak validation flow prematurely
      if (orgError.code === 'PGRST116') {
         return { enable_employee_validation: false }
      }
      throw orgError
    }

    return { enable_employee_validation: !!orgData?.enable_employee_validation }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Error checking organization validation status',
    })
  }
})
