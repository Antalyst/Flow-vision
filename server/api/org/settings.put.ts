import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { org_id, enable_employee_validation } = body

  const client = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  if (!org_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Organization ID is required',
    })
  }

  try {
    const { data: org, error } = await client
      .from('org')
      .update({ enable_employee_validation })
      .eq('org_id', org_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return org
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Error updating organization settings',
    })
  }
})
