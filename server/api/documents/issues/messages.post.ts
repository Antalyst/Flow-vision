import { serverSupabaseClient } from '#supabase/server'
import {
  ISSUE_ALLOWED_ROLES,
  assertIssueOrgAccess,
  broadcastIssueRealtime,
  issueRealtimeChannel,
} from '~~/server/utils/documentIssues'
import { broadcastComplianceMessageNotification } from '~~/server/utils/notifications'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

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
  const client = await serverSupabaseClient(event)
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

  if (issue.target_office_id) {
    const actorWithOffices = await resolveActorContextWithOffices(event, client)
    const senderOffices = new Set(actorWithOffices.officeIds.map(String))
    const reporterOffice = String(issue.reported_by_office_id)
    const targetOfficeId = String(issue.target_office_id)

    const recipientOfficeId = senderOffices.has(reporterOffice)
      ? targetOfficeId
      : senderOffices.has(targetOfficeId)
        ? reporterOffice
        : targetOfficeId

    const { data: docRow } = await client
      .from('documents')
      .select('title')
      .eq('id', issue.document_id)
      .maybeSingle()

    const { data: recipientOffice } = await client
      .from('offices')
      .select('name')
      .eq('id', recipientOfficeId)
      .maybeSingle()

    try {
      await broadcastComplianceMessageNotification({
        orgId: actor.orgId,
        documentId: issue.document_id,
        documentTitle: (docRow as { title?: string } | null)?.title ?? 'Document',
        issueId: issue.id,
        targetOfficeId: recipientOfficeId,
        targetOfficeName: (recipientOffice as { name?: string } | null)?.name ?? null,
        senderName: actor.fullName,
        preview: messageText,
      })
    } catch (notifyErr) {
      console.warn('[issues/messages] Compliance notification failed:', notifyErr)
    }
  }

  await broadcastIssueRealtime(actor.orgId, issueId, 'new_message', {
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
