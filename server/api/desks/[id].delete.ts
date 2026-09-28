import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { canManageDesk, getDeskWithOffice } from '~~/server/utils/deskAccess'
import { logActivitySafe } from '~~/server/utils/activityLog'

/**
 * DELETE /api/desks/:id
 *
 * A desk that has ever been a document's location (current_desk_id,
 * document_tracking_events.desk_id, document_issues.reported_by_desk_id)
 * cannot be deleted outright — same historical-record principle already
 * used for offices (see server/api/office/index.delete.ts). Deactivate it
 * instead (PUT is_active=false) so its history stays intact.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (!['client', 'employee', 'employee_sub_user'].includes(actor.userRole)) {
    throw createError({ statusCode: 403, message: 'You do not have permission to delete desks.' })
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

  const { count: activeDocCount, error: docCheckErr } = await client
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('current_desk_id', deskId)

  if (docCheckErr) {
    throw createError({ statusCode: 500, message: 'We could not check this desk. Please try again.' })
  }

  if ((activeDocCount ?? 0) > 0) {
    throw createError({
      statusCode: 409,
      message: 'This desk currently has a document assigned to it. Transfer the document to another desk before deleting it, or deactivate this desk instead.',
      data: { code: 'DESK_IN_USE' },
    })
  }

  const { error: deleteErr } = await client.from('desks').delete().eq('id', deskId)

  if (deleteErr) {
    if (deleteErr.code === '23503') {
      throw createError({
        statusCode: 409,
        message: 'This desk has document history and cannot be deleted. Deactivate it instead.',
        data: { code: 'DESK_IN_USE' },
      })
    }
    throw createError({ statusCode: 500, message: 'We could not delete this desk. Please try again.' })
  }

  const message = `${actor.fullName ?? 'An office user'} deleted desk "${desk.name}".`
  await logActivitySafe({
    orgId: actor.orgId,
    officeId: desk.office_id,
    userId: actor.userId,
    userName: actor.fullName,
    actorName: actor.fullName,
    actionType: 'system',
    details: message,
    message,
    metadata: { desk_id: deskId },
  }, client)

  return { success: true, message: 'Desk deleted successfully.' }
})
