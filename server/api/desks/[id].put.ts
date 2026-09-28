import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { canManageDesk, getDeskWithOffice } from '~~/server/utils/deskAccess'
import { logActivitySafe } from '~~/server/utils/activityLog'

/**
 * PUT /api/desks/:id
 *
 * Edits a desk: name, code, assigned staff, active/inactive.
 * Office (and therefore organisation) cannot be changed here — moving a desk
 * to a different office is a delete + recreate, to avoid silently orphaning
 * documents currently sitting at it.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (!['client', 'employee', 'employee_sub_user'].includes(actor.userRole)) {
    throw createError({ statusCode: 403, message: 'You do not have permission to edit desks.' })
  }

  const deskId = String(getRouterParam(event, 'id') ?? '').trim()
  if (!deskId) throw createError({ statusCode: 400, message: 'Please select a desk.' })

  const desk = await getDeskWithOffice(client, deskId)
  if (!desk) {
    throw createError({ statusCode: 404, message: 'This desk could not be found.', data: { code: 'DESK_NOT_FOUND' } })
  }

  if (!canManageDesk(actor, desk)) {
    throw createError({
      statusCode: 403,
      message: 'You can only manage desks in your assigned office.',
      data: { code: 'UNAUTHORIZED_DESK' },
    })
  }

  const body = await readBody(event)
  const updates: Record<string, unknown> = {}

  if (body?.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) throw createError({ statusCode: 400, message: 'Please enter a desk name.' })
    updates.name = name
  }
  if (body?.code !== undefined) {
    const code = String(body.code).trim()
    if (!code) throw createError({ statusCode: 400, message: 'Please enter a desk code.' })
    updates.code = code
  }
  if (body?.description !== undefined) {
    updates.description = body.description ? String(body.description).trim() : null
  }
  if (body?.is_active !== undefined) {
    updates.is_active = !!body.is_active
  }
  if (body?.assigned_user_id !== undefined) {
    const assignedUserId = body.assigned_user_id ? String(body.assigned_user_id).trim() : null
    if (assignedUserId) {
      const { data: staffRow, error: staffErr } = await client
        .from('users')
        .select('user_id, org_id')
        .eq('user_id', assignedUserId)
        .maybeSingle()

      if (staffErr) throw createError({ statusCode: 500, message: 'We could not check this staff member. Please try again.' })
      if (!staffRow || String(staffRow.org_id) !== actor.orgId) {
        throw createError({ statusCode: 404, message: 'We could not find this staff member.' })
      }
    }
    updates.assigned_user_id = assignedUserId
  }

  updates.updated_at = new Date().toISOString()

  const { data: updatedDesk, error: updateErr } = await client
    .from('desks')
    .update(updates)
    .eq('id', deskId)
    .select('*, assigned_user:users(user_id, full_name), office:offices(id, name)')
    .single()

  if (updateErr) {
    throw createError({ statusCode: 500, message: 'We could not save this desk. Please try again.' })
  }

  const message = `${actor.fullName ?? 'An office user'} updated desk "${desk.name}".`
  await logActivitySafe({
    orgId: actor.orgId,
    officeId: desk.office_id,
    userId: actor.userId,
    userName: actor.fullName,
    actorName: actor.fullName,
    actionType: 'system',
    details: message,
    message,
    metadata: { desk_id: deskId, changes: updates },
  }, client)

  return { success: true, message: 'Desk updated successfully.', data: updatedDesk }
})
