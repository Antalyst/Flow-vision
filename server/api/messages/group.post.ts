import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)
  
  const body = await readBody(event)
  const { participantIds, participantOffices, title } = body

  if (!participantIds && !participantOffices) {
    throw createError({ statusCode: 400, message: 'Must provide participants to create a group' })
  }

  const isClient = actor.userRole === 'client'
  const senderUserId = isClient ? actor.userId : null
  const senderOfficeId = !isClient && actor.officeIds.length > 0 ? actor.officeIds[0] : null
  
  const actualSenderUserId = !isClient && !senderOfficeId ? actor.userId : senderUserId
  const selfType = senderOfficeId ? 'office' : 'user'
  const selfId = senderOfficeId || (actualSenderUserId || actor.userId)

  // 1. Create a new conversation
  const { data: conv, error: convErr } = await client
    .from('conversations')
    .insert({ org_id: actor.orgId, title: title || null })
    .select('id')
    .single()

  if (convErr) throw createError({ statusCode: 500, message: convErr.message })
  const finalConversationId = conv.id

  // 2. Prepare participants list
  const participants = [
    {
      conversation_id: finalConversationId,
      participant_type: selfType,
      user_id: selfType === 'user' ? selfId : null,
      office_id: selfType === 'office' ? selfId : null
    }
  ]

  for (const uid of (participantIds || [])) {
    participants.push({
      conversation_id: finalConversationId,
      participant_type: 'user',
      user_id: uid,
      office_id: null
    })
  }

  for (const oid of (participantOffices || [])) {
    participants.push({
      conversation_id: finalConversationId,
      participant_type: 'office',
      user_id: null,
      office_id: oid
    })
  }

  // 3. Insert participants
  const { error: partErr } = await client.from('conversation_participants').insert(participants)
  if (partErr) {
    throw createError({ statusCode: 500, message: partErr.message })
  }

  // 4. Optionally insert an initial message or just return the conversation ID
  // If we want a system message, we can add it, but empty group is fine too.
  
  return { success: true, conversationId: finalConversationId }
})
