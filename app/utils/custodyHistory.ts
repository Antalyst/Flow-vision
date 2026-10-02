// Delivery & approval history for the document Custody panel.
//
// Liaison legs and release requests are stored as rows that each hold several
// moments (assigned → picked up → received; requested → decided). The panel
// used to list all legs, then all releases, so an approval could appear after
// a delivery that happened later. Here every moment becomes its own entry,
// ordered by its real timestamp, and grouped by routing cycle.

export type CustodyHistoryKind =
  | 'RELEASE_REQUESTED'
  | 'RELEASE_DECIDED'
  | 'LIAISON_ASSIGNED'
  | 'PICKED_UP'
  | 'RECEIVED'

export interface CustodyHistoryEntry {
  key: string
  kind: CustodyHistoryKind
  at: string
  /** Milliseconds since epoch — the sort key (never the formatted string). */
  time: number
  cycle: number
  leg?: any
  release?: any
}

export interface CustodyHistoryGroup {
  cycle: number
  entries: CustodyHistoryEntry[]
}

interface CycleRange {
  cycle_number: number
  start_step: number | null
  end_step: number | null
}

/**
 * Stable order for moments recorded with the same timestamp: the order they
 * logically happen in (request → decision → assignment → pickup → receipt).
 */
const KIND_RANK: Record<CustodyHistoryKind, number> = {
  RELEASE_REQUESTED: 0,
  RELEASE_DECIDED: 1,
  LIAISON_ASSIGNED: 2,
  PICKED_UP: 3,
  RECEIVED: 4,
}

/** Parses ISO strings and Postgres timestamps ("2026-10-01 08:00:00+00"); NaN → null. */
export function toTime(value: unknown): number | null {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime()
  const raw = String(value).trim()
  let time = Date.parse(raw)
  if (Number.isNaN(time)) {
    // Postgres text form: space separator and a short "+00" offset.
    const iso = raw.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00')
    time = Date.parse(iso)
  }
  return Number.isNaN(time) ? null : time
}

/** The routing cycle a route step belongs to (1 for documents without cycles). */
export function cycleOfStep(step: number | null | undefined, cycles: CycleRange[]): number {
  if (!cycles.length || step == null) return cycles[0]?.cycle_number ?? 1
  const s = Number(step)
  const hit = cycles.find((c) => c.start_step != null && c.end_step != null && s >= Number(c.start_step) && s <= Number(c.end_step))
  if (hit) return hit.cycle_number
  // Outside every stored range: before the first cycle → first, otherwise the latest that started before it.
  const sorted = [...cycles].sort((a, b) => a.cycle_number - b.cycle_number)
  const before = sorted.filter((c) => c.start_step != null && Number(c.start_step) <= s)
  return (before[before.length - 1] ?? sorted[0])!.cycle_number
}

export function buildCustodyHistory(
  liaisonAssignments: any[],
  releaseRequests: any[],
  cycles: CycleRange[] = [],
): CustodyHistoryGroup[] {
  const entries: CustodyHistoryEntry[] = []
  const push = (kind: CustodyHistoryKind, at: unknown, id: unknown, cycle: number, extra: Partial<CustodyHistoryEntry>) => {
    const time = toTime(at)
    if (time === null) return
    entries.push({ key: `${kind}:${id}`, kind, at: String(at), time, cycle, ...extra })
  }

  for (const leg of liaisonAssignments ?? []) {
    // A leg delivers TO its step_number.
    const cycle = cycleOfStep(leg.step_number, cycles)
    push('LIAISON_ASSIGNED', leg.assigned_at, leg.id, cycle, { leg })
    push('PICKED_UP', leg.picked_up_at, leg.id, cycle, { leg })
    push('RECEIVED', leg.delivered_at, leg.id, cycle, { leg })
  }
  for (const release of releaseRequests ?? []) {
    // Releasing step N sends the document toward step N + 1 — that's the leg
    // (and cycle) it belongs to. A final-stop completion has no N + 1, and
    // cycleOfStep then falls back to the latest cycle, which is the right one.
    const step = release.step_number == null ? null : Number(release.step_number) + 1
    const cycle = cycleOfStep(step, cycles)
    push('RELEASE_REQUESTED', release.requested_at, release.id, cycle, { release })
    if (release.status === 'APPROVED' || release.status === 'REJECTED') {
      push('RELEASE_DECIDED', release.decided_at, release.id, cycle, { release })
    }
  }

  entries.sort((a, b) => a.time - b.time || KIND_RANK[a.kind] - KIND_RANK[b.kind] || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))

  const groups = new Map<number, CustodyHistoryEntry[]>()
  for (const entry of entries) {
    if (!groups.has(entry.cycle)) groups.set(entry.cycle, [])
    groups.get(entry.cycle)!.push(entry)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([cycle, list]) => ({ cycle, entries: list }))
}
