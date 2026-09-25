import { compare, hash } from 'bcrypt-ts'
import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { resolveActorContext } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'employee_sub_user') {
    throw createError({ statusCode: 403, message: 'Only staff accounts can use this endpoint' })
  }

  const body = await readBody(event)
  const { full_name, email, current_password, new_password } = body

  const admin = createClient(config.public.supabaseUrl, config.supabaseServiceKey)
  const updatePayload: Record<string, unknown> = {}

  if (full_name?.trim()) updatePayload.full_name = full_name.trim()

  if (email?.trim()) {
    const normalizedEmail = email.trim().toLowerCase()
    const { data: existing } = await admin.from('users').select('user_id').eq('email', normalizedEmail).maybeSingle()
    if (existing && String(existing.user_id) !== String(actor.userId)) {
      throw createError({ statusCode: 409, message: 'An account with this email address already exists' })
    }
    updatePayload.email = normalizedEmail
  }

  if (new_password?.trim()) {
    if (!current_password?.trim()) {
      throw createError({ statusCode: 400, message: 'Current password is required to set a new password' })
    }
    if (String(new_password).length < 8) {
      throw createError({ statusCode: 400, message: 'New password must be at least 8 characters' })
    }

    const { data: row } = await admin.from('users').select('password').eq('user_id', actor.userId).single()
    if (!row) throw createError({ statusCode: 404, message: 'Account not found' })

    const valid = await compare(current_password, row.password)
    if (!valid) throw createError({ statusCode: 401, message: 'Current password is incorrect' })

    updatePayload.password = await hash(new_password, 10)
  }

  if (!Object.keys(updatePayload).length) {
    throw createError({ statusCode: 400, message: 'Nothing to update' })
  }

  const { data: updated, error } = await admin
    .from('users')
    .update(updatePayload)
    .eq('user_id', actor.userId)
    .select('user_id, full_name, email')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message || 'Failed to update profile' })

  return { success: true, data: updated }
})
