import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { generateOfficeCode } from '~~/server/utils/employeeProvisioning'

/**
 * POST /api/employee/office/claim
 *
 * First-login onboarding step for the 'employee' ("Office") role: an employee
 * account is created with no office at all (superadmin/client no longer pick
 * one on their behalf) — the employee names their own office here, which
 * creates it and makes them its assigned_user in one step. org_id is always
 * server-derived from the session, never from the request body, so the new
 * office can only ever belong to the employee's own organization.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only Office (employee) accounts can claim an office' })
  }

  const body = await readBody(event)
  const name = String(body?.name ?? '').trim()

  if (!name) {
    throw createError({ statusCode: 400, message: 'Please enter a name for your office' })
  }

  const admin = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  // Don't let an employee who already owns an office create a second one here.
  const { data: existingOwned } = await admin
    .from('offices')
    .select('id')
    .eq('org_id', actor.orgId)
    .eq('assigned_user', actor.userId)
    .maybeSingle()

  if (existingOwned) {
    throw createError({ statusCode: 409, message: 'You already have an office assigned to your account.' })
  }

  const { data: newOffice, error } = await admin
    .from('offices')
    .insert({
      name,
      org_id: actor.orgId,
      code: generateOfficeCode(),
      assigned_user: actor.userId,
      created_by: actor.userId,
    })
    .select('id, name, code')
    .single()

  if (error || !newOffice) {
    throw createError({ statusCode: 500, message: error?.message || 'Failed to create your office' })
  }

  return { success: true, data: newOffice }
})
