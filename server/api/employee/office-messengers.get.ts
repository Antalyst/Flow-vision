import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { resolveOwnedOfficeId } from '~~/server/utils/employeeProvisioning'

/**
 * GET /api/employee/office-messengers
 *
 * Lists active messengers at the caller's own office — used to populate the
 * "Assign Messenger" picker at upload time. Works for both 'employee' (who
 * owns their office via offices.assigned_user) and 'employee_sub_user'/staff
 * (who belongs to their employer's office via users.office_id).
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'employee' && actor.userRole !== 'employee_sub_user') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  let officeId: string | null = null
  if (actor.userRole === 'employee') {
    officeId = await resolveOwnedOfficeId(client, actor.orgId, actor.userId)
  } else {
    const { data: userRow } = await client.from('users').select('office_id').eq('user_id', actor.userId).maybeSingle()
    officeId = userRow?.office_id ? String(userRow.office_id) : null
  }

  if (!officeId) {
    return { success: true, data: [] }
  }

  const { data, error } = await client
    .from('users')
    .select('user_id, full_name, email, status')
    .eq('org_id', actor.orgId)
    .eq('role', 'messenger')
    .eq('office_id', officeId)
    .order('full_name', { ascending: true })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { success: true, data: (data ?? []).filter((u) => u.status !== 0) }
})
