import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  // Fetch conversations the actor is part of (personal user ID or assigned office IDs)
  const orCondition = `user_id.eq.${actor.userId}${actor.officeIds && actor.officeIds.length > 0 ? `,office_id.in.(${actor.officeIds.join(',')})` : ''}`

  const { data: participations, error: partErr } = await client
    .from('conversation_participants')
    .select('conversation_id')
    .or(orCondition)

  if (partErr) {
    throw createError({ statusCode: 500, message: partErr.message })
  }

  const conversationIds = Array.from(
    new Set((participations || []).map((p) => p.conversation_id))
  )

  if (conversationIds.length === 0) {
    return { success: true, data: [] }
  }

  // Fetch full conversation details + other participants + last message
  const { data: convs, error: convsErr } = await client
    .from('conversations')
    .select(`
      id,
      created_at,
      is_group,
      group_name,
      avatar_url:group_avatar_url,
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
        created_at,
        read_by
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

  // Define our actor's IDs to filter ourselves out from the conversation participant listings
  const myIds = new Set<string>()
  myIds.add(actor.userId)
  if (actor.officeIds) {
    for (const id of actor.officeIds) {
      myIds.add(id)
    }
  }

  const inbox = (convs || []).map(c => {
    // Find the "other" participants by excluding our own actor IDs
    const others = c.conversation_participants.filter((p: any) => {
      const id = p.office_id || p.user_id
      return !myIds.has(id)
    })

    // Sort messages to get the latest
    const msgs = c.direct_messages || []
    msgs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const latestMessage = msgs.length > 0 ? msgs[0] : null

    // Calculate unread count
    const unreadMessages = msgs.filter((m: any) => {
      const senderId = m.sender_office_id || m.sender_user_id
      if (myIds.has(senderId)) return false // ignore messages sent by ourselves

      let readByArray: string[] = []
      if (Array.isArray(m.read_by)) {
        readByArray = m.read_by
      } else if (typeof m.read_by === 'string') {
        try {
          readByArray = JSON.parse(m.read_by)
        } catch {
          readByArray = []
        }
      }

      // Check if any of our IDs (user ID or assigned office IDs) are in read_by
      const isRead = readByArray.some((id: string) => myIds.has(id))
      return !isRead
    })
    const unreadCount = unreadMessages.length

    const participantsInfo = others.map((p: any) => {
      const id = p.office_id || p.user_id
      return {
        id,
        type: p.participant_type,
        name: nameMap[id] || 'Unknown'
      }
    })

    const isGroup = c.is_group || false
    const title = isGroup ? (c.group_name || 'Unnamed Group') : (participantsInfo.map((p: any) => p.name).join(', ') || 'Empty Chat')

    return {
      id: c.id,
      is_group: isGroup,
      group_name: c.group_name,
      avatar_url: c.avatar_url,
      participants: participantsInfo,
      latest_message: latestMessage ? {
        text: latestMessage.message_text,
        created_at: latestMessage.created_at,
        sender_id: latestMessage.sender_office_id || latestMessage.sender_user_id
      } : null,
      title: title,
      created_at: c.created_at,
      unread_count: unreadCount,
      has_unread: unreadCount > 0
    }
  })

  // Sort by latest message or creation date if no messages
  inbox.sort((a, b) => {
    const timeA = a.latest_message ? new Date(a.latest_message.created_at).getTime() : new Date(a.created_at).getTime()
    const timeB = b.latest_message ? new Date(b.latest_message.created_at).getTime() : new Date(b.created_at).getTime()
    return timeB - timeA
  })

  return { success: true, data: inbox }
})
