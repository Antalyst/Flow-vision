import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext, resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  
  // Resolve actor to get orgId and officeIds they are assigned to
  const actor = await resolveActorContextWithOffices(event, client)
  
  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees can manage internal office users' })
  }

  if (actor.officeIds.length === 0) {
     return { success: true, data: [] }
  }

  // Fetch users in the same org, role 'employee_sub_user', and belonging to one of the employee's offices
  const { data: subUsers, error } = await client
    .from('users')
    .select('user_id, email, full_name, role, status, office_id, created_at, offices(name)')
    .eq('org_id', actor.orgId)
    .eq('role', 'employee_sub_user')
    .in('office_id', actor.officeIds)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to fetch sub-users' })
  }

  return { success: true, data: subUsers ?? [] }
})
