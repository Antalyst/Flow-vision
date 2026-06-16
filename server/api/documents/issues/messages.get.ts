import {
  assertIssueOrgAccess,
  issueRealtimeChannel,
} from '~~/server/utils/documentIssues'

/**
 * GET /api/documents/issues/messages
 *
 * Retrieve chat history for an issue thread.
 * Session org_id MUST match the issue's org_id (enforced before any rows are returned).
 *
 * Query params:
 *   issue_id  UUID   required
 *   limit     number optional — default 100, max 500
 *   before    ISO    optional — return messages created before this timestamp (pagination)
 */
export default defineEventHandler(async (event) => {
  const supabase = useServerSupabase()
  const query  = getQuery(event)

  const issueId = String(query.issue_id ?? '').trim()
  const limit   = Math.min(Math.max(Number(query.limit ?? 100), 1), 500)
  const before  = query.before ? String(query.before) : null

  if (!issueId) {
    throw createError({ statusCode: 400, message: 'issue_id query parameter is required.' })
  }

  // Security: org_id cross-check happens here — 403 before any messages are fetched
  const { actor, issue } = await assertIssueOrgAccess(event, supabase, issueId)

  let msgQuery = supabase
    .from('document_messages')
    .select('id, issue_id, sender_id, message_text, created_at')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (before) {
    msgQuery = msgQuery.lt('created_at', before)
  }

  const { data: messages, error: msgErr } = await msgQuery

  if (msgErr) {
    throw createError({ statusCode: 500, message: msgErr.message })
  }

  // Enrich sender display names (same org — already validated via issue)
  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id).filter(Boolean))]

  let senderMap: Record<string, { full_name: string | null; role: string | null }> = {}

  if (senderIds.length) {
    const { data: senders } = await supabase
      .from('users')
      .select('user_id, full_name, role')
      .in('user_id', senderIds)
      .eq('org_id', actor.orgId)

    senderMap = (senders ?? []).reduce(
      (acc, u) => {
        acc[String(u.user_id)] = { full_name: u.full_name ?? null, role: u.role ?? null }
        return acc
      },
      {} as Record<string, { full_name: string | null; role: string | null }>,
    )
  }

  const enriched = (messages ?? []).map((m) => ({
    ...m,
    sender_name: senderMap[String(m.sender_id)]?.full_name ?? null,
    sender_role: senderMap[String(m.sender_id)]?.role ?? null,
  }))

  return {
    success: true,
    org_id:  actor.orgId,
    issue: {
      id:                    issue.id,
      document_id:           issue.document_id,
      title:                 issue.title,
      status:                issue.status,
      reported_by_office_id: issue.reported_by_office_id,
      created_at:            issue.created_at,
    },
    total:   enriched.length,
    data:    enriched,
    realtime: {
      channel: issueRealtimeChannel(actor.orgId, issueId),
      events:  ['new_message', 'issue_created', 'issue_resolved'],
    },
  }
})
