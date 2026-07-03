import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { hash } from 'bcrypt-ts'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  const { email, password, full_name, office_id } = body
  
  if (!email || !password || !full_name || !office_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: email, password, full_name, office_id',
    })
  }

  const client = await serverSupabaseClient(event)
  
  // Resolve actor to get orgId and officeIds they are assigned to
  const actor = await resolveActorContextWithOffices(event, client)
  
  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees can create internal office users' })
  }

  const adminClient = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  // 1. Fetch parent employee's acctype_id to inherit
  const { data: parentUser, error: parentError } = await adminClient
    .from('users')
    .select('acctype_id')
    .eq('user_id', actor.userId)
    .single()

  if (parentError || !parentUser) {
    throw createError({
      statusCode: 500,
      message: `Failed to resolve parent user details: ${parentError?.message}`,
    })
  }

  // 2. Hash password and insert sub-user
  const hashedPassword = await hash(password, 10)

  const { data: newUser, error } = await adminClient
    .from('users')
    .insert({
      email: email,
      full_name: full_name,
      role: 'employee_sub_user',
      acctype_id: parentUser.acctype_id,
      status: 1,
      password: hashedPassword,
      org_id: actor.orgId,
      office_id: office_id
    })
    .select('user_id, email, full_name, role, status, office_id, created_at')
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to create internal user: ${error.message}`,
    })
  }

  return { success: true, data: newUser }
})
