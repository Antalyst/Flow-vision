/**
 * server/utils/recurringRouting.ts
 *
 * Recurring-routing safety helpers:
 *  - D3: detect whether the recurring-routing schema (migration
 *        2026-10-01_recurring_routing.sql) is present, so the feature is
 *        offered — and accepted by the server — only when it can work.
 *  - D1: number a new cycle's stops after BOTH the document's step counter
 *        and every stored stop, so a stale counter can never collide.
 *  - D2: close a cycle when its document completes, and repair a cycle left
 *        ACTIVE on a COMPLETED document (with the real completion info) so
 *        it can never block reactivation.
 *
 * The decision logic is in pure functions (no database) so it can be tested.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { lifecycleDb } from '~~/server/utils/documentRoute'
import { recordTrackingEvent } from '~~/server/utils/documentAccess'

// ── D3: schema availability ─────────────────────────────────────────────

/** Postgres / PostgREST codes for "that table or column does not exist". */
const MISSING_SCHEMA_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205'])

export function isMissingSchemaError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  if (err.code && MISSING_SCHEMA_CODES.has(err.code)) return true
  return /does not exist|could not find the .*(column|table)/i.test(err.message ?? '')
}

/** How long a "not available" answer is trusted before re-checking (picks up the migration). */
const UNAVAILABLE_RECHECK_MS = 60_000
let availability: { value: boolean; checkedAt: number } | null = null

/** Test hook: forget the cached answer. */
export function resetRecurringAvailabilityCache() {
  availability = null
}

/**
 * True only when every table/column recurring routing needs exists.
 * A positive answer is cached for the process lifetime (the schema doesn't
 * go away); a negative one is re-checked after a minute.
 */
export async function recurringRoutingAvailable(client: Pick<SupabaseClient, 'from'> = lifecycleDb()): Promise<boolean> {
  if (availability?.value) return true
  if (availability && Date.now() - availability.checkedAt < UNAVAILABLE_RECHECK_MS) return false

  const probes = await Promise.all([
    client.from('document_routing_cycles').select('id').limit(0),
    client.from('documents').select('routing_type').limit(0),
    client.from('document_route_stops').select('cycle_number, is_return').limit(0),
    client.from('stages').select('routing_type').limit(0),
  ])
  const failed = probes.find((p: any) => p.error)
  if (failed && !isMissingSchemaError((failed as any).error)) {
    // Unknown failure (network etc.): say "unavailable" now, but don't cache it.
    console.warn('[recurringRouting] availability probe failed:', (failed as any).error?.message)
    return false
  }
  availability = { value: !failed, checkedAt: Date.now() }
  return availability.value
}

/** Controlled, user-safe rejection for recurring operations before the migration. */
export function recurringUnavailableError() {
  return createError({
    statusCode: 409,
    message: 'Recurring routing is not available yet. Please use a standard route, or ask your administrator to finish setting up recurring routing.',
    data: { code: 'RECURRING_ROUTING_UNAVAILABLE' },
  })
}

export async function assertRecurringRoutingAvailable() {
  if (!(await recurringRoutingAvailable())) throw recurringUnavailableError()
}

// ── D1: step numbering ──────────────────────────────────────────────────

/**
 * The step the new cycle continues after: the highest of the document's
 * step counter and every stored route stop. Never lower than either.
 */
export function lastUsedStep(currentStep: number | null | undefined, storedSteps: Array<number | null | undefined>): number {
  return Math.max(0, Number(currentStep ?? 0), ...storedSteps.map((s) => Number(s ?? 0)))
}

/** Highest stored step_number for a document (0 when it has none). Throws on read errors. */
export async function highestStoredStep(documentId: string): Promise<number> {
  const { data, error } = await lifecycleDb()
    .from('document_route_stops')
    .select('step_number')
    .eq('document_id', documentId)
    .order('step_number', { ascending: false })
    .limit(1)
  if (error) {
    console.error('[recurringRouting] could not read stored steps:', error.message)
    throw createError({ statusCode: 500, message: 'We could not read this document\'s route. Please try again.' })
  }
  return Number(data?.[0]?.step_number ?? 0)
}

// ── D2: cycle completion and repair ─────────────────────────────────────

export interface CycleRow {
  id: string
  cycle_number: number
  end_step: number
  status: string
}

export interface CompletionEvent {
  actor_id: string | null
  created_at: string
}

/**
 * Pure decision: is this ACTIVE cycle stale (its document already completed
 * at or past the cycle's last step)? If so, with what completion info.
 */
