import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  const { name, parent_office_id, assigned_user } = body
  
  if (!name || !parent_office_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: name, parent_office_id',
    })
  }

  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)
  
  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees can create sub-office tables' })
  }

  // Validate the parent_office_id belongs to the employee
  if (!actor.officeIds.includes(String(parent_office_id))) {
      throw createError({ statusCode: 403, message: 'Forbidden: parent_office_id is not assigned to you' })
  }

  const adminClient = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  const { data: newOffice, error } = await adminClient
    .from('offices')
    .insert({
      name,
      org_id: actor.orgId,
      parent_office_id: parent_office_id,
      assigned_user: assigned_user || actor.userId // Default to the creator if not specified
    })
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to create office table: ${error.message}`,
    })
  }

  // Also verify/update the assigned user's office_id if an internal user was selected
  if (assigned_user) {
     await adminClient.from('users').update({ office_id: newOffice.id }).eq('user_id', assigned_user)
  }

  return { success: true, data: newOffice }
})
