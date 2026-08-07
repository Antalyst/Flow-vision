import { serverSupabaseClient } from '#supabase/server'

/**
 * GET /api/messenger/history
 *
 * Returns a chronological log of document interactions (pickups, dropoffs)
 * performed by the currently authenticated messenger.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actorId = getCookie(event, 'user_session')
  
  const actorRole = getCookie(event, 'user_role')

  if (!actorId) throw createError({ statusCode: 401, message: 'Authentication required' })
  if (actorRole !== 'messenger') {
    throw createError({ statusCode: 403, message: 'Only messengers can view transaction history' })
  }

  // Ensure the messenger belongs to an organisation
  const { data: actorRow } = await client
    .from('users')
    .select('org_id')
    .eq('user_id', actorId)
    .single()

  if (!actorRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Messenger account has no organisation assigned' })
  }

  const { data: events, error } = await client
    .from('document_tracking_events')
    .select(`
      id,
      status,
      office_name,
      notes,
      created_at,
      document_id
    `)
    .eq('actor_id', actorId)
    .in('status', ['PICKED_UP', 'ARRIVED_AT_OFFICE', 'COMPLETED', 'DISCREPANCY_REPORTED'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const documentIds = [...new Set((events || []).map(e => e.document_id))]
  let docMap = new Map()

  if (documentIds.length > 0) {
    const { data: docs } = await client
      .from('documents')
      .select('id, title, qr_code_data')
      .in('id', documentIds)

    docMap = new Map((docs || []).map(d => [d.id, d]))
  }

  // Format the events for the frontend
  const formattedEvents = (events || []).map((ev: any) => ({
    id: ev.id,
    status: ev.status,
    office_name: ev.office_name,
    notes: ev.notes,
    created_at: ev.created_at,
    document: docMap.get(ev.document_id) || null
  }))

  return {
    success: true,
    data: formattedEvents
  }
})
