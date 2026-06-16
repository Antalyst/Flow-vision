/**
 * server/utils/documentIssues.ts
 *
 * Shared helpers for document issue threads and org-scoped chat.
 */

import type { H3Event } from 'h3'
import type { ServerSupabaseClient } from '~~/server/utils/supabase'
import { resolveActorContext, type ActorContext } from '~~/server/utils/actorContext'

type SupabaseClient = ServerSupabaseClient

export const ISSUE_ALLOWED_ROLES = ['client', 'employee'] as const

export interface DocumentIssueRow {
  id: string
  document_id: string
  org_id: string
  reported_by_office_id: string
  title: string
  status: 'OPEN' | 'RESOLVED'
  created_at: string
}

export interface DocumentRow {
  id: string
  org_id: string
  title: string
  tracking_status: string | null
  origin_office_id: string | null
  current_office_id: string | null
}

/** Realtime channel name shared by server broadcast + client subscriptions. */
export function issueRealtimeChannel(orgId: string, issueId: string): string {
  return `org:${orgId}:issue:${issueId}`
}

/** Org-wide logistics stream channel (timeline / queue dashboards). */
export function orgLogisticsChannel(orgId: string): string {
  return `org:${orgId}:logistics`
}

/**
 * Resolve actor + document; throw 403 if session org_id ≠ document org_id.
 */
export async function assertDocumentOrgAccess(
  event: H3Event,
  supabase: SupabaseClient,
  documentId: string,
): Promise<{ actor: ActorContext; document: DocumentRow }> {
  const actor = await resolveActorContext(event, supabase)

  const { data: document, error } = await supabase
    .from('documents')
    .select('id, org_id, title, tracking_status, origin_office_id, current_office_id')
    .eq('id', documentId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  if (!document) {
    throw createError({ statusCode: 404, message: 'Document not found.' })
  }

  if (String(document.org_id) !== actor.orgId) {
    throw createError({
      statusCode: 403,
      message:
        'CROSS_ORG_VIOLATION: Document belongs to a different organisation. Access denied.',
    })
  }

  return { actor, document: document as DocumentRow }
}

/**
 * Resolve actor + issue; throw 403 if session org_id ≠ issue org_id.
 */
export async function assertIssueOrgAccess(
  event: H3Event,
  supabase: SupabaseClient,
  issueId: string,
): Promise<{ actor: ActorContext; issue: DocumentIssueRow }> {
  const actor = await resolveActorContext(event, supabase)

  const { data: issue, error } = await supabase
    .from('document_issues')
    .select('id, document_id, org_id, reported_by_office_id, title, status, created_at')
    .eq('id', issueId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  if (!issue) {
    throw createError({ statusCode: 404, message: 'Issue thread not found.' })
  }

  if (String(issue.org_id) !== actor.orgId) {
    throw createError({
      statusCode: 403,
      message:
        'CROSS_ORG_VIOLATION: Issue thread belongs to a different organisation. Access denied.',
    })
  }

  return { actor, issue: issue as DocumentIssueRow }
}

/**
 * Verify the reporting office exists and belongs to the actor's org.
 * Employees may only report from offices assigned to them.
 */
export async function assertReportingOfficeAccess(
  supabase: SupabaseClient,
  actor: ActorContext,
  officeId: string,
): Promise<{ id: string; name: string; code: string | null }> {
  const { data: office, error } = await supabase
    .from('offices')
    .select('id, name, code, org_id, assigned_user')
    .eq('id', officeId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  if (!office) {
    throw createError({ statusCode: 404, message: 'Reporting office not found.' })
  }

  if (String(office.org_id) !== actor.orgId) {
    throw createError({
      statusCode: 403,
      message:
        'CROSS_ORG_VIOLATION: Reporting office belongs to a different organisation.',
    })
  }

  if (actor.userRole === 'employee' && String(office.assigned_user) !== actor.userId) {
    throw createError({
      statusCode: 403,
      message:
        'UNAUTHORIZED_OFFICE: Employees may only flag issues from their assigned sub-offices.',
    })
  }

  return { id: String(office.id), name: office.name, code: office.code ?? null }
}

/**
 * Broadcast a payload to Supabase Realtime channels via the REST broadcast API.
 */
export async function broadcastIssueRealtime(
  _event: H3Event,
  orgId: string,
  issueId: string,
  broadcastEvent: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const client = useServerSupabase()

  const channels = [
    issueRealtimeChannel(orgId, issueId),
    orgLogisticsChannel(orgId),
  ]

  try {
    await Promise.all(
      channels.map((channelName) =>
        client.broadcast(channelName, broadcastEvent, payload),
      ),
    )
  } catch (err) {
    console.warn('[documentIssues] Realtime broadcast failed:', err)
  }
}
