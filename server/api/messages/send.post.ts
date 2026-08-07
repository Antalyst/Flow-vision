import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)
  
  const body = await readBody(event)
  const { conversationId, text, targetUserId, targetOfficeId } = body

  if (!text) {
    throw createError({ statusCode: 400, message: 'Message text is required' })
  }

  const isClient = actor.userRole === 'client'
  const senderUserId = isClient ? actor.userId : null
  const senderOfficeId = !isClient && actor.officeIds.length > 0 ? actor.officeIds[0] : null
  
  // If fallback is needed
  const actualSenderUserId = !isClient && !senderOfficeId ? actor.userId : senderUserId

  let finalConversationId = conversationId

  const selfType = senderOfficeId ? 'office' : 'user'
  const selfId = senderOfficeId || (actualSenderUserId || actor.userId)

  // 1. If no conversationId is provided, check if one exists or create it
  if (!finalConversationId) {
    if (!targetUserId && !targetOfficeId) {
       throw createError({ statusCode: 400, message: 'Must provide target to start a conversation' })
    }

    const targetType = targetOfficeId ? 'office' : 'user'
    const targetId = targetOfficeId || targetUserId

    // Check if conversation already exists
    const { data: selfParts } = await client.from('conversation_participants')
      .select('conversation_id')
      .eq('participant_type', selfType)
      .eq(selfType === 'office' ? 'office_id' : 'user_id', selfId)

    if (selfParts && selfParts.length > 0) {
      const convIds = selfParts.map(p => p.conversation_id)
      const { data: targetParts } = await client.from('conversation_participants')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('participant_type', targetType)
        .eq(targetType === 'office' ? 'office_id' : 'user_id', targetId)
        
      if (targetParts && targetParts.length > 0) {
        finalConversationId = targetParts[0].conversation_id
      }
    }

    if (!finalConversationId) {
      // Creating a new conversation
      const { data: conv, error: convErr } = await client
        .from('conversations')
        .insert({ org_id: actor.orgId })
        .select('id')
        .single()

      if (convErr) throw createError({ statusCode: 500, message: convErr.message })
      finalConversationId = conv.id

      // Insert participants
      const participants = [
        {
          conversation_id: finalConversationId,
          participant_type: selfType,
          user_id: selfType === 'user' ? selfId : null,
          office_id: selfType === 'office' ? selfId : null
        },
        {
          conversation_id: finalConversationId,
          participant_type: targetType,
          user_id: targetType === 'user' ? targetId : null,
          office_id: targetType === 'office' ? targetId : null
        }
      ]

      await client.from('conversation_participants').insert(participants)
    }
  }

  // Validate sender is part of this conversation
  const senderOrCondition = `user_id.eq.${actor.userId}${actor.officeIds && actor.officeIds.length > 0 ? `,office_id.in.(${actor.officeIds.join(',')})` : ''}`

  const { data: participations, error: partError } = await client
    .from('conversation_participants')
    .select('participant_type, user_id, office_id')
    .eq('conversation_id', finalConversationId)
    .or(senderOrCondition)

  if (partError || !participations || participations.length === 0) {
    throw createError({ statusCode: 403, message: 'You are not a participant of this conversation' })
  }

  const activeParticipant = participations[0]
  const msgSenderUserId = activeParticipant.participant_type === 'user' ? activeParticipant.user_id : null
  const msgSenderOfficeId = activeParticipant.participant_type === 'office' ? activeParticipant.office_id : null

  // 2. Insert message
  const { data: message, error: msgErr } = await client
    .from('direct_messages')
    .insert({
      conversation_id: finalConversationId,
      sender_user_id: msgSenderUserId,
      sender_office_id: msgSenderOfficeId,
      message_text: text
    })
    .select('*')
    .single()

  if (msgErr) {
    throw createError({ statusCode: 500, message: msgErr.message })
  }

  // 3. Update conversation updated_at
  await client.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', finalConversationId)

  return { success: true, data: message, conversationId: finalConversationId }
})
