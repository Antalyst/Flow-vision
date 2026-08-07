import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  const body = await readBody(event)
  const { conversationId } = body

  if (!conversationId) {
    throw createError({ statusCode: 400, message: 'Missing conversation ID' })
  }

  // 1. Verify access
  const orCondition = `user_id.eq.${actor.userId}${actor.officeIds && actor.officeIds.length > 0 ? `,office_id.in.(${actor.officeIds.join(',')})` : ''}`
  
  const { data: participations, error: partErr } = await client
    .from('conversation_participants')
    .select('participant_type, user_id, office_id')
    .eq('conversation_id', conversationId)
    .or(orCondition)

  if (partErr || !participations || participations.length === 0) {
    throw createError({ statusCode: 403, message: 'Forbidden or not a participant' })
  }

  const activeParticipant = participations[0]
  const myReadId = activeParticipant.participant_type === 'office' ? activeParticipant.office_id : activeParticipant.user_id

  // 2. Fetch messages in this conversation
  const { data: messages, error: msgErr } = await client
    .from('direct_messages')
    .select('id, read_by, sender_user_id, sender_office_id')
    .eq('conversation_id', conversationId)

  if (msgErr) {
    throw createError({ statusCode: 500, message: msgErr.message })
  }

  // Define our actor's IDs to filter out our own messages
  const myIds = new Set<string>()
  myIds.add(actor.userId)
  if (actor.officeIds) {
    for (const id of actor.officeIds) {
      myIds.add(id)
    }
  }

  const updates = []
  for (const msg of (messages || [])) {
    const senderId = msg.sender_office_id || msg.sender_user_id
    if (myIds.has(senderId)) continue // skip messages sent by us
    
    let readByArray = []
    if (Array.isArray(msg.read_by)) {
      readByArray = msg.read_by
    } else if (typeof msg.read_by === 'string') {
      try {
        readByArray = JSON.parse(msg.read_by)
      } catch {
        readByArray = []
      }
    }

    if (!readByArray.includes(myReadId)) {
      readByArray.push(myReadId)
      updates.push({
        id: msg.id,
        read_by: readByArray
      })
    }
  }

  if (updates.length > 0) {
    const promises = updates.map(u => 
      client
        .from('direct_messages')
        .update({ read_by: u.read_by })
        .eq('id', u.id)
    )
    const results = await Promise.all(promises)
    for (const r of results) {
      if (r.error) {
        throw createError({ statusCode: 500, message: r.error.message })
      }
    }
  }

  return { success: true }
})
