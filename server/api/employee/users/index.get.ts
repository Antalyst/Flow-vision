import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees can manage staff and messenger accounts' })
  }

  // Staff and messengers both operate org-wide (no home desk required), so this
  // is a plain org-scoped listing rather than filtered to the employee's own office.
  const { data, error } = await client
    .from('users')
    .select('user_id, email, full_name, role, status, office_id, created_at, offices!users_office_id_fkey(name)')
    .eq('org_id', actor.orgId)
    .in('role', ['employee_sub_user', 'messenger'])
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to fetch staff and messenger accounts' })
  }

  return { success: true, data: data ?? [] }
})
