/**
 * server/utils/documentAccess.ts
 *
 * Who may see a document's details, and the shared write helpers used by the
 * custody / release workflow endpoints.
 *
 * Access levels:
 *   'full'     — creator, org admin (client), the active liaison, and staff of
 *                the office that currently has the document (or that it is
 *                being delivered to right now).
 *   'released' — staff of an office the document has ALREADY LEFT (its origin
 *                or an earlier stop). They may only see that it was released.
 *   'none'     — everyone else, including unrelated offices of the same org.
 */
import type { RouteStop } from '~~/server/utils/documentRoute'
import { getDocumentRoutes, lifecycleDb, routeStopAt } from '~~/server/utils/documentRoute'
import { notifyDocumentCreator } from '~~/server/utils/notifications'

export type DocumentAccessLevel = 'full' | 'released' | 'none'

export interface AccessActor {
  userId: string
  userRole: string
  orgId: string
  officeIds: string[]
}

export interface AccessDoc {
  id: string
  org_id: string | null
  user_id: string | null
  tracking_status: string | null
  current_step: number | null
  current_office_id: string | null
  origin_office_id: string | null
  office_id: string | null
  assigned_messenger_id: string | null
}

export const ACCESS_DOC_COLUMNS =
  'id, org_id, user_id, tracking_status, current_step, current_office_id, origin_office_id, office_id, assigned_messenger_id, stage_id'

const IN_MOTION = new Set(['IN_TRANSIT', 'PICKED_UP'])

/** The office that has (or is about to receive) the document right now. */
export function holdingOfficeId(doc: AccessDoc, route: RouteStop[]): string | null {
  const step = doc.current_step ?? 0
  if (IN_MOTION.has(String(doc.tracking_status))) {
    // Step 0 = on its way back to the origin (a flagged document being returned).
    return routeStopAt(route, step)?.office_id ?? (step === 0 ? doc.origin_office_id ?? doc.office_id ?? null : null)
  }
  if (step === 0) return doc.current_office_id ?? doc.origin_office_id ?? doc.office_id ?? null
  return doc.current_office_id ?? null
}

export function documentAccessLevel(actor: AccessActor, doc: AccessDoc, route: RouteStop[]): DocumentAccessLevel {
  if (!doc.org_id || String(doc.org_id) !== actor.orgId) return 'none'
  if (actor.userRole === 'client') return 'full'
  if (doc.user_id && String(doc.user_id) === actor.userId) return 'full'
  if (doc.assigned_messenger_id && String(doc.assigned_messenger_id) === actor.userId) return 'full'
  if (actor.userRole !== 'employee' && actor.userRole !== 'employee_sub_user') return 'none'

  const mine = new Set(actor.officeIds.map(String))
  const holding = holdingOfficeId(doc, route)
  if (holding && mine.has(holding)) return 'full'

  // Offices the document has already left: its origin (once it departed) and
  // every stop before the current one.
  const step = doc.current_step ?? 0
  const left: string[] = []
  const origin = doc.origin_office_id ?? doc.office_id
  if (origin && (step >= 1 || IN_MOTION.has(String(doc.tracking_status)))) left.push(String(origin))
  for (const stop of route) {
    if (stop.step_number < step) left.push(stop.office_id)
  }
  return left.some((id) => mine.has(id)) ? 'released' : 'none'
}

/** Throws unless the actor has full access. 'released' gets a specific, non-revealing message. */
export function assertFullDocumentAccess(level: DocumentAccessLevel) {
  if (level === 'full') return
  if (level === 'released') {
    throw createError({
      statusCode: 403,
      message: 'This document has been released by your office. Only its release status is available to you.',
      data: { code: 'DOCUMENT_RELEASED' },
    })
  }
  throw createError({ statusCode: 404, message: 'We could not find this document.' })
}

/**
 * Every event_type the application writes to document_tracking_events. The
 * database constraint tracking_event_type_check must allow each of these —
 * see migrations/supabase/2026-10-03_tracking_event_type_check.sql (and the
 * test that keeps this list and that migration in sync).
 */
export const TRACKING_EVENT_TYPES = [
  'LIAISON_PICKUP',
  'IN_TRANSIT',
  'RECEIVED_BY_OFFICE',
  'CUSTODY_TRANSFER',
  'RELEASE_REQUESTED',
  'RELEASE_APPROVED',
  'RELEASE_REJECTED',
  'DOCUMENT_COMPLETED',
  'CYCLE_STARTED',
  'CYCLE_COMPLETED',
  'CYCLE_RECORD_REPAIRED',
  'DISCREPANCY_REPORTED',
  'DISCREPANCY_RESOLVED',
] as const
export type TrackingEventType = (typeof TRACKING_EVENT_TYPES)[number]

