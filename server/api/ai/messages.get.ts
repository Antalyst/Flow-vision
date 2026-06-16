import { resolveTenant, getAdminClient, UUID_REGEX } from '~~/server/utils/aiSession'

// GET /api/ai/messages?session_id=...
// Two-step read:
//   1. Verify the caller owns the parent chat_sessions row (id + user_id).
//   2. Fetch chat_messages strictly by session_id, chronological order.
// org_id is intentionally NOT used to filter message rows — that column lives
// on the parent chat_sessions record, so applying it to chat_messages would
// silently filter out every real row.
export default defineEventHandler(async (event) => {
  // user_id comes from the verified session context.
  const { userId } = await resolveTenant(event)

  const { session_id: sessionIdRaw } = getQuery(event)
  const sessionId = typeof sessionIdRaw === 'string' ? sessionIdRaw : ''

  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid "session_id" query parameter is required.',
    })
  }

  const supabase = getAdminClient()

  // 1. Ownership: the parent session must match BOTH id AND user_id.
  //    user_id is character varying(255) in the DDL, so cast to a string to
  //    guarantee an exact type match against the column.
  const { data: ownedSession, error: ownershipError } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', String(userId))
    .maybeSingle()

  if (ownershipError) {
    console.error('Database read failed (chat_sessions):', ownershipError)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to verify session ownership: ${ownershipError.message}`,
    })
  }

  if (!ownedSession) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: this chat session does not belong to the current user.',
    })
  }

  // 2. Messages: filter strictly by session_id, sorted chronologically.
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content, metadata, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Database read failed (chat_messages):', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load chat messages: ${error.message}`,
    })
  }

  console.log('📦 Fetching history for session:', sessionId, 'Found rows:', data?.length)

  return {
    success: true,
    session_id: sessionId,
    messages: data ?? [],
  }
})
