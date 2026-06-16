import {
  ISSUE_ALLOWED_ROLES,
  assertIssueOrgAccess,
  broadcastIssueRealtime,
  issueRealtimeChannel,
} from '~~/server/utils/documentIssues'

/**
 * POST /api/documents/issues/messages
 *
 * Post a chat message inside an issue thread room.
 *
 * Body:
 *   issue_id      UUID   required
 *   message_text  string required
 */
export default defineEventHandler(async (event) => {
  const client = useServerSupabase()
  const body   = await readBody(event)

  const issueId     = String(body?.issue_id ?? '').trim()
  const messageText = String(body?.message_text ?? '').trim()

  if (!issueId)     throw createError({ statusCode: 400, message: 'issue_id is required.' })
  if (!messageText) throw createError({ statusCode: 400, message: 'message_text is required.' })

  const { actor, issue } = await assertIssueOrgAccess(event, client, issueId)

  if (!(ISSUE_ALLOWED_ROLES as readonly string[]).includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client or employee accounts may post issue messages.',
    })
  }

  if (issue.status === 'RESOLVED') {
    throw createError({
      statusCode: 422,
      message: 'This issue thread is resolved. Reopen the issue before posting new messages.',
    })
  }

  const { data: message, error: msgErr } = await client
    .from('document_messages')
    .insert({
      issue_id:     issueId,
      sender_id:    actor.userId,
      message_text: messageText,
    })
    .select('id, issue_id, sender_id, message_text, created_at')
    .single()

  if (msgErr || !message) {
    throw createError({
      statusCode: 500,
      message: msgErr?.message ?? 'Failed to post message.',
    })
  }

  const enriched = {
    ...message,
    sender_name: actor.fullName,
    sender_role: actor.userRole,
  }

  await broadcastIssueRealtime(event, actor.orgId, issueId, 'new_message', {
    type:      'new_message',
    issue_id:  issueId,
    message:   enriched,
    timestamp: new Date().toISOString(),
  })

  return {
    success: true,
    data:    enriched,
    realtime: {
      channel: issueRealtimeChannel(actor.orgId, issueId),
      event:   'new_message',
    },
  }
})
