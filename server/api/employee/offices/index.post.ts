import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  const { name, code, assigned_user } = body
  
  if (!name || !code) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: name, code',
    })
  }

  const client = await serverSupabaseClient(event)
  
  // Resolve actor context to get orgId and assigned offices
  const actor = await resolveActorContextWithOffices(event, client)
  
  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees can register new tables/desks' })
  }

  if (actor.officeIds.length === 0) {
    throw createError({ statusCode: 403, message: 'Forbidden: You do not have an assigned office node context' })
  }

  // Use the employee's first assigned office as the parent office (primary context)
  const parentOfficeId = actor.officeIds[0]

  const adminClient = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  // Enforce uniqueness of custom code or auto-generate
  // Check if code is already taken in the same organization
  const { data: existing } = await adminClient
    .from('offices')
    .select('id')
    .eq('org_id', actor.orgId)
    .eq('code', code)
    .maybeSingle()

  if (existing) {
    throw createError({
      statusCode: 409,
      message: `The office code '${code}' is already registered in this organization.`,
    })
  }

  const { data: newOffice, error } = await adminClient
    .from('offices')
    .insert({
      name,
      code,
      org_id: actor.orgId,
      parent_office_id: parentOfficeId,
      assigned_user: assigned_user || null,
      created_by: actor.fullName || actor.userId
    })
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to register table/desk: ${error.message}`,
    })
  }

  // If assigned_user is provided, also set their office_id in users table
  if (assigned_user) {
    await adminClient
      .from('users')
      .update({ office_id: newOffice.id })
      .eq('user_id', assigned_user)
  }

  return { success: true, data: newOffice }
})
