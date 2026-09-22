import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)
  
  const body = await readBody(event)
  const { conversationId, title } = body

  if (!conversationId) {
    throw createError({ statusCode: 400, message: 'conversationId is required' })
  }

  // Ensure actor is a participant in this conversation
  const { data: participations, error: partErr } = await client
    .from('conversation_participants')
    .select('id')
    .or(`user_id.eq.${actor.userId}${actor.officeIds.length > 0 ? `,office_id.in.(${actor.officeIds.join(',')})` : ''}`)
    .limit(1)

  if (partErr || !participations || participations.length === 0) {
    throw createError({ statusCode: 403, message: 'You do not have permission to edit this conversation' })
  }

  // Update title — group_name is what the inbox list actually displays for groups,
  // so it must be kept in sync with title (see group.post.ts for the same pairing).
  const { error: updateErr } = await client
    .from('conversations')
    .update({ title: title || null, group_name: title || null, updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  if (updateErr) {
    throw createError({ statusCode: 500, message: updateErr.message })
  }

  return { success: true }
})
