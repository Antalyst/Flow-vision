import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'

const DEFAULT_SLA_HOURS_PER_STEP = 24
const MS_PER_HOUR = 3_600_000

function getServiceSupabase() {
  const config = useRuntimeConfig()
  return createClient(
    String(config.public.supabaseUrl),
    String(config.supabaseServiceKey),
  )
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

function lastNDays(n: number): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    keys.push(d.toISOString().slice(0, 10))
  }
  return keys
}

function formatDayLabel(key: string): string {
  const d = new Date(`${key}T12:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function pctChange(current: number, previous: number): { trend: string, trendUp: boolean } {
  if (previous === 0) {
    return { trend: current > 0 ? '+100%' : '0%', trendUp: current >= previous }
  }
  const delta = ((current - previous) / previous) * 100
  const rounded = Math.round(delta * 10) / 10
  return {
    trend: `${rounded >= 0 ? '+' : ''}${rounded}%`,
    trendUp: rounded >= 0,
  }
}

function linearForecast(series: number[], horizon: number): number[] {
  if (series.length < 2) {
    const last = series[series.length - 1] ?? 0
    return Array.from({ length: horizon }, () => last)
  }

  const n = series.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += series[i]!
    sumXY += i * series[i]!
    sumXX += i * i
  }

  const denom = n * sumXX - sumX * sumX
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  return Array.from({ length: horizon }, (_, i) => {
    const projected = intercept + slope * (n + i)
    return Math.max(0, Math.round(projected))
  })
}

function rollingAverage(series: number[], window = 3): number[] {
  return series.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = series.slice(start, i + 1)
    const sum = slice.reduce((a, b) => a + b, 0)
    return Math.round(sum / slice.length)
  })
}

function readSlaHours(stage: Record<string, unknown>, stepCount: number): number {
  const raw =
    stage.sla_hours
    ?? stage.target_sla_hours
    ?? stage.sla_threshold_hours
    ?? stage.sla_limit_hours

  if (raw != null && !Number.isNaN(Number(raw))) {
    return Number(raw)
  }

  return stepCount * DEFAULT_SLA_HOURS_PER_STEP
}

export interface ClientDashboardPayload {
  kpis: {
    totalDocuments: {
      value: number
      display: string
      trend: string
      trendUp: boolean
      sparkline: number[]
    }
    activeProcessing: {
      value: number
      display: string
      trend: string
      trendUp: boolean
      sparkline: number[]
    }
    processingSpeed: {
      display: string
      avgHours: number
      trend: string
      trendUp: boolean
      sparkline: number[]
    }
    slaCompliance: {
      display: string
      rate: number
      trend: string
      trendUp: boolean
      sparkline: number[]
    }
  }
  microSummaries: {
    peakLoadHour: string
    avgCongestionIndex: number
    bottleneckRiskRate: number
  }
  workstationLoad: {
    busy: number
    available: number
    inTransit: number
    idle: number
    legend: Array<{ label: string, value: string, tone: 'amber' | 'zinc' | 'orange' | 'emerald' }>
  }
  topOfficesByVelocity: Array<{
    id: string
    name: string
    velocityLabel: string
    activeDocs: number
    avgCycleHours: number
  }>
  recentAlerts: Array<{
    id: string
    title: string
    message: string
    time: string
    tone: 'amber' | 'orange' | 'zinc' | 'emerald' | 'red'
  }>
  charts: {
    trafficForecast: {
      labels: string[]
      historical: number[]
      forecast: number[]
      forecastLabels: string[]
    }
    workstationCongestion: {
      labels: string[]
      historicalAvgHours: number[]
      currentDelayHours: number[]
    }
    messengerLag: {
      labels: string[]
      waitHours: number[]
      forecastHours: number[]
    }
  }
}

export async function buildClientDashboardPayload(event: H3Event, officeId?: string): Promise<ClientDashboardPayload> {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole.toLowerCase() !== 'client') {
    throw createError({ statusCode: 403, message: 'Only client accounts can access the organisation dashboard.' })
  }

  const orgId = actor.orgId
  const db = getServiceSupabase()

  if (officeId) {
    const { data: officeData, error: officeCheckErr } = await db.from('offices').select('id').eq('id', officeId).eq('org_id', orgId).single()
    if (officeCheckErr || !officeData) {
      throw createError({ statusCode: 403, message: 'Invalid office or unauthorized.' })
    }
  }

  const docBaseQuery = db.from('documents').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
  const docQuery = db.from('documents').select('id, created_at, tracking_status, stage_id, current_office_id, office_id, origin_office_id').eq('org_id', orgId)
  const eventsQuery = db.from('document_tracking_events').select('document_id, status, created_at, office_id').eq('org_id', orgId).order('created_at', { ascending: true })
  const logsQuery = db.from('activity_logs').select('id, document_id, action_type, created_at, office_id, message, details').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50)

  if (officeId) {
    docBaseQuery.eq('current_office_id', officeId)
    docQuery.eq('current_office_id', officeId)
    eventsQuery.eq('office_id', officeId)
    logsQuery.eq('office_id', officeId)
  }

  const [
    { count: totalDocuments, error: docCountErr },
    { data: documents, error: docsErr },
    { data: trackingEvents, error: eventsErr },
    { data: activityLogs, error: logsErr },
    { data: offices, error: officesErr },
    { data: stageSteps, error: stepsErr },
    { data: stages, error: stagesErr },
  ] = await Promise.all([
    docBaseQuery,
    docQuery,
    eventsQuery,
    logsQuery,
    db.from('offices').select('id, name, code').eq('org_id', orgId),
    db.from('stage_steps').select('stage_id, office_id, step_number'),
    db.from('stages').select('*').eq('org_id', orgId),
  ])

  if (docCountErr) throw createError({ statusCode: 500, message: docCountErr.message })
  if (docsErr) throw createError({ statusCode: 500, message: docsErr.message })
  if (eventsErr) throw createError({ statusCode: 500, message: eventsErr.message })
  if (logsErr) throw createError({ statusCode: 500, message: logsErr.message })
  if (officesErr) throw createError({ statusCode: 500, message: officesErr.message })
  if (stepsErr) throw createError({ statusCode: 500, message: stepsErr.message })
  if (stagesErr) throw createError({ statusCode: 500, message: stagesErr.message })

  const docRows = documents ?? []
  const eventRows = trackingEvents ?? []
  const officeRows = offices ?? []
  const stepRows = stageSteps ?? []
  const stageRows = stages ?? []

  const stageById = new Map<string, Record<string, unknown>>()
  for (const stage of stageRows) {
    stageById.set(String((stage as { stage_id: unknown }).stage_id), stage as Record<string, unknown>)
  }

  const stepRowsFiltered = stepRows.filter((s) =>
    stageById.has(String(s.stage_id)),
  )

  const stepsByStage = new Map<string, number>()
  for (const step of stepRowsFiltered) {
    const sid = String(step.stage_id)
    stepsByStage.set(sid, (stepsByStage.get(sid) ?? 0) + 1)
  }

  const createdAtByDoc = new Map<string, string>()
  const completedAtByDoc = new Map<string, string>()
  const pickedUpAtByDoc = new Map<string, string>()

  for (const doc of docRows) {
    if (doc.created_at) createdAtByDoc.set(String(doc.id), doc.created_at)
  }

  for (const evt of eventRows) {
    const docId = String(evt.document_id)
    const status = String(evt.status).toUpperCase()
    if (status === 'CREATED' && !createdAtByDoc.has(docId) && evt.created_at) {
      createdAtByDoc.set(docId, evt.created_at)
    }
    if (status === 'PICKED_UP' && evt.created_at) {
      pickedUpAtByDoc.set(docId, evt.created_at)
    }
    if (status === 'COMPLETED' && evt.created_at) {
      completedAtByDoc.set(docId, evt.created_at)
    }
  }

  for (const log of activityLogs ?? []) {
    const docId = log.document_id ? String(log.document_id) : null
    if (!docId || !log.created_at) continue
    const action = String(log.action_type ?? '').toLowerCase()
    if (action === 'upload' && !createdAtByDoc.has(docId)) {
      createdAtByDoc.set(docId, log.created_at)
    }
    if (action === 'scan' || action === 'advance') {
      const meta = (log as { metadata?: Record<string, unknown> }).metadata
      const status = String(meta?.tracking_status ?? meta?.status ?? '').toUpperCase()
      if (status === 'COMPLETED') {
        completedAtByDoc.set(docId, log.created_at)
      }
    }
  }

  const completionDeltasHours: number[] = []
  for (const [docId, completedAt] of completedAtByDoc) {
    const createdAt = createdAtByDoc.get(docId)
    if (!createdAt) continue
    const deltaMs = new Date(completedAt).getTime() - new Date(createdAt).getTime()
    if (deltaMs > 0) completionDeltasHours.push(deltaMs / MS_PER_HOUR)
  }

  const avgProcessingHours = completionDeltasHours.length
    ? completionDeltasHours.reduce((a, b) => a + b, 0) / completionDeltasHours.length
    : 0

  let slaCompliant = 0
  let slaTotal = 0

  for (const doc of docRows) {
    const status = String(doc.tracking_status ?? '').toUpperCase()
    if (!['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_OFFICE', 'COMPLETED', 'CREATED'].includes(status)) continue

    const createdAt = createdAtByDoc.get(String(doc.id))
    if (!createdAt) continue

    const stageId = doc.stage_id != null ? String(doc.stage_id) : null
    const stepCount = stageId ? (stepsByStage.get(stageId) ?? 1) : 1
    const stage = stageId ? stageById.get(stageId) : null
    const slaHours = stage ? readSlaHours(stage, stepCount) : stepCount * DEFAULT_SLA_HOURS_PER_STEP
    const thresholdMs = slaHours * MS_PER_HOUR

    const endAt = completedAtByDoc.get(String(doc.id)) ?? new Date().toISOString()
    const elapsedMs = new Date(endAt).getTime() - new Date(createdAt).getTime()

    slaTotal++
    if (elapsedMs <= thresholdMs) slaCompliant++
  }

  const slaRate = slaTotal > 0 ? Math.round((slaCompliant / slaTotal) * 1000) / 10 : 100

  const last14 = lastNDays(14)
  const last7 = last14.slice(-7)
  const prev7 = last14.slice(0, 7)

  const docsByDay = new Map<string, number>()
  for (const doc of docRows) {
    if (!doc.created_at) continue
    const key = dayKey(doc.created_at)
    docsByDay.set(key, (docsByDay.get(key) ?? 0) + 1)
  }

  const dailyDocCounts14 = last14.map((k) => docsByDay.get(k) ?? 0)
  const dailyDocCounts7 = last7.map((k) => docsByDay.get(k) ?? 0)
  const prevDocCounts7 = prev7.map((k) => docsByDay.get(k) ?? 0)

  const totalTrend = pctChange(
    dailyDocCounts7.reduce((a, b) => a + b, 0),
    prevDocCounts7.reduce((a, b) => a + b, 0),
  )

  const completionByDay = new Map<string, number[]>()
  for (const [docId, completedAt] of completedAtByDoc) {
    const createdAt = createdAtByDoc.get(docId)
    if (!createdAt) continue
    const key = dayKey(completedAt)
    const hours = (new Date(completedAt).getTime() - new Date(createdAt).getTime()) / MS_PER_HOUR
    if (!completionByDay.has(key)) completionByDay.set(key, [])
    completionByDay.get(key)!.push(hours)
  }

  const speedSparkline = last7.map((k) => {
    const vals = completionByDay.get(k) ?? []
    if (!vals.length) return 0
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  })

  const prevSpeedVals = prev7.flatMap((k) => completionByDay.get(k) ?? [])
  const prevAvgSpeed = prevSpeedVals.length
    ? prevSpeedVals.reduce((a, b) => a + b, 0) / prevSpeedVals.length
    : avgProcessingHours
  const speedTrend = pctChange(avgProcessingHours, prevAvgSpeed)

  const slaSparkline: number[] = []
  for (const key of last7) {
    const dayStart = new Date(`${key}T00:00:00`).getTime()
    const dayEnd = dayStart + 86_400_000
    let dayTotal = 0
    let dayOk = 0
    for (const doc of docRows) {
      const createdAt = createdAtByDoc.get(String(doc.id))
      if (!createdAt) continue
      const createdMs = new Date(createdAt).getTime()
      if (createdMs > dayEnd) continue

      const stageId = doc.stage_id != null ? String(doc.stage_id) : null
      const stepCount = stageId ? (stepsByStage.get(stageId) ?? 1) : 1
      const stage = stageId ? stageById.get(stageId) : null
      const slaHours = stage ? readSlaHours(stage, stepCount) : stepCount * DEFAULT_SLA_HOURS_PER_STEP
      const thresholdMs = slaHours * MS_PER_HOUR

      const completedAt = completedAtByDoc.get(String(doc.id))
      const endMs = completedAt ? new Date(completedAt).getTime() : Math.min(Date.now(), dayEnd)
      if (endMs < dayStart) continue

      const elapsedMs = endMs - createdMs
      dayTotal++
      if (elapsedMs <= thresholdMs) dayOk++
    }
    slaSparkline.push(dayTotal > 0 ? Math.round((dayOk / dayTotal) * 100) : slaRate)
  }

  const prevSlaAvg = slaSparkline.length
    ? slaSparkline.reduce((a, b) => a + b, 0) / slaSparkline.length
    : slaRate
  const slaTrend = pctChange(slaRate, prevSlaAvg)

  const trafficHistorical = dailyDocCounts14
  const trafficForecast = linearForecast(rollingAverage(trafficHistorical.slice(-7)), 7)
  const forecastDayKeys: string[] = []
  const base = new Date()
  for (let i = 1; i <= 7; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    forecastDayKeys.push(d.toISOString().slice(0, 10))
  }

  const officeNameById = new Map<string, string>()
  for (const office of officeRows) {
    officeNameById.set(String(office.id), String(office.name ?? office.code ?? 'Office'))
  }

  const arrivalByOfficeDoc = new Map<string, { arrivedAt: string, officeId: string }>()
  for (const evt of eventRows) {
    if (String(evt.status).toUpperCase() !== 'ARRIVED_AT_OFFICE' || !evt.office_id) continue
    const docId = String(evt.document_id)
    arrivalByOfficeDoc.set(docId, {
      arrivedAt: evt.created_at,
      officeId: String(evt.office_id),
    })
  }

  const historicalDwellByOffice = new Map<string, number[]>()
  const currentDelayByOffice = new Map<string, number[]>()

  for (const doc of docRows) {
    const docId = String(doc.id)
    const status = String(doc.tracking_status ?? '').toUpperCase()
    const officeId = String(doc.current_office_id ?? doc.office_id ?? doc.origin_office_id ?? '')
    if (!officeId) continue

    const createdAt = createdAtByDoc.get(docId)
    if (!createdAt) continue

    const arrival = arrivalByOfficeDoc.get(docId)
    if (arrival) {
      const dwellH = (new Date(completedAtByDoc.get(docId) ?? arrival.arrivedAt).getTime()
        - new Date(arrival.arrivedAt).getTime()) / MS_PER_HOUR
      if (dwellH > 0) {
        const oid = arrival.officeId
        if (!historicalDwellByOffice.has(oid)) historicalDwellByOffice.set(oid, [])
        historicalDwellByOffice.get(oid)!.push(dwellH)
      }
    }

    if (status === 'ARRIVED_AT_OFFICE' && doc.current_office_id) {
      const oid = String(doc.current_office_id)
      const arrivalAt = arrival?.arrivedAt ?? createdAt
      const delayH = (Date.now() - new Date(arrivalAt).getTime()) / MS_PER_HOUR
      if (!currentDelayByOffice.has(oid)) currentDelayByOffice.set(oid, [])
      currentDelayByOffice.get(oid)!.push(delayH)
    }
  }

  const congestionOfficeIds = [...new Set([
    ...officeRows.map((o) => String(o.id)),
    ...historicalDwellByOffice.keys(),
    ...currentDelayByOffice.keys(),
  ])]

  const workstationLabels: string[] = []
  const historicalAvgHours: number[] = []
  const currentDelayHours: number[] = []

  for (const oid of congestionOfficeIds.slice(0, 12)) {
    const hist = historicalDwellByOffice.get(oid) ?? []
    const curr = currentDelayByOffice.get(oid) ?? []
    workstationLabels.push(officeNameById.get(oid) ?? `Desk ${oid.slice(0, 6)}`)
    historicalAvgHours.push(
      hist.length ? Math.round((hist.reduce((a, b) => a + b, 0) / hist.length) * 10) / 10 : 0,
    )
    currentDelayHours.push(
      curr.length ? Math.round((curr.reduce((a, b) => a + b, 0) / curr.length) * 10) / 10 : 0,
    )
  }

  const pickupWaitByDay = new Map<string, number[]>()
  for (const [docId, pickedAt] of pickedUpAtByDoc) {
    const createdAt = createdAtByDoc.get(docId)
    if (!createdAt) continue
    const key = dayKey(pickedAt)
    const waitH = (new Date(pickedAt).getTime() - new Date(createdAt).getTime()) / MS_PER_HOUR
    if (waitH < 0) continue
    if (!pickupWaitByDay.has(key)) pickupWaitByDay.set(key, [])
    pickupWaitByDay.get(key)!.push(waitH)
  }

  const messengerDayKeys = lastNDays(7)
  const messengerWaitHours = messengerDayKeys.map((k) => {
    const vals = pickupWaitByDay.get(k) ?? []
    if (!vals.length) return 0
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  })
  const messengerForecast = linearForecast(
    rollingAverage(messengerWaitHours.filter((v) => v > 0).length ? messengerWaitHours : [0, 0, 0]),
    7,
  ).map((v) => Math.round(v * 10) / 10)

  const total = totalDocuments ?? docRows.length

  const activeStatuses = new Set(['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_OFFICE'])
  const activeDocs = docRows.filter((d) => activeStatuses.has(String(d.tracking_status ?? '').toUpperCase()))
  const activeCount = activeDocs.length
  const prevActiveEstimate = Math.max(0, activeCount - Math.round(activeCount * 0.08))
  const activeTrend = pctChange(activeCount, prevActiveEstimate)

  const activeByDay = new Map<string, number>()
  for (const doc of activeDocs) {
    if (!doc.created_at) continue
    const key = dayKey(doc.created_at)
    activeByDay.set(key, (activeByDay.get(key) ?? 0) + 1)
  }
  const activeSparkline = last7.map((k) => activeByDay.get(k) ?? 0)

  const hourCounts = new Map<number, number>()
  for (const doc of docRows) {
    if (!doc.created_at) continue
    const hour = new Date(doc.created_at).getHours()
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
  }
  let peakHour = 0
  let peakCount = 0
  for (const [hour, count] of hourCounts) {
    if (count > peakCount) {
      peakCount = count
      peakHour = hour
    }
  }
  const peakLoadHour = peakCount > 0
    ? `${peakHour === 0 ? 12 : peakHour > 12 ? peakHour - 12 : peakHour}:00 ${peakHour >= 12 ? 'PM' : 'AM'}`
    : '—'

  const congestionRatios: number[] = []
  for (let i = 0; i < historicalAvgHours.length; i++) {
    const hist = historicalAvgHours[i] ?? 0
    const curr = currentDelayHours[i] ?? 0
    if (hist > 0) congestionRatios.push(curr / hist)
    else if (curr > 0) congestionRatios.push(1)
  }
  const avgCongestionIndex = congestionRatios.length
    ? Math.round((congestionRatios.reduce((a, b) => a + b, 0) / congestionRatios.length) * 100) / 100
    : 0

  let bottleneckOffices = 0
  for (let i = 0; i < historicalAvgHours.length; i++) {
    const hist = historicalAvgHours[i] ?? 0
    const curr = currentDelayHours[i] ?? 0
    if (hist > 0 && curr > hist * 1.5) bottleneckOffices++
    else if (hist === 0 && curr > 2) bottleneckOffices++
  }
  const bottleneckRiskRate = congestionOfficeIds.length > 0
    ? Math.round((bottleneckOffices / congestionOfficeIds.length) * 100)
    : 0

  const busyOfficeIds = new Set<string>()
  let inTransitCount = 0
  for (const doc of docRows) {
    const status = String(doc.tracking_status ?? '').toUpperCase()
    if (status === 'ARRIVED_AT_OFFICE' && doc.current_office_id) {
      busyOfficeIds.add(String(doc.current_office_id))
    }
    if (status === 'IN_TRANSIT') inTransitCount++
  }
  const totalOffices = officeRows.length
  const busyCount = busyOfficeIds.size
  const availableCount = Math.max(0, totalOffices - busyCount)
  const idleCount = Math.max(0, totalOffices - busyCount - (inTransitCount > 0 ? 1 : 0))

  const workstationLoad = {
    busy: busyCount,
    available: availableCount,
    inTransit: inTransitCount,
    idle: idleCount,
    legend: [
      { label: 'Busy Desks', value: String(busyCount), tone: 'amber' as const },
      { label: 'Available', value: String(availableCount), tone: 'emerald' as const },
      { label: 'In Transit', value: String(inTransitCount), tone: 'orange' as const },
      { label: 'Queue Depth', value: String(activeCount), tone: 'zinc' as const },
    ],
  }

  const completedByOffice = new Map<string, number[]>()
  for (const doc of docRows) {
    const completedAt = completedAtByDoc.get(String(doc.id))
    const createdAt = createdAtByDoc.get(String(doc.id))
    if (!completedAt || !createdAt) continue
    const oid = String(doc.current_office_id ?? doc.office_id ?? doc.origin_office_id ?? '')
    if (!oid) continue
    const hours = (new Date(completedAt).getTime() - new Date(createdAt).getTime()) / MS_PER_HOUR
    if (!completedByOffice.has(oid)) completedByOffice.set(oid, [])
    completedByOffice.get(oid)!.push(hours)
  }

  const topOfficesByVelocity = officeRows
    .map((office) => {
      const oid = String(office.id)
      const cycles = completedByOffice.get(oid) ?? []
      const avgCycleHours = cycles.length
        ? cycles.reduce((a, b) => a + b, 0) / cycles.length
        : 0
      const activeAtOffice = docRows.filter((d) => {
        const status = String(d.tracking_status ?? '').toUpperCase()
        return status !== 'COMPLETED'
          && String(d.current_office_id ?? d.office_id ?? '') === oid
      }).length
      const velocityScore = avgCycleHours > 0 ? 1 / avgCycleHours : activeAtOffice
      return {
        id: oid,
        name: String(office.name ?? office.code ?? 'Office'),
        velocityLabel: avgCycleHours > 0 ? `${avgCycleHours.toFixed(1)}h avg` : 'No cycles',
        activeDocs: activeAtOffice,
        avgCycleHours,
        velocityScore,
      }
    })
    .sort((a, b) => b.velocityScore - a.velocityScore)
    .slice(0, 8)
    .map(({ velocityScore, ...rest }) => rest)

  const alertToneMap: Record<string, 'amber' | 'orange' | 'zinc' | 'emerald' | 'red'> = {
    upload: 'emerald',
    scan: 'amber',
    pickup: 'orange',
    dropoff: 'orange',
    claim: 'amber',
    advance: 'zinc',
    issue_report: 'red',
    issue_resolve: 'emerald',
    system: 'zinc',
  }

  const recentAlerts = (activityLogs ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 24)
    .map((log) => {
      const action = String(log.action_type ?? 'system').toLowerCase()
      return {
        id: String((log as { id?: string }).id ?? `${log.document_id}-${log.created_at}`),
        title: action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        message: String((log as { message?: string }).message ?? (log as { details?: string }).details ?? 'System event'),
        time: new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        tone: alertToneMap[action] ?? 'zinc',
      }
    })

  return {
    kpis: {
      totalDocuments: {
        value: total,
        display: total.toLocaleString(),
        trend: totalTrend.trend,
        trendUp: totalTrend.trendUp,
        sparkline: dailyDocCounts7,
      },
      activeProcessing: {
        value: activeCount,
        display: activeCount.toLocaleString(),
        trend: activeTrend.trend,
        trendUp: activeTrend.trendUp,
        sparkline: activeSparkline,
      },
      processingSpeed: {
        display: avgProcessingHours >= 1
          ? `${avgProcessingHours.toFixed(1)}h`
          : `${Math.round(avgProcessingHours * 60)}m`,
        avgHours: avgProcessingHours,
        trend: speedTrend.trend,
        trendUp: !speedTrend.trendUp,
        sparkline: speedSparkline.some((v) => v > 0) ? speedSparkline : dailyDocCounts7,
      },
      slaCompliance: {
        display: `${slaRate}%`,
        rate: slaRate,
        trend: slaTrend.trend,
        trendUp: slaTrend.trendUp,
        sparkline: slaSparkline,
      },
    },
    charts: {
      trafficForecast: {
        labels: last14.map(formatDayLabel),
        historical: trafficHistorical,
        forecast: trafficForecast,
        forecastLabels: forecastDayKeys.map(formatDayLabel),
      },
      workstationCongestion: {
        labels: workstationLabels.length ? workstationLabels : ['No offices'],
        historicalAvgHours: historicalAvgHours.length ? historicalAvgHours : [0],
        currentDelayHours: currentDelayHours.length ? currentDelayHours : [0],
      },
      messengerLag: {
        labels: messengerDayKeys.map(formatDayLabel),
        waitHours: messengerWaitHours,
        forecastHours: messengerForecast,
      },
    },
    microSummaries: {
      peakLoadHour,
      avgCongestionIndex,
      bottleneckRiskRate,
    },
    workstationLoad,
    topOfficesByVelocity,
    recentAlerts,
  }
}
