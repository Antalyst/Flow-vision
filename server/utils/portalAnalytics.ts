import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'

const DEFAULT_SLA_HOURS_PER_STEP = 24
const MS_PER_HOUR = 3_600_000

function getServiceSupabase() {
  const config = useRuntimeConfig()
  return createClient(String(config.public.supabaseUrl), String(config.supabaseServiceKey))
}

function readSlaHoursPerStep(stage: Record<string, unknown> | null, totalSteps: number): number {
  const raw =
    stage?.sla_hours
    ?? stage?.target_sla_hours
    ?? stage?.sla_threshold_hours
    ?? stage?.sla_limit_hours

  if (raw != null && !Number.isNaN(Number(raw))) {
    const whole = Number(raw)
    return totalSteps > 0 ? whole / totalSteps : whole
  }

  return DEFAULT_SLA_HOURS_PER_STEP
}

export interface SlaComplianceRow {
  id: string
  title: string
  tracking_id: string
  checkpoint_label: string
  current_step: number
  total_steps: number
  hours_at_checkpoint: number
  sla_hours_allowed: number
  sla_status: 'in_compliance' | 'overdue'
  tracking_status: string
}

export interface WorkloadStationRow {
  office_id: string
  office_name: string
  pending_count: number
  flagged_count: number
  in_transit_count: number
  avg_hours_at_desk: number
  is_bottleneck: boolean
}

export interface WorkloadAnalyticsPayload {
  summary: {
    total_active: number
    total_pending: number
    total_flagged: number
    bottleneck_office: string | null
    org_avg_step_hours: number
  }
  stations: WorkloadStationRow[]
}

async function resolveClientOrg(event: H3Event) {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)
  if (actor.userRole.toLowerCase() !== 'client') {
    throw createError({ statusCode: 403, message: 'Only client accounts can access organisation analytics.' })
  }
  return { orgId: actor.orgId, db: getServiceSupabase() }
}

