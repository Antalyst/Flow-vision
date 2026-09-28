import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { hash } from 'bcrypt-ts'
import { createClient } from '@supabase/supabase-js'
import { resolveOwnedOfficeId, generateOfficeCode } from '~~/server/utils/employeeProvisioning'

const CREATABLE_ROLES = ['employee_sub_user', 'messenger'] as const
type CreatableRole = typeof CREATABLE_ROLES[number]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const { email, password, full_name, role, desk_name } = body
  const targetRole: CreatableRole = (CREATABLE_ROLES as readonly string[]).includes(role) ? role : 'employee_sub_user'

  if (!email || !password || !full_name) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: email, password, full_name',
    })
  }
  if (String(password).length < 8) {
    throw createError({ statusCode: 400, message: 'Password must be at least 8 characters' })
  }

  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees can create staff or messenger accounts' })
  }

  const adminClient = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  const normalizedEmail = String(email).trim().toLowerCase()
  const { data: existing } = await adminClient
    .from('users')
    .select('user_id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, message: 'An account with this email address already exists' })
  }

  // Inherit the creating employee's acctype_id
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

  // Both staff and messengers are scoped to the creating employee's own office —
  // each 'employee' ("Office") account owns exactly one office (named via the
  // first-login claim flow), so anyone they add belongs to that same office.
  // This only sets who they belong to / who can manage them — it does not
  // restrict where a messenger can actually pick up or drop off (that's
  // assignment-based, not office-based, so they can still work any office
  // once assigned to a document there).
  const officeId = await resolveOwnedOfficeId(adminClient, actor.orgId, actor.userId)
  if (!officeId) {
    throw createError({
      statusCode: 409,
      message: 'You need to name your office before adding staff or messengers. Reload the page to set it up.',
    })
  }

  const hashedPassword = await hash(password, 10)

  const { data: newUser, error } = await adminClient
    .from('users')
    .insert({
      email: normalizedEmail,
      full_name,
      role: targetRole,
      acctype_id: parentUser.acctype_id,
      status: 1,
      password: hashedPassword,
      org_id: actor.orgId,
      office_id: officeId,
    })
    .select('user_id, email, full_name, role, status, office_id, created_at, offices!users_office_id_fkey(name, code)')
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to create account: ${error.message}`,
    })
  }

  // Staff automatically get their own desk under the office — this is what
  // shows up in Staff Desks and what a local route can use as a checkpoint.
  // Auto-creating it here means there's no separate "register a desk"
  // step required before staff are usable in a local route.
  if (targetRole === 'employee_sub_user') {
    const deskName = String(desk_name ?? '').trim() || `${newUser.full_name}'s Desk`
    const { error: deskError } = await adminClient
      .from('offices')
      .insert({
        name: deskName,
        org_id: actor.orgId,
        parent_office_id: officeId,
        assigned_user: newUser.user_id,
        code: generateOfficeCode(),
        created_by: actor.userId,
      })

    if (deskError) {
      console.error('[employee/users] Failed to auto-create staff desk:', deskError.message)
    }
  }

  return { success: true, data: newUser }
})
