import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { resolveOwnedOfficeId } from '~~/server/utils/employeeProvisioning'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees can manage staff and messenger accounts' })
  }

  const officeId = await resolveOwnedOfficeId(client, actor.orgId, actor.userId)
  if (!officeId) {
    return { success: true, data: [] }
  }

  // Both staff and messengers are scoped to THIS employee's own office — an
  // employee never sees another office's staff or messengers here. A messenger's
  // ability to actually pick up/drop off elsewhere is unaffected: that's
  // assignment-based (assigned_messenger_id), not filtered by this office_id.
  const { data, error } = await client
    .from('users')
    .select('user_id, email, full_name, role, status, office_id, created_at, offices!users_office_id_fkey(name, code)')
    .eq('org_id', actor.orgId)
    .eq('office_id', officeId)
    .in('role', ['employee_sub_user', 'messenger'])
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to fetch staff and messenger accounts' })
  }

  return { success: true, data: data ?? [] }
})
