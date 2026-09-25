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
  const OFFICE_COLUMNS = 'user_id, email, full_name, role, status, office_id, created_at, offices!users_office_id_fkey(name, code)'

  // Messengers are org-wide (not desk-bound). Staff are scoped to THIS employee's
  // own office only — an employee never sees another office's staff.
  const messengersQuery = client
    .from('users')
    .select(OFFICE_COLUMNS)
    .eq('org_id', actor.orgId)
    .eq('role', 'messenger')

  const staffQuery = officeId
    ? client
        .from('users')
        .select(OFFICE_COLUMNS)
        .eq('org_id', actor.orgId)
        .eq('role', 'employee_sub_user')
        .eq('office_id', officeId)
    : Promise.resolve({ data: [] as any[], error: null })

  const [{ data: messengers, error: messengersError }, { data: staff, error: staffError }] = await Promise.all([
    messengersQuery,
    staffQuery,
  ])

  if (messengersError || staffError) {
    throw createError({
      statusCode: 500,
      message: (messengersError || staffError)?.message || 'Failed to fetch staff and messenger accounts',
    })
  }

  const combined = [...(staff ?? []), ...(messengers ?? [])].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return { success: true, data: combined }
})
