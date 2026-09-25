import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { hash } from 'bcrypt-ts'
import { createClient } from '@supabase/supabase-js'
import { resolveOwnedOfficeId } from '~~/server/utils/employeeProvisioning'

const MANAGED_ROLES = ['employee_sub_user', 'messenger']

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = await serverSupabaseClient(event)
  const method = getMethod(event)
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing user ID parameter' })
  }

  const actor = await resolveActorContext(event, client)
  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const adminClient = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  // Fetch target user to verify they belong to same org and are a managed role
  const { data: targetUser, error: fetchError } = await adminClient
    .from('users')
    .select('*')
    .eq('user_id', id)
    .single()

  if (fetchError || !targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Tenant boundary check
  if (targetUser.org_id !== actor.orgId || !MANAGED_ROLES.includes(targetUser.role)) {
    throw createError({ statusCode: 403, message: 'Forbidden: Tenant boundary mismatch' })
  }

  // Staff and messengers both belong to exactly one office — an employee can
  // only manage accounts at their OWN office, never another office's.
  const ownedOfficeId = await resolveOwnedOfficeId(adminClient, actor.orgId, actor.userId)
  if (!ownedOfficeId || String(targetUser.office_id) !== String(ownedOfficeId)) {
    throw createError({ statusCode: 403, message: 'Forbidden: this account belongs to a different office' })
  }

  if (method === 'PUT') {
    const body = await readBody(event)
    const { full_name, email, password } = body

    if (!full_name || !email) {
      throw createError({ statusCode: 400, message: 'Missing fields: full_name, email' })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const { data: existing } = await adminClient
      .from('users')
      .select('user_id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing && String(existing.user_id) !== String(id)) {
      throw createError({ statusCode: 409, message: 'An account with this email address already exists' })
    }

    const updatePayload: any = {
      full_name,
      email: normalizedEmail,
    }

    if (password && password.trim() !== '') {
      if (password.trim().length < 8) {
        throw createError({ statusCode: 400, message: 'Password must be at least 8 characters' })
      }
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
    // Detach this user from any office where they're the assigned owner —
    // offices.assigned_user has no ON DELETE rule, so leaving it set blocks
    // the delete below with a foreign key violation.
    await adminClient.from('offices').update({ assigned_user: null }).eq('assigned_user', id)

    const { error: deleteError } = await adminClient
      .from('users')
      .delete()
      .eq('user_id', id)

    if (deleteError) {
      if (deleteError.code === '23503') {
        throw createError({
          statusCode: 409,
          message: `${targetUser.full_name} still has documents, activity, or reports on record and can't be permanently deleted. Suspend the account instead.`,
        })
      }
      throw createError({ statusCode: 500, message: `Failed to delete user: ${deleteError.message}` })
    }

    return { success: true, message: 'User deleted successfully' }
  }

  throw createError({ statusCode: 405, message: 'Method Not Allowed' })
})