/**
 * What happened to one history entry:
 *   recorded   — saved as written
 *   degraded   — saved, but without event_type (and possibly metadata): the
 *                database rejected them (missing column, or event_type not yet
 *                allowed by tracking_event_type_check). The type is kept in
 *                metadata when that column exists.
 *   failed     — NOT saved. Logged with the database error.
 */
export type TrackingEventResult =
  | { ok: true; outcome: 'recorded'; row: Record<string, unknown> | null }
  | { ok: true; outcome: 'degraded'; reason: 'missing_columns' | 'event_type_not_allowed'; row: Record<string, unknown> | null }
  | { ok: false; outcome: 'failed'; code: string | null; message: string }

/** Postgres check_violation raised by tracking_event_type_check. */
export function isEventTypeCheckViolation(error: { code?: string; message?: string } | null | undefined) {
  return !!error && error.code === '23514' && /tracking_event_type_check/i.test(error.message ?? '')
}

/**
 * Appends a tracking-history entry. Never throws — the document transition it
 * describes is already committed — but returns whether the entry was saved,
 * and logs every failure with the event type and the database error.
 *
 * At most one fallback insert, and only after the first was REJECTED (nothing
 * written), so a history entry is never duplicated.
 */
export async function recordTrackingEvent(row: {
  document_id: string
  org_id: string
  status: 'CREATED' | 'PICKED_UP' | 'IN_TRANSIT' | 'ARRIVED_AT_OFFICE' | 'DISCREPANCY_REPORTED' | 'COMPLETED'
  step_index: number | null
  office_name?: string | null
  actor_id: string
  actor_role: string
  actor_name: string | null
  event_type: TrackingEventType
  notes: string
  metadata?: Record<string, unknown>
}): Promise<TrackingEventResult> {
  // office_id stays null: the live column type is unverified (the schema dump
  // says integer, office ids are uuids). Office ids go in metadata instead.
  const { event_type, metadata, ...base } = row
  const db = lifecycleDb()
  const context = { event_type, status: row.status, document_id: row.document_id, step_index: row.step_index }
  const logFailure = (error: { code?: string; message?: string; details?: string; hint?: string }) => {
    console.error('[documentAccess] tracking event insert failed', {
      ...context,
      code: error.code ?? null,
      message: error.message,
      details: error.details ?? null,
      hint: error.hint ?? null,
    })
    return { ok: false as const, outcome: 'failed' as const, code: error.code ?? null, message: error.message ?? 'insert failed' }
  }

  if (extrasMissingSince === null || Date.now() - extrasMissingSince > EXTRAS_RECHECK_MS) {
    const { data, error } = await db.from('document_tracking_events').insert({
      ...base,
      office_id: null,
      event_type,
      metadata: metadata ?? null,
    }).select('*').single()
    if (!error) {
      extrasMissingSince = null
      return { ok: true, outcome: 'recorded', row: data ?? null }
    }

    if (isEventTypeCheckViolation(error)) {
      // The live constraint doesn't allow this type yet (run
      // 2026-10-03_tracking_event_type_check.sql). Keep the history entry —
      // status/step/actor/time are what the roadmap uses — with the type in
      // metadata so it can be restored later.
      console.error('[documentAccess] event_type rejected by tracking_event_type_check — saving the entry without it. Run migrations/supabase/2026-10-03_tracking_event_type_check.sql.', context)
      const retry = await db.from('document_tracking_events').insert({
        ...base,
        office_id: null,
        event_type: null,
        metadata: { ...(metadata ?? {}), event_type_rejected: event_type },
      }).select('*').single()
      if (retry.error) return logFailure(retry.error)
      return { ok: true, outcome: 'degraded', reason: 'event_type_not_allowed', row: retry.data ?? null }
    }

    if (!isMissingColumnError(error)) return logFailure(error)

    // event_type / metadata are optional columns (migration
    // 2026-10-02_tracking_event_details.sql). Without them the whole insert
    // was rejected, so receipts, releases and assignments never reached the
    // history and the roadmap kept showing "On the Way".
    console.warn('[documentAccess] document_tracking_events has no event_type/metadata columns — saving without them.', context)
    extrasMissingSince = Date.now()
  }
  const { data, error } = await db.from('document_tracking_events').insert({ ...base, office_id: null }).select('*').single()
  if (error) return logFailure(error)
  return { ok: true, outcome: 'degraded', reason: 'missing_columns', row: data ?? null }
}

/**
 * A workflow step is only reported as successful once its history entry is
 * saved — the tracking history is the accountability record. If it wasn't
 * (the database error is already logged by recordTrackingEvent), the request
 * fails with a clear, recoverable message. The document change itself is
 * already saved, so the message says so and asks the user not to repeat it.
 */
export function assertHistorySaved(results: TrackingEventResult[], action: string) {
  const failed = results.find((r) => !r.ok)
  if (!failed) return
  throw createError({
    statusCode: 500,
    message: `${action} was saved, but its tracking history entry could not be recorded, so this document's history is incomplete. Please don't repeat the action — ask your administrator to check the server log.`,
    data: { code: 'TRACKING_RECORD_FAILED', transition_saved: true },
  })
}

