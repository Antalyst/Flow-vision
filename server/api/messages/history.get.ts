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
  const participantIds = actor.userRole === 'client' ? [actor.userId] : (actor.officeIds.length > 0 ? actor.officeIds : [actor.userId])
  
  const { data: participations, error: partErr } = await client
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .or(`user_id.in.(${participantIds.join(',')}),office_id.in.(${participantIds.join(',')})`)
    
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

  // 3. Mark unread messages as read
  const actorId = actor.userRole === 'client' ? actor.userId : (actor.officeIds[0] || actor.userId)
  const unreadMsgs = (messages || []).filter(m => {
    const rb = m.read_by || []
    const isSender = m.sender_user_id === actorId || m.sender_office_id === actorId
    return !isSender && !rb.includes(actorId)
  })

  if (unreadMsgs.length > 0) {
    // Fire and forget update
    Promise.all(unreadMsgs.map(m => {
      const rb = m.read_by || []
      rb.push(actorId)
      return client.from('direct_messages').update({ read_by: rb }).eq('id', m.id)
    })).catch(e => console.error('Failed to mark read', e))
  }

  return { success: true, data: messages }
})
