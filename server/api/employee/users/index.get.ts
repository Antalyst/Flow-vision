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
    // offices!users_office_id_fkey disambiguates the embed: `users` and `offices` are
    // connected by TWO separate FKs (offices.assigned_user -> users.user_id, AND
    // users.office_id -> offices.id), so an unqualified `offices(name)` throws
    // PGRST201 "more than one relationship was found". This is a pre-existing schema
    // condition, not something introduced by the Liaison work (which only ever
    // UPDATEs users.office_id values — it never touched either FK constraint).
    .select('user_id, email, full_name, role, status, office_id, created_at, offices!users_office_id_fkey(name)')
    .eq('org_id', actor.orgId)
    .eq('role', 'employee_sub_user')
    .in('office_id', actor.officeIds)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to fetch sub-users' })
  }

  return { success: true, data: subUsers ?? [] }
})