/** When the optional columns were last found missing; re-checked after a minute (picks up the migration). */
let extrasMissingSince: number | null = null
const EXTRAS_RECHECK_MS = 60_000

/** PostgREST/Postgres "column does not exist" (PGRST204 on insert, 42703 on select). */
export function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  return error.code === 'PGRST204' || error.code === '42703' || /column .* does not exist|could not find the .* column/i.test(error.message ?? '')
}

/** Direct, per-person notification, routed by the recipient's real role and office. */
export async function notifyUser(input: {
  orgId: string
  documentId: string
  documentTitle: string
  userId: string | null | undefined
  title: string
  message: string
}) {
  if (!input.userId) return
  const { data: user } = await lifecycleDb()
    .from('users')
    .select('role, office_id')
    .eq('user_id', input.userId)
    .maybeSingle()
  if (!user) return
  await notifyDocumentCreator({
    orgId: input.orgId,
    documentId: input.documentId,
    documentTitle: input.documentTitle,
    userId: input.userId,
    creatorRole: user.role,
    officeId: user.office_id ?? null,
    title: input.title,
    message: input.message,
  })
}

/** Active members of an office: staff whose users.office_id is it, plus its head. */
export async function getOfficeMembers(orgId: string, officeId: string) {
  const db = lifecycleDb()
  const [{ data: staff }, { data: office }] = await Promise.all([
    db.from('users').select('user_id, full_name, role, status').eq('org_id', orgId).eq('office_id', officeId),
    db.from('offices').select('assigned_user').eq('id', officeId).maybeSingle(),
  ])
  const members = new Map<string, { user_id: string; full_name: string | null; role: string; is_head: boolean }>()
  for (const u of staff ?? []) {
    if (u.status === 0 || !['employee', 'employee_sub_user'].includes(String(u.role))) continue
    members.set(String(u.user_id), { user_id: String(u.user_id), full_name: u.full_name, role: u.role, is_head: false })
  }
  if (office?.assigned_user) {
    const headId = String(office.assigned_user)
    const existing = members.get(headId)
    if (existing) existing.is_head = true
    else {
      const { data: head } = await db.from('users').select('user_id, full_name, role, status, org_id').eq('user_id', headId).maybeSingle()
      if (head && head.status !== 0 && String(head.org_id) === orgId) {
        members.set(headId, { user_id: headId, full_name: head.full_name, role: head.role, is_head: true })
      }
    }
  }
  return [...members.values()]
}

/**
 * Applies the office visibility rule to a document list for one viewer:
 * full rows where they have access, a minimal "Released" row for offices the
 * document already left (title, status, release time — nothing else), and
 * nothing for unrelated documents.
 */
export async function applyListVisibility<T extends AccessDoc & { title?: string | null; stage_id?: string | number | null }>(
  actor: AccessActor,
  rows: T[],
): Promise<Array<(T & { access: 'full' }) | ReleasedListRow>> {
  if (actor.userRole === 'client') return rows.map((r) => ({ ...r, access: 'full' as const }))

  const routes = await getDocumentRoutes(rows.map((r) => ({ id: String(r.id), stage_id: r.stage_id ?? null })))
  const levels = rows.map((r) => ({ row: r, level: documentAccessLevel(actor, r, routes.get(String(r.id)) ?? []) }))

  const releasedIds = levels.filter((l) => l.level === 'released').map((l) => String(l.row.id))
  const releasedAt = new Map<string, string>()
  if (releasedIds.length) {
    const { data: legs } = await lifecycleDb()
      .from('document_liaison_assignments')
      .select('document_id, from_office_id, picked_up_at')
      .in('document_id', releasedIds)
      .not('picked_up_at', 'is', null)
    const mine = new Set(actor.officeIds)
    for (const leg of legs ?? []) {
      if (!leg.from_office_id || !mine.has(String(leg.from_office_id))) continue
      const prev = releasedAt.get(String(leg.document_id))
      if (!prev || String(leg.picked_up_at) > prev) releasedAt.set(String(leg.document_id), String(leg.picked_up_at))
    }
  }

  const out: Array<(T & { access: 'full' }) | ReleasedListRow> = []
  for (const { row, level } of levels) {
    if (level === 'full') out.push({ ...row, access: 'full' })
    else if (level === 'released') {
      out.push({
        id: String(row.id),
        title: row.title ?? 'Document',
        access: 'released',
        release_status: 'Released',
        released_at: releasedAt.get(String(row.id)) ?? null,
      })
    }
  }
  return out
}

export interface ReleasedListRow {
  id: string
  title: string
  access: 'released'
  release_status: 'Released'
  released_at: string | null
}

export async function userFullName(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null
  const { data } = await lifecycleDb().from('users').select('full_name').eq('user_id', userId).maybeSingle()
  return data?.full_name ?? null
}
