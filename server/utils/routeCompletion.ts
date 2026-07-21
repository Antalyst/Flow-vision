import type { SupabaseClient } from '@supabase/supabase-js'

export interface RouteContext {
  totalSteps: number
  maxStepNumber: number
  finalOfficeId: string | null
}

export async function getRouteContext(
  client: SupabaseClient,
  stageId: string | number | null | undefined,
): Promise<RouteContext> {
  if (stageId == null) {
    return { totalSteps: 0, maxStepNumber: 0, finalOfficeId: null }
  }

  const { data: steps } = await client
    .from('stage_steps')
    .select('office_id, step_number')
    .eq('stage_id', stageId)
    .order('step_number', { ascending: true })

  const rows = steps ?? []
  const totalSteps = rows.length
  const maxStepNumber = rows.reduce((max, row) => Math.max(max, row.step_number ?? 0), 0)
  const finalRow = rows.find((row) => row.step_number === maxStepNumber) ?? rows[rows.length - 1]

  return {
    totalSteps,
    maxStepNumber,
    finalOfficeId: finalRow?.office_id != null ? String(finalRow.office_id) : null,
  }
}

export async function resolveOfficeName(
  client: SupabaseClient,
  officeId: string | null | undefined,
): Promise<string | null> {
  if (!officeId) return null

  const { data } = await client
    .from('offices')
    .select('name')
    .eq('id', String(officeId))
    .maybeSingle()

  return data?.name ?? null
}

/** True when the document cursor is on the last route step at the final office desk. */
export async function isDocumentAtFinalRouteStop(
  client: SupabaseClient,
  doc: {
    stage_id?: string | number | null
    current_step?: number | null
    current_office_id?: string | number | null
    office_id?: string | number | null
  },
): Promise<boolean> {
  const route = await getRouteContext(client, doc.stage_id)
  if (route.totalSteps === 0 || !route.finalOfficeId) return false

  const currentStep = doc.current_step ?? 0
  if (currentStep < route.maxStepNumber) return false

  const officeId = doc.current_office_id ?? doc.office_id ?? null
  if (!officeId) return false

  return String(officeId) === route.finalOfficeId
}

export async function resolveRouteOfficeAtStep(
  client: SupabaseClient,
  stageId: string | number | null | undefined,
  stepNumber: number,
): Promise<{ officeId: string | null; officeName: string | null }> {
  if (stageId == null || stepNumber < 1) {
    return { officeId: null, officeName: null }
  }

  const { data: stepRow } = await client
    .from('stage_steps')
    .select('office_id, offices(name)')
    .eq('stage_id', stageId)
    .eq('step_number', stepNumber)
    .maybeSingle()

  if (!stepRow?.office_id) {
    return { officeId: null, officeName: null }
  }

  const officeName = (stepRow as { offices?: { name?: string } }).offices?.name ?? null
  return { officeId: String(stepRow.office_id), officeName }
}
