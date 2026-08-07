import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)
  
  const body = await readBody(event)
  const { groupName, participantUserIds = [], participantOfficeIds = [] } = body

  if (!groupName || typeof groupName !== 'string') {
    throw createError({ statusCode: 400, message: 'Group name is required' })
  }

  const isClient = actor.userRole === 'client'
  const senderOfficeId = !isClient && actor.officeIds.length > 0 ? actor.officeIds[0] : null
  const selfType = senderOfficeId ? 'office' : 'user'
  const selfId = senderOfficeId || actor.userId

  // 1. Create a new group conversation
  const { data: conv, error: convErr } = await client
    .from('conversations')
    .insert({
      org_id: actor.orgId,
      is_group: true,
      group_name: groupName
    })
    .select('id')
    .single()

  if (convErr) {
    throw createError({ statusCode: 500, message: convErr.message })
  }

  const finalConversationId = conv.id

  // 2. Prepare participants
  const participants = []

  // Add the creator as 'admin'
  participants.push({
    conversation_id: finalConversationId,
    participant_type: selfType,
    user_id: selfType === 'user' ? selfId : null,
    office_id: selfType === 'office' ? selfId : null,
    role: 'admin'
  })

  // Add user participants
  if (Array.isArray(participantUserIds)) {
    for (const userId of participantUserIds) {
      if (userId !== selfId || selfType !== 'user') {
        participants.push({
          conversation_id: finalConversationId,
          participant_type: 'user',
          user_id: userId,
          office_id: null,
          role: 'member'
        })
      }
    }
  }

  // Add office participants
  if (Array.isArray(participantOfficeIds)) {
    for (const officeId of participantOfficeIds) {
      if (officeId !== selfId || selfType !== 'office') {
        participants.push({
          conversation_id: finalConversationId,
          participant_type: 'office',
          user_id: null,
          office_id: officeId,
          role: 'member'
        })
      }
    }
  }

  // 3. Insert participants
  const { error: partErr } = await client
    .from('conversation_participants')
    .insert(participants)

  if (partErr) {
    throw createError({ statusCode: 500, message: partErr.message })
  }

  return { success: true, conversationId: finalConversationId }
})
