import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)
  
  const query = getQuery(event)
  const conversationId = query.id as string

  if (!conversationId) {
    throw createError({ statusCode: 400, message: 'Missing conversation ID' })
  }

  // 1. Verify access
  const orCondition = `user_id.eq.${actor.userId}${actor.officeIds && actor.officeIds.length > 0 ? `,office_id.in.(${actor.officeIds.join(',')})` : ''}`
  
  const { data: participations, error: partErr } = await client
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .or(orCondition)
    
  if (partErr || !participations || participations.length === 0) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // 2. Fetch messages
  const { data: messages, error: msgErr } = await client
    .from('direct_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (msgErr) {
    throw createError({ statusCode: 500, message: msgErr.message })
  }

  return { success: true, data: messages }
})
