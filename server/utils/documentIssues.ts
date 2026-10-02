/**
 * server/utils/documentIssues.ts
 *
 * Shared helpers for document issue threads and org-scoped chat.
 */

import type { H3Event } from 'h3'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolveActorContext, resolveActorContextWithOffices, type ActorContext } from '~~/server/utils/actorContext'
import { getDocumentRoute, routeStopAt } from '~~/server/utils/documentRoute'
import { ACCESS_DOC_COLUMNS, documentAccessLevel } from '~~/server/utils/documentAccess'

// employee_sub_user (office staff) included: staff are the ones who receive a
// document and find what's wrong with it. What they may act on is limited by
// office — see assertCanReportOnDocument / assertIssueParticipant below.
export const ISSUE_ALLOWED_ROLES = ['client', 'employee', 'employee_sub_user'] as const

/** Clear, non-revealing message for roles that can't use discrepancy reporting at all. */
export function issueRoleForbidden() {
  return createError({
    statusCode: 403,
    message: 'Your account type cannot report or manage document discrepancies.',
    data: { code: 'ISSUE_ROLE_NOT_ALLOWED' },
  })
}

/**
 * Reporting a discrepancy (and loading where it would be sent back to)
 * requires full access to the document: the org admin, its creator, or the
 * office that holds it right now. An office the document already left, or an
 * unrelated office, gets a clear 403 — the same visibility rule as the rest
 * of the document details (documentAccess.ts).
 */
export async function assertCanReportOnDocument(event: H3Event, client: SupabaseClient, documentId: string) {
  const actor = await resolveActorContextWithOffices(event, client)
  if (!(ISSUE_ALLOWED_ROLES as readonly string[]).includes(actor.userRole)) throw issueRoleForbidden()

  const { data: doc, error } = await client
    .from('documents')
    .select(`${ACCESS_DOC_COLUMNS}, title, current_desk_id`)
    .eq('id', documentId)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'We could not load this document. Please try again.' })
  if (!doc || String((doc as any).org_id) !== actor.orgId) {
    throw createError({ statusCode: 404, message: 'Document not found.' })
  }

  const level = documentAccessLevel(actor, doc as any, await getDocumentRoute(doc as any))
  if (level !== 'full') {
    throw createError({
      statusCode: 403,
      message: level === 'released'
        ? 'Your office has already released this document, so it can no longer report a discrepancy on it.'
        : 'You can only report a discrepancy on a document your office is currently handling.',
      data: { code: 'ISSUE_NO_DOCUMENT_ACCESS' },
    })
  }
  return { actor, document: doc as unknown as DocumentRow }
}

/**
 * Posting in or resolving an issue thread: org admins, or someone from one of
 * the two offices on the issue (the reporter or the office it was sent back to).
 */
export async function assertIssueParticipant(event: H3Event, client: SupabaseClient, issue: DocumentIssueRow) {
  const actor = await resolveActorContextWithOffices(event, client)
  if (!(ISSUE_ALLOWED_ROLES as readonly string[]).includes(actor.userRole)) throw issueRoleForbidden()
  if (actor.userRole === 'client') return actor
  const mine = new Set(actor.officeIds.map(String))
  const involved = [issue.reported_by_office_id, issue.target_office_id].filter(Boolean).map(String)
  if (!involved.some((id) => mine.has(id))) {
    throw createError({
      statusCode: 403,
      message: 'Only the offices involved in this discrepancy can reply to or resolve it.',
      data: { code: 'ISSUE_NOT_PARTICIPANT' },
    })
  }
  return actor
}

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
  current_desk_id: string | null
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
    .select('id, org_id, title, tracking_status, origin_office_id, current_office_id, current_desk_id')
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
  actor: ActorContext & { officeIds?: string[] },
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

  // Employees (office heads) and staff report only from their own offices.
  if (actor.userRole === 'employee' || actor.userRole === 'employee_sub_user') {
    const own = String(office.assigned_user) === actor.userId || (actor.officeIds ?? []).map(String).includes(String(office.id))
    if (!own) {
      throw createError({
        statusCode: 403,
        message: 'You can only report a discrepancy from your own office.',
        data: { code: 'UNAUTHORIZED_OFFICE' },
      })
    }
  }

  return { id: String(office.id), name: office.name, code: office.code ?? null }
}

export interface PreviousRouteOffice {
  officeId: string
  officeName: string
  /** The document's current_step value once rewound to this office. */
  newStep: number
}

export interface SendBackTarget extends PreviousRouteOffice {
  /** previous_handoff = whoever handed it here (the default); origin = where this routing cycle started. */
  role: 'previous_handoff' | 'origin'
}

/**
 * The offices a flagged document may be sent back to, from its actual route
 * (per-document route copy, falling back to its saved stage):
 *   1. previous_handoff — the stop before the current one (or the origin when
 *      it is at stop 1). This is the default.
 *   2. origin — the office the CURRENT routing cycle started from (the origin
 *      for standard routes; for a later recurring cycle, the return stop the
 *      cycle began at — never an earlier cycle's step).
 * Empty while the document is still at its origin (nothing to send back to).
 */
export async function resolveSendBackTargets(
  client: SupabaseClient,
  documentId: string,
): Promise<SendBackTarget[]> {
  const { data: doc } = await client
    .from('documents')
    .select('id, org_id, current_step, stage_id, origin_office_id, office_id')
    .eq('id', documentId)
    .maybeSingle()
  if (!doc) return []

  const currentStep = Number((doc as any).current_step ?? 0)
  if (currentStep < 1) return []
  const originOfficeId = (doc as any).origin_office_id ?? (doc as any).office_id ?? null
  const route = await getDocumentRoute(doc as any)

  const officeAtStep = (step: number) => (step <= 0 ? originOfficeId : routeStopAt(route, step)?.office_id ?? null)
  const current = routeStopAt(route, currentStep)
  const cycle = current?.cycle_number ?? 1
  const cycleStops = route.filter((s) => (s.cycle_number ?? 1) === cycle)
  const cycleStartStep = cycleStops.length ? Math.min(...cycleStops.map((s) => s.step_number)) - 1 : 0

  const candidates: Array<{ officeId: string | null; newStep: number; role: SendBackTarget['role'] }> = [
    { officeId: officeAtStep(currentStep - 1), newStep: currentStep - 1, role: 'previous_handoff' },
    { officeId: officeAtStep(cycleStartStep), newStep: cycleStartStep, role: 'origin' },
  ]
  const seen = new Set<string>()
  const picked = candidates.filter((c) => {
    if (!c.officeId || c.newStep < 0 || c.newStep >= currentStep) return false
    const key = `${c.officeId}:${c.newStep}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (!picked.length) return []

  const { data: offices } = await client.from('offices').select('id, name').in('id', picked.map((c) => String(c.officeId)))
  const nameOf = new Map((offices ?? []).map((o: any) => [String(o.id), o.name as string]))
  return picked
    .filter((c) => nameOf.has(String(c.officeId)))
    .map((c) => ({ officeId: String(c.officeId), officeName: nameOf.get(String(c.officeId))!, newStep: c.newStep, role: c.role }))
}

/**
 * The default send-back office: whoever handed the document here.
 * Kept for callers that don't offer a choice.
 */
export async function resolvePreviousRouteOffice(
  client: SupabaseClient,
  documentId: string,
): Promise<PreviousRouteOffice | null> {
  const targets = await resolveSendBackTargets(client, documentId)
  const target = targets.find((t) => t.role === 'previous_handoff') ?? targets[0]
  return target ? { officeId: target.officeId, officeName: target.officeName, newStep: target.newStep } : null
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