export function planStaleCycleRepair(
  doc: { tracking_status: string | null; current_step: number | null },
  activeCycle: Pick<CycleRow, 'cycle_number' | 'end_step' | 'status'> | null,
  completionEvent: CompletionEvent | null,
): { repair: false } | { repair: true; completed_at: string | null; completed_by: string | null } {
  if (!activeCycle || activeCycle.status !== 'ACTIVE') return { repair: false }
  if (doc.tracking_status !== 'COMPLETED') return { repair: false }
  if (Number(doc.current_step ?? 0) < Number(activeCycle.end_step)) return { repair: false }
  return {
    repair: true,
    completed_at: completionEvent?.created_at ?? null,
    completed_by: completionEvent?.actor_id ?? null,
  }
}

/**
 * Marks the document's ACTIVE cycle `cycleNumber` completed by `receiverId`
 * at `at`. Retries once. Returns false when it could not be recorded — the
 * document is still correctly COMPLETED, and repairStaleActiveCycle()
 * reconciles the cycle later from the tracking history.
 */
export async function closeCycleOnCompletion(documentId: string, cycleNumber: number, receiverId: string, at: string): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { error } = await lifecycleDb()
      .from('document_routing_cycles')
      .update({ status: 'COMPLETED', completed_at: at, completed_by: receiverId })
      .eq('document_id', documentId)
      .eq('cycle_number', cycleNumber)
      .eq('status', 'ACTIVE')
    if (!error) return true
    console.error(`[recurringRouting] closing cycle ${cycleNumber} failed (attempt ${attempt}):`, error.message)
  }
  return false
}

/**
 * Reconciles an ACTIVE cycle left on a COMPLETED document (closeCycleOnCompletion
 * failed). Completion info comes from the recorded return receipt — the real
 * receiver and time — and the repair itself is written to the history.
 * Returns the repaired cycle number, or null when nothing needed repair.
 */
export async function repairStaleActiveCycle(
  doc: { id: string; org_id: string; tracking_status: string | null; current_step: number | null },
  actor: { userId: string; userRole: string; fullName: string | null },
): Promise<number | null> {
  const db = lifecycleDb()
  const { data: active } = await db
    .from('document_routing_cycles')
    .select('id, cycle_number, end_step, status')
    .eq('document_id', doc.id)
    .eq('status', 'ACTIVE')
    .maybeSingle()
  if (!active) return null

  let { data: events, error: eventsErr } = await db
    .from('document_tracking_events')
    .select('actor_id, created_at, event_type, step_index')
    .eq('document_id', doc.id)
    .in('event_type', ['CYCLE_COMPLETED', 'RECEIVED_BY_OFFICE'])
    .eq('step_index', active.end_step)
    .order('created_at', { ascending: false })
    .limit(1)
  if (eventsErr && isMissingSchemaError(eventsErr)) {
    // No event_type column: the return receipt is the arrival at the cycle's last step.
    ({ data: events } = await db
      .from('document_tracking_events')
      .select('actor_id, created_at, step_index')
      .eq('document_id', doc.id)
      .eq('status', 'ARRIVED_AT_OFFICE')
      .eq('step_index', active.end_step)
      .order('created_at', { ascending: false })
      .limit(1) as any)
  }
  const completion = (events?.[0] as CompletionEvent | undefined) ?? null

  const plan = planStaleCycleRepair(doc, active as CycleRow, completion)
  if (!plan.repair) return null

  const { data: closed, error } = await db
    .from('document_routing_cycles')
    .update({
      status: 'COMPLETED',
      completed_at: plan.completed_at ?? new Date().toISOString(),
      completed_by: plan.completed_by,
    })
    .eq('id', active.id)
    .eq('status', 'ACTIVE')
    .select('id')
  if (error || !closed?.length) {
    if (error) console.error('[recurringRouting] stale cycle repair failed:', error.message)
    return null
  }

  // Same history writer as every other workflow step (constraint-aware, logged).
  const history = await recordTrackingEvent({
    document_id: doc.id,
    org_id: doc.org_id,
    status: 'COMPLETED',
    step_index: active.end_step,
    office_name: null,
    actor_id: actor.userId,
    actor_role: actor.userRole,
    actor_name: actor.fullName,
    event_type: 'CYCLE_RECORD_REPAIRED',
    notes: `Cycle ${active.cycle_number} record closed to match the document's completed state` +
      (plan.completed_at ? ` (returned ${plan.completed_at}).` : ' (return receipt time not found; repair time used).'),
    metadata: {
      cycle_number: active.cycle_number,
      completed_at: plan.completed_at,
      completed_by: plan.completed_by,
      repaired_by: actor.userId,
    },
  })
  if (!history.ok) console.error('[recurringRouting] cycle repair is done but its history entry was not saved', { document_id: doc.id, cycle_number: active.cycle_number })
  return active.cycle_number
}
