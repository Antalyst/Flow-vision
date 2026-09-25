import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'

/**
 * GET /api/staff/my-office
 *
 * A staff (employee_sub_user) account belongs to exactly one office via
 * users.office_id (set once, at creation, from the employer's own office).
 * This is a direct, single-purpose lookup — unlike /api/employee/my-offices
 * (built for full 'employee' accounts, which can own multiple offices via
 * offices.assigned_user), there's no OR-query/fallback ambiguity here.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'employee_sub_user') {
    throw createError({ statusCode: 403, message: 'Only staff accounts can use this endpoint' })
  }

  const { data: userRow, error: userError } = await client
    .from('users')
    .select('office_id')
    .eq('user_id', actor.userId)
    .maybeSingle()

  if (userError) throw createError({ statusCode: 500, message: userError.message })

  if (!userRow?.office_id) {
    return { success: true, data: null }
  }

  const { data: office, error: officeError } = await client
    .from('offices')
    .select('id, name, code')
    .eq('id', userRow.office_id)
    .eq('org_id', actor.orgId)
    .maybeSingle()

  if (officeError) throw createError({ statusCode: 500, message: officeError.message })

  return { success: true, data: office ?? null }
})
