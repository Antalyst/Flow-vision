import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

/**
 * GET /api/desks
 *
 * Lists desks visible to the caller.
 *   - client: every desk in the organisation (optionally filtered by ?office_id=)
 *   - employee / employee_sub_user: only desks belonging to their own office(s)
 *
 * Query:
 *   office_id?  UUID  — narrow to one office (still org/office-scope checked)
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (!['client', 'employee', 'employee_sub_user'].includes(actor.userRole)) {
    throw createError({ statusCode: 403, message: 'You do not have permission to view desks.' })
  }

  const query = getQuery(event)
  const requestedOfficeId = query.office_id ? String(query.office_id).trim() : null

  if (requestedOfficeId && (actor.userRole === 'employee' || actor.userRole === 'employee_sub_user')) {
    if (!actor.officeIds.includes(requestedOfficeId)) {
      throw createError({
        statusCode: 403,
        message: 'You can only manage desks in your assigned office.',
        data: { code: 'UNAUTHORIZED_DESK' },
      })
    }
  }

  let desksQuery = client
    .from('desks')
    .select('*, assigned_user:users(user_id, full_name), office:offices(id, name)')
    .eq('org_id', actor.orgId)
    .order('created_at', { ascending: false })

  if (requestedOfficeId) {
    desksQuery = desksQuery.eq('office_id', requestedOfficeId)
  } else if (actor.userRole === 'employee' || actor.userRole === 'employee_sub_user') {
    if (actor.officeIds.length === 0) {
      return { success: true, data: [] }
    }
    desksQuery = desksQuery.in('office_id', actor.officeIds)
  }

  const { data, error } = await desksQuery

  if (error) {
    throw createError({ statusCode: 500, message: 'We could not load desks. Please try again.' })
  }

  return { success: true, data: data ?? [] }
})
