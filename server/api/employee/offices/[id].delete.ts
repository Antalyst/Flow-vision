import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees can delete tables/desks' })
  }

  const deskId = getRouterParam(event, 'id')
  if (!deskId) {
    throw createError({ statusCode: 400, message: 'Desk id is required' })
  }

  // Ownership check: the desk must be a sub-office of one of the actor's own offices.
  const { data: desk, error: fetchErr } = await client
    .from('offices')
    .select('id, parent_office_id, org_id')
    .eq('id', deskId)
    .maybeSingle()

  if (fetchErr) {
    throw createError({ statusCode: 500, message: fetchErr.message })
  }
  if (!desk || !desk.parent_office_id || !actor.officeIds.includes(String(desk.parent_office_id))) {
    throw createError({ statusCode: 403, message: 'You do not have permission to delete this desk' })
  }

  // Unassign any user still pointed at this desk so they aren't left with a dangling office_id.
  await client.from('users').update({ office_id: null }).eq('office_id', deskId)

  const { error: deleteErr } = await client.from('offices').delete().eq('id', deskId)
  if (deleteErr) {
    throw createError({ statusCode: 500, message: deleteErr.message || 'Failed to delete desk' })
  }

  return { success: true }
})
