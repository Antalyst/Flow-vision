import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  // Determine the IDs we should query for
  // If employee, they act on behalf of their officeIds.
  // If client, they act on behalf of their user_id.
  const participantTypes = []
  const participantIds = []

  if (actor.userRole === 'client') {
    participantTypes.push('user')
    participantIds.push(actor.userId)
  } else if (actor.officeIds.length > 0) {
    participantTypes.push('office')
    participantIds.push(...actor.officeIds)
  } else {
    // Fallback if they are employee without office
    participantTypes.push('user')
    participantIds.push(actor.userId)
  }

  // Fetch conversations the actor is part of
  const { data: participations, error: partErr } = await client
    .from('conversation_participants')
    .select('conversation_id')
    .in('participant_type', participantTypes)
    .or(`user_id.in.(${participantIds.join(',')}),office_id.in.(${participantIds.join(',')})`)

  if (partErr) {
    throw createError({ statusCode: 500, message: partErr.message })
  }

  const conversationIds = (participations || []).map(p => p.conversation_id)

  if (conversationIds.length === 0) {
    return { success: true, data: [] }
  }

  // Fetch full conversation details + other participants + last message
  const { data: convs, error: convsErr } = await client
    .from('conversations')
    .select(`
      id,
      created_at,
      conversation_participants (
        participant_type,
        user_id,
        office_id
      ),
      direct_messages (
        id,
        sender_user_id,
        sender_office_id,
        message_text,
        created_at
      )
    `)
    .in('id', conversationIds)

  if (convsErr) {
    throw createError({ statusCode: 500, message: convsErr.message })
  }

  // Format response
  // We need to resolve names for other participants (users or offices).
  const officeIdsToFetch = new Set<string>()
  const userIdsToFetch = new Set<string>()

  for (const c of (convs || [])) {
    for (const p of c.conversation_participants) {
      if (p.office_id) officeIdsToFetch.add(p.office_id)
      if (p.user_id) userIdsToFetch.add(p.user_id)
    }
  }

  const nameMap: Record<string, string> = {}

  if (officeIdsToFetch.size > 0) {
    const { data: offices } = await client.from('offices').select('id, name').in('id', [...officeIdsToFetch])
    for (const o of (offices || [])) nameMap[o.id] = o.name
  }

  if (userIdsToFetch.size > 0) {
    const { data: users } = await client.from('users').select('user_id, full_name').in('user_id', [...userIdsToFetch])
    for (const u of (users || [])) nameMap[u.user_id] = u.full_name || 'User'
  }

  const inbox = (convs || []).map(c => {
    // Find the "other" participants
    const others = c.conversation_participants.filter((p: any) => !participantIds.includes(p.user_id) && !participantIds.includes(p.office_id))
    
    // Sort messages to get the latest
    const msgs = c.direct_messages || []
    msgs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const latestMessage = msgs.length > 0 ? msgs[0] : null

    const participantsInfo = others.map((p: any) => {
      const id = p.office_id || p.user_id
      return {
        id,
        type: p.participant_type,
        name: nameMap[id] || 'Unknown'
      }
    })

    return {
      id: c.id,
      participants: participantsInfo,
      latest_message: latestMessage ? {
        text: latestMessage.message_text,
        created_at: latestMessage.created_at,
        sender_id: latestMessage.sender_office_id || latestMessage.sender_user_id
      } : null,
      title: participantsInfo.map((p: any) => p.name).join(', ') || 'Empty Chat'
    }
  })

  // Sort by latest message
  inbox.sort((a, b) => {
    const timeA = a.latest_message ? new Date(a.latest_message.created_at).getTime() : 0
    const timeB = b.latest_message ? new Date(b.latest_message.created_at).getTime() : 0
    return timeB - timeA
  })

  return { success: true, data: inbox }
})