export async function buildSlaComplianceRows(event: H3Event): Promise<{
  summary: { total: number; overdue: number; in_compliance: number }
  rows: SlaComplianceRow[]
}> {
  const { orgId, db } = await resolveClientOrg(event)

  const [
    { data: documents, error: docsErr },
    { data: trackingEvents, error: eventsErr },
    { data: offices, error: officesErr },
    { data: stages, error: stagesErr },
    { data: stageSteps, error: stepsErr },
  ] = await Promise.all([
    db.from('documents').select(
      'id, title, tracking_status, current_step, stage_id, qr_code_data, current_office_id, office_id, created_at',
    ).eq('org_id', orgId).neq('tracking_status', 'COMPLETED'),
    db.from('document_tracking_events').select('document_id, status, step_index, created_at, office_name')
      .eq('org_id', orgId).order('created_at', { ascending: true }),
    db.from('offices').select('id, name, code').eq('org_id', orgId),
    db.from('stages').select('stage_id, name, sla_hours, target_sla_hours, sla_threshold_hours, sla_limit_hours').eq('org_id', orgId),
    db.from('stage_steps').select('stage_id, step_number, office_id'),
  ])

  if (docsErr) throw createError({ statusCode: 500, message: docsErr.message })
  if (eventsErr) throw createError({ statusCode: 500, message: eventsErr.message })

  const officeNameById = new Map<string, string>()
  for (const o of offices ?? []) {
    const label = o.code ? `${o.name} (${o.code})` : String(o.name)
    officeNameById.set(String(o.id), label)
  }

  const stepsByStage = new Map<string, number>()
  for (const s of stageSteps ?? []) {
    const sid = String(s.stage_id)
    stepsByStage.set(sid, (stepsByStage.get(sid) ?? 0) + 1)
  }

  const stageById = new Map<string, Record<string, unknown>>()
  for (const s of stages ?? []) {
    stageById.set(String(s.stage_id), s as Record<string, unknown>)
  }

  const eventsByDoc = new Map<string, Array<{ status: string; step_index: number; created_at: string; office_name: string | null }>>()
  for (const evt of trackingEvents ?? []) {
    const docId = String(evt.document_id)
    if (!eventsByDoc.has(docId)) eventsByDoc.set(docId, [])
    eventsByDoc.get(docId)!.push({
      status: String(evt.status ?? ''),
      step_index: Number(evt.step_index ?? 0),
      created_at: String(evt.created_at),
      office_name: evt.office_name ? String(evt.office_name) : null,
    })
  }

  const rows: SlaComplianceRow[] = []
  const now = Date.now()

  for (const doc of documents ?? []) {
    const docId = String(doc.id)
    const currentStep = Number(doc.current_step ?? 0)
    const stageId = doc.stage_id != null ? String(doc.stage_id) : null
    const totalSteps = stageId ? (stepsByStage.get(stageId) ?? 1) : 1
    const stage = stageId ? stageById.get(stageId) ?? null : null
    const slaHoursAllowed = readSlaHoursPerStep(stage, totalSteps)

    const officeId = doc.current_office_id ?? doc.office_id
    const checkpointLabel = officeId
      ? (officeNameById.get(String(officeId)) ?? 'Unknown checkpoint')
      : 'Origin / unassigned'

    const docEvents = eventsByDoc.get(docId) ?? []
    const stepEvents = docEvents.filter((e) => e.step_index === currentStep)
    const arrivedEvent = [...stepEvents].reverse().find((e) => e.status === 'ARRIVED_AT_OFFICE')
      ?? [...stepEvents].reverse()[0]
      ?? docEvents[docEvents.length - 1]

    const stationStartMs = arrivedEvent?.created_at
      ? new Date(arrivedEvent.created_at).getTime()
      : new Date(doc.created_at ?? Date.now()).getTime()

    const hoursAtCheckpoint = Math.round(((now - stationStartMs) / MS_PER_HOUR) * 10) / 10
    const overdue = hoursAtCheckpoint > slaHoursAllowed

    rows.push({
      id: docId,
      title: String(doc.title ?? 'Untitled'),
      tracking_id: doc.qr_code_data ? String(doc.qr_code_data) : docId.slice(0, 8).toUpperCase(),
      checkpoint_label: arrivedEvent?.office_name ?? checkpointLabel,
      current_step: currentStep,
      total_steps: totalSteps,
      hours_at_checkpoint: hoursAtCheckpoint,
      sla_hours_allowed: Math.round(slaHoursAllowed * 10) / 10,
      sla_status: overdue ? 'overdue' : 'in_compliance',
      tracking_status: String(doc.tracking_status ?? 'CREATED'),
    })
  }

  rows.sort((a, b) => {
    if (a.sla_status === b.sla_status) return b.hours_at_checkpoint - a.hours_at_checkpoint
    return a.sla_status === 'overdue' ? -1 : 1
  })

  return {
    summary: {
      total: rows.length,
      overdue: rows.filter((r) => r.sla_status === 'overdue').length,
      in_compliance: rows.filter((r) => r.sla_status === 'in_compliance').length,
    },
    rows,
  }
}

