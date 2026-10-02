/**
 * server/utils/documentRoute.ts
 *
 * A document's route is now its OWN ordered list of destination offices,
 * copied into `document_route_stops` when the document is created. Editing or
 * deleting a saved route (`stages` + `stage_steps`) never changes it.
 *
 * Documents created before this table existed were backfilled from their
 * stage; `getDocumentRoute` still falls back to `stage_steps` for any
 * document without stops, so nothing older breaks.
 *
 * The new lifecycle tables (route stops, release requests, liaison
 * assignments) have RLS enabled with no policies, so they're reached with the
 * service-role client — only ever on the server, after the caller's identity
 * and permissions were checked.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let serviceClient: SupabaseClient | null = null
export function lifecycleDb(): SupabaseClient {
  if (!serviceClient) {
    const config = useRuntimeConfig()
    serviceClient = createClient(String(config.public.supabaseUrl), String(config.supabaseServiceKey), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return serviceClient
}

export interface RouteStop {
  step_number: number
  office_id: string
  office_name: string
  /** Routing cycle this stop belongs to (recurring documents); 1 for everything else. */
  cycle_number?: number
  /** The automatic "return to the creator's office" stop that ends a recurring cycle. */
  is_return?: boolean
}

interface RouteDocRef {
  id: string
  stage_id?: string | number | null
}

async function stageStops(stageId: string | number): Promise<RouteStop[]> {
  const { data } = await lifecycleDb()
    .from('stage_steps')
    .select('step_number, office_id, offices(name)')
    .eq('stage_id', stageId)
    .order('step_number', { ascending: true })
  return (data ?? []).map((s: any) => ({
    step_number: Number(s.step_number),
    office_id: String(s.office_id),
    office_name: s.offices?.name ?? 'Office',
    cycle_number: 1,
    is_return: false,
  }))
}

// Recurring-routing columns (cycle_number, is_return) come from a separate
// migration. Until it has run, fall back to the base columns so standard
// routing keeps working.
const BASE_STOP_COLUMNS = 'step_number, office_id, office_name'
const CYCLE_STOP_COLUMNS = `${BASE_STOP_COLUMNS}, cycle_number, is_return`
let cycleColumnsAvailable: boolean | null = null

async function selectStops(apply: (columns: string) => PromiseLike<{ data: any[] | null; error: any }>) {
  if (cycleColumnsAvailable !== false) {
    const res = await apply(CYCLE_STOP_COLUMNS)
    if (!res.error) { cycleColumnsAvailable = true; return res }
    if (res.error.code !== '42703') return res
    cycleColumnsAvailable = false
  }
  return apply(BASE_STOP_COLUMNS)
}

/** The document's ordered route (step 1 = first destination after the origin). */
export async function getDocumentRoute(doc: RouteDocRef): Promise<RouteStop[]> {
  const { data, error } = await selectStops((columns) => lifecycleDb()
    .from('document_route_stops')
    .select(columns)
    .eq('document_id', doc.id)
    .order('step_number', { ascending: true }))
  if (error) console.error('[documentRoute] route lookup failed:', error.message)

  if (data && data.length > 0) {
    return data.map((s: any) => ({
      step_number: Number(s.step_number),
      office_id: String(s.office_id),
      office_name: s.office_name ?? 'Office',
      cycle_number: Number(s.cycle_number ?? 1),
      is_return: !!s.is_return,
    }))
  }
  return doc.stage_id ? stageStops(doc.stage_id) : []
}

/** Routes for many documents at once (lists). Falls back to stage_steps per stage. */
export async function getDocumentRoutes(docs: RouteDocRef[]): Promise<Map<string, RouteStop[]>> {
  const result = new Map<string, RouteStop[]>()
  if (docs.length === 0) return result

  const { data } = await selectStops((columns) => lifecycleDb()
    .from('document_route_stops')
    .select(`document_id, ${columns}`)
    .in('document_id', docs.map((d) => d.id))
    .order('step_number', { ascending: true }))

  for (const row of data ?? []) {
    const list = result.get(String(row.document_id)) ?? []
    list.push({
      step_number: Number(row.step_number),
      office_id: String(row.office_id),
      office_name: row.office_name ?? 'Office',
      cycle_number: Number(row.cycle_number ?? 1),
      is_return: !!row.is_return,
    })
    result.set(String(row.document_id), list)
  }

  const stageCache = new Map<string, RouteStop[]>()
  for (const doc of docs) {
    if (result.has(doc.id) || !doc.stage_id) continue
    const key = String(doc.stage_id)
    if (!stageCache.has(key)) stageCache.set(key, await stageStops(key))
    result.set(doc.id, stageCache.get(key)!)
  }
  return result
}

export function routeStopAt(route: RouteStop[], stepNumber: number): RouteStop | null {
  return route.find((s) => s.step_number === stepNumber) ?? null
}

export function finalRouteStop(route: RouteStop[]): RouteStop | null {
  return route.reduce<RouteStop | null>((last, s) => (!last || s.step_number > last.step_number ? s : last), null)
}

/** True when the document is at (or headed to) the last stop of its route. */
export function isFinalStep(route: RouteStop[], stepNumber: number): boolean {
  const last = finalRouteStop(route)
  return !!last && stepNumber >= last.step_number
}

