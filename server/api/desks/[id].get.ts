import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'

/**
 * GET /api/desks/:id
 *
 * Single-desk lookup, org-scoped. Used by the document preview drawer to
 * resolve documents.current_desk_id into a displayable name/office/handler —
 * any authenticated org member may read it (viewing where a document
 * currently sits is not a privileged operation the way editing a desk is).
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  const deskId = String(getRouterParam(event, 'id') ?? '').trim()
  if (!deskId) throw createError({ statusCode: 400, message: 'Please select a desk.' })

  const { data: desk, error } = await client
    .from('desks')
    .select('*, assigned_user:users(user_id, full_name), office:offices(id, name)')
    .eq('id', deskId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, message: 'We could not load this desk. Please try again.' })
  if (!desk || String(desk.org_id) !== actor.orgId) {
    throw createError({ statusCode: 404, message: 'This desk could not be found.' })
  }

  return { success: true, data: desk }
})
