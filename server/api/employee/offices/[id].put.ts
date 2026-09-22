import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees can edit tables/desks' })
  }

  const deskId = getRouterParam(event, 'id')
  if (!deskId) {
    throw createError({ statusCode: 400, message: 'Desk id is required' })
  }

  const body = await readBody(event)
  const { name, code, assigned_user } = body

  if (!name || !code) {
    throw createError({ statusCode: 400, message: 'Missing required fields: name, code' })
  }

  // Ownership check: the desk must be a sub-office of one of the actor's own offices.
  const { data: desk, error: fetchErr } = await client
    .from('offices')
    .select('id, parent_office_id, org_id, assigned_user')
    .eq('id', deskId)
    .maybeSingle()

  if (fetchErr) {
    throw createError({ statusCode: 500, message: fetchErr.message })
  }
  if (!desk || !desk.parent_office_id || !actor.officeIds.includes(String(desk.parent_office_id))) {
    throw createError({ statusCode: 403, message: 'You do not have permission to edit this desk' })
  }

  // Enforce code uniqueness within the org (excluding this desk itself)
  const { data: existing } = await client
    .from('offices')
    .select('id')
    .eq('org_id', desk.org_id)
    .eq('code', code)
    .neq('id', deskId)
    .maybeSingle()

  if (existing) {
    throw createError({
      statusCode: 409,
      message: `The office code '${code}' is already registered in this organization.`,
    })
  }

  const { data: updated, error: updateErr } = await client
    .from('offices')
    .update({ name, code, assigned_user: assigned_user || null })
    .eq('id', deskId)
    .select()
    .single()

  if (updateErr) {
    throw createError({ statusCode: 500, message: updateErr.message || 'Failed to update desk' })
  }

  // Keep users.office_id in sync with the new assignment.
  const previousAssignee = desk.assigned_user ? String(desk.assigned_user) : null
  const nextAssignee = assigned_user ? String(assigned_user) : null

  if (previousAssignee && previousAssignee !== nextAssignee) {
    await client.from('users').update({ office_id: null }).eq('user_id', previousAssignee)
  }
  if (nextAssignee) {
    await client.from('users').update({ office_id: deskId }).eq('user_id', nextAssignee)
  }

  return { success: true, data: updated }
})
