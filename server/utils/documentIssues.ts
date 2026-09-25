/**
 * server/utils/documentIssues.ts
 *
 * Shared helpers for document issue threads and org-scoped chat.
 */

import type { H3Event } from 'h3'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolveActorContext, type ActorContext } from '~~/server/utils/actorContext'

export const ISSUE_ALLOWED_ROLES = ['client', 'employee'] as const

export interface DocumentIssueRow {
  id: string
  document_id: string
  org_id: string
  reported_by_office_id: string
  target_office_id?: string | null
  issue_type?: string | null
  details?: string | null
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
  client: SupabaseClient,
  documentId: string,
): Promise<{ actor: ActorContext; document: DocumentRow }> {
  const actor = await resolveActorContext(event, client)

  const { data: document, error } = await client
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
  client: SupabaseClient,
  issueId: string,
): Promise<{ actor: ActorContext; issue: DocumentIssueRow }> {
  const actor = await resolveActorContext(event, client)

  const { data: issue, error } = await client
    .from('document_issues')
    .select('id, document_id, org_id, reported_by_office_id, target_office_id, issue_type, details, title, status, created_at')
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
  client: SupabaseClient,
  actor: ActorContext,
  officeId: string,
): Promise<{ id: string; name: string; code: string | null }> {
  const { data: office, error } = await client
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

export interface PreviousRouteOffice {
  officeId: string
  officeName: string
  /** The document's current_step value once rewound to this office. */
  newStep: number
}

/**
 * Resolves the office one step BACK from a document's current position —
 * i.e. whoever handed it off most recently. Used to auto-route a flagged
 * document back to whoever sent it, rather than requiring a manual pick.
 * Mirrors the computation already used to populate the compliance chat's
 * target-office picker (see /api/documents/issues/chat-targets.get.ts).
 */
export async function resolvePreviousRouteOffice(
  client: SupabaseClient,
  documentId: string,
): Promise<PreviousRouteOffice | null> {
  const { data: docRow } = await client
    .from('documents')
    .select('current_step, stage_id, origin_office_id')
    .eq('id', documentId)
    .maybeSingle()

  if (!docRow) return null

  const currentStep = Number((docRow as { current_step?: number }).current_step ?? 0)
  const stageId = (docRow as { stage_id?: string | null }).stage_id ?? null
  const originOfficeId = (docRow as { origin_office_id?: string | null }).origin_office_id ?? null
  const newStep = Math.max(currentStep - 1, 0)

  let previousOfficeId: string | null = null

  if (stageId && currentStep > 1) {
    const { data: prevStep } = await client
      .from('stage_steps')
      .select('office_id')
      .eq('stage_id', stageId)
      .eq('step_number', currentStep - 1)
      .maybeSingle()

    if (prevStep?.office_id) previousOfficeId = String(prevStep.office_id)
  } else if (originOfficeId && currentStep <= 1) {
    previousOfficeId = String(originOfficeId)
  }

  if (!previousOfficeId) return null

  const { data: office } = await client.from('offices').select('name').eq('id', previousOfficeId).maybeSingle()
  if (!office) return null

  return { officeId: previousOfficeId, officeName: office.name, newStep }
}

/**
 * Broadcast a payload to Supabase Realtime channels so connected clients
 * in the same org receive updates instantly.
 *
 * Clients subscribe with:
 *   supabase.channel('org:{orgId}:issue:{issueId}')
 *   supabase.channel('org:{orgId}:logistics')
 */
export async function broadcastIssueRealtime(
  orgId: string,
  issueId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const config = useRuntimeConfig()
  const supabaseUrl = String(config.public.supabaseUrl || '').replace(/\/$/, '')
  const supabaseKey = String(config.supabaseServiceKey || '')

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[documentIssues] Realtime broadcast skipped — missing Supabase config.')
    return
  }

  const channels = [
    issueRealtimeChannel(orgId, issueId),
    orgLogisticsChannel(orgId),
  ]

  const messages = channels.map((topic) => ({
    topic,
    event,
    payload,
  }))

  try {
    await $fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: { messages },
    })
  } catch (err: any) {
    // Non-fatal — DB writes already succeeded
    console.warn('[documentIssues] Realtime broadcast failed (non-fatal):', err?.message || err)
  }
}