export async function buildWorkloadAnalytics(event: H3Event): Promise<WorkloadAnalyticsPayload> {
  const { orgId, db } = await resolveClientOrg(event)

  const [
    { data: documents },
    { data: offices },
    { data: issues },
    { data: trackingEvents },
  ] = await Promise.all([
    db.from('documents').select(
      'id, tracking_status, current_step, current_office_id, office_id, origin_office_id, checkpoint_cleared_step',
    ).eq('org_id', orgId).neq('tracking_status', 'COMPLETED'),
    db.from('offices').select('id, name, code').eq('org_id', orgId),
    db.from('document_issues').select('id, target_office_id, reported_by_office_id, status').eq('org_id', orgId).eq('status', 'open'),
    db.from('document_tracking_events').select('document_id, step_index, created_at, status')
      .eq('org_id', orgId).eq('status', 'ARRIVED_AT_OFFICE'),
  ])

  const officeNameById = new Map<string, string>()
  for (const o of offices ?? []) {
    officeNameById.set(String(o.id), o.code ? `${o.name} (${o.code})` : String(o.name))
  }

  const flaggedByOffice = new Map<string, number>()
  for (const issue of issues ?? []) {
    const oid = String(issue.target_office_id ?? issue.reported_by_office_id ?? '')
    if (!oid) continue
    flaggedByOffice.set(oid, (flaggedByOffice.get(oid) ?? 0) + 1)
  }

  const deskHoursByOffice = new Map<string, number[]>()
  const now = Date.now()
  for (const evt of trackingEvents ?? []) {
    const hours = (now - new Date(String(evt.created_at)).getTime()) / MS_PER_HOUR
    const doc = (documents ?? []).find((d) => String(d.id) === String(evt.document_id))
    const officeId = doc?.current_office_id ?? doc?.office_id
    if (!officeId) continue
    const oid = String(officeId)
    if (!deskHoursByOffice.has(oid)) deskHoursByOffice.set(oid, [])
    deskHoursByOffice.get(oid)!.push(hours)
  }

  const stationStats = new Map<string, { pending: number; inTransit: number }>()
  const ensure = (oid: string) => {
    if (!stationStats.has(oid)) stationStats.set(oid, { pending: 0, inTransit: 0 })
    return stationStats.get(oid)!
  }

  for (const doc of documents ?? []) {
    const status = String(doc.tracking_status ?? '')
    const officeId = String(doc.current_office_id ?? doc.origin_office_id ?? doc.office_id ?? '')
    if (!officeId) continue

    const stats = ensure(officeId)
    if (status === 'IN_TRANSIT') {
      stats.inTransit++
    } else if (
      status === 'ARRIVED_AT_OFFICE'
      && (doc.checkpoint_cleared_step ?? null) !== (doc.current_step ?? 0)
    ) {
      stats.pending++
    } else if (status === 'CREATED' || status === 'PICKED_UP') {
      stats.pending++
    }
  }

  const allOfficeIds = new Set([
    ...Array.from(officeNameById.keys()),
    ...Array.from(stationStats.keys()),
  ])

  let maxPending = 0
  let bottleneckOffice: string | null = null
  const stations: WorkloadStationRow[] = []

  for (const officeId of allOfficeIds) {
    const stats = stationStats.get(officeId) ?? { pending: 0, inTransit: 0 }
    const pending = stats.pending
    const flagged = flaggedByOffice.get(officeId) ?? 0
    const hoursList = deskHoursByOffice.get(officeId) ?? []
    const avgHours = hoursList.length
      ? Math.round((hoursList.reduce((a, b) => a + b, 0) / hoursList.length) * 10) / 10
      : 0

    if (pending > maxPending) {
      maxPending = pending
      bottleneckOffice = officeNameById.get(officeId) ?? officeId
    }

    stations.push({
      office_id: officeId,
      office_name: officeNameById.get(officeId) ?? `Office ${officeId.slice(0, 6)}`,
      pending_count: pending,
      flagged_count: flagged,
      in_transit_count: stats.inTransit,
      avg_hours_at_desk: avgHours,
      is_bottleneck: false,
    })
  }

  stations.sort((a, b) => b.pending_count - a.pending_count)
  if (stations.length && maxPending > 0) {
    stations[0]!.is_bottleneck = true
  }

  const allDeskHours = stations.flatMap((s) => {
    const list = deskHoursByOffice.get(s.office_id) ?? []
    return list
  })

  return {
    summary: {
      total_active: (documents ?? []).length,
      total_pending: stations.reduce((a, s) => a + s.pending_count, 0),
      total_flagged: stations.reduce((a, s) => a + s.flagged_count, 0),
      bottleneck_office: bottleneckOffice,
      org_avg_step_hours: allDeskHours.length
        ? Math.round((allDeskHours.reduce((a, b) => a + b, 0) / allDeskHours.length) * 10) / 10
        : 0,
    },
    stations,
  }
}
