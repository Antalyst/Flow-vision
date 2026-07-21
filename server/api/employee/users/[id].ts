import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { hash } from 'bcrypt-ts'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = await serverSupabaseClient(event)
  const method = getMethod(event)
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing user ID parameter' })
  }

  // Resolve actor context
  const actor = await resolveActorContextWithOffices(event, client)
  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const adminClient = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  // Fetch target user to verify they belong to same org and are sub-users
  const { data: targetUser, error: fetchError } = await adminClient
    .from('users')
    .select('*')
    .eq('user_id', id)
    .single()

  if (fetchError || !targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Tenant Boundary Check
  if (targetUser.org_id !== actor.orgId || targetUser.role !== 'employee_sub_user') {
    throw createError({ statusCode: 403, message: 'Forbidden: Tenant boundary mismatch' })
  }

  if (method === 'PUT') {
    const body = await readBody(event)
    const { full_name, email, office_id, password } = body

    if (!full_name || !email || !office_id) {
      throw createError({ statusCode: 400, message: 'Missing fields: full_name, email, office_id' })
    }

    const updatePayload: any = {
      full_name,
      email,
      office_id
    }

    if (password && password.trim() !== '') {
      updatePayload.password = await hash(password, 10)
    }

    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update(updatePayload)
      .eq('user_id', id)
      .select('user_id, email, full_name, role, status, office_id, created_at')
      .single()

    if (updateError) {
      throw createError({ statusCode: 500, message: `Failed to update user: ${updateError.message}` })
    }

    return { success: true, data: updatedUser }
  }

  if (method === 'DELETE') {
    const { error: deleteError } = await adminClient
      .from('users')
      .delete()
      .eq('user_id', id)

    if (deleteError) {
      throw createError({ statusCode: 500, message: `Failed to delete user: ${deleteError.message}` })
    }

    return { success: true, message: 'User deleted successfully' }
  }

  throw createError({ statusCode: 405, message: 'Method Not Allowed' })
})