/**
 * Validates a user-built route: every office must exist and belong to `orgId`;
 * duplicates and the origin office are rejected. Returns the ordered stops.
 */
export async function validateRouteOffices(
  orgId: string,
  officeIds: string[],
  originOfficeId: string | null,
): Promise<RouteStop[]> {
  const ids = officeIds.map((id) => String(id).trim()).filter(Boolean)
  if (ids.length === 0) {
    throw createError({ statusCode: 400, message: 'Add at least one destination office to the route.' })
  }
  if (ids.length > 50) {
    throw createError({ statusCode: 400, message: 'A route can have at most 50 destination offices.' })
  }
  if (new Set(ids).size !== ids.length) {
    throw createError({ statusCode: 400, message: 'Each office can only appear once in a route.' })
  }
  if (originOfficeId && ids.includes(String(originOfficeId))) {
    throw createError({ statusCode: 400, message: 'The origin office cannot also be a destination.' })
  }

  const { data: offices, error } = await lifecycleDb()
    .from('offices')
    .select('id, name, org_id')
    .in('id', ids)
  if (error) throw createError({ statusCode: 500, message: 'We could not check the route offices. Please try again.' })

  const byId = new Map((offices ?? []).map((o: any) => [String(o.id), o]))
  for (const id of ids) {
    const office = byId.get(id)
    if (!office) throw createError({ statusCode: 404, message: 'One of the selected offices no longer exists.' })
    if (String(office.org_id) !== orgId) {
      throw createError({ statusCode: 403, message: 'Every office in the route must belong to your organization.' })
    }
  }

  return ids.map((id, index) => ({
    step_number: index + 1,
    office_id: id,
    office_name: byId.get(id)?.name ?? 'Office',
  }))
}

/**
 * Stores route stops for a document.
 *
 * Default (document creation): upsert that ignores rows already stored, so a
 * retried creation can't duplicate the route.
 *
 * `strict` (adding a recurring cycle): plain insert — a step number that
 * already exists is an ERROR, never silently skipped — and the number of
 * rows written is verified. Postgres inserts the batch in one statement, so
 * on failure nothing from it is stored.
 */
export async function saveDocumentRoute(
  documentId: string,
  orgId: string,
  route: RouteStop[],
  options: { strict?: boolean } = {},
) {
  if (route.length === 0) return
  const isRecurringRoute = route.some((s) => s.is_return || (s.cycle_number ?? 1) > 1)
  const rows = route.map((s) => ({
    document_id: documentId,
    org_id: orgId,
    step_number: s.step_number,
    office_id: s.office_id,
    office_name: s.office_name,
    // Cycle columns only when needed (recurring), so standard routes still
    // save before the recurring-routing migration has been run.
    ...(isRecurringRoute ? { cycle_number: s.cycle_number ?? 1, is_return: !!s.is_return } : {}),
  }))

  if (options.strict) {
    const { data, error } = await lifecycleDb().from('document_route_stops').insert(rows).select('step_number')
    if (error) {
      console.error('[documentRoute] strict route insert failed:', error.code, error.message)
      throw createError({
        statusCode: error.code === '23505' ? 409 : 500,
        message: error.code === '23505'
          ? 'This route overlaps steps the document already has. Refresh and try again.'
          : 'The new route could not be stored. Please try again.',
        data: { code: error.code === '23505' ? 'ROUTE_STEP_CONFLICT' : 'ROUTE_SAVE_FAILED' },
      })
    }
    if ((data?.length ?? 0) !== rows.length) {
      console.error('[documentRoute] strict route insert stored', data?.length ?? 0, 'of', rows.length, 'stops')
      throw createError({ statusCode: 500, message: 'The new route could not be stored completely. Please try again.', data: { code: 'ROUTE_SAVE_INCOMPLETE' } })
    }
    return
  }

  const { error } = await lifecycleDb()
    .from('document_route_stops')
    .upsert(rows, { onConflict: 'document_id,step_number', ignoreDuplicates: true })
  if (error) {
    console.error('[documentRoute] could not save route snapshot:', error.message)
    throw createError({ statusCode: 500, message: 'The document was saved, but its route could not be stored. Please contact support.' })
  }
}

/** The user who heads `officeId` (offices.assigned_user) — the only release approver. */
export async function getOfficeHeadId(officeId: string | null | undefined): Promise<string | null> {
  if (!officeId) return null
  const { data } = await lifecycleDb().from('offices').select('assigned_user').eq('id', officeId).maybeSingle()
  return data?.assigned_user ? String(data.assigned_user) : null
}

/**
 * Recurring routing: the stops of a new cycle, numbered after `lastStep`, with
 * the automatic return to the creator's office appended as the final stop.
 */
export function buildCycleStops(
  destinations: RouteStop[],
  originOfficeId: string,
  originOfficeName: string,
  cycleNumber: number,
  lastStep: number,
): RouteStop[] {
  const stops = destinations.map((d, i) => ({
    step_number: lastStep + i + 1,
    office_id: d.office_id,
    office_name: d.office_name,
    cycle_number: cycleNumber,
    is_return: false,
  }))
  stops.push({
    step_number: lastStep + destinations.length + 1,
    office_id: originOfficeId,
    office_name: originOfficeName,
    cycle_number: cycleNumber,
    is_return: true,
  })
  return stops
}
