import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext, resolveActorContextWithOffices } from '~~/server/utils/actorContext'

function getServiceSupabase() {
  const config = useRuntimeConfig()
  return createClient(String(config.public.supabaseUrl), String(config.supabaseServiceKey))
}

export interface OperationalReportRow {
  id: string
  org_id: string
  submitted_by: string
  submitter_role: string
  submitter_name?: string | null
  report_type: string
  title: string
  body: string
  scope: string
  metadata: Record<string, unknown> | null
  created_at: string
}

async function broadcastReportToClients(input: {
  orgId: string
  reportId: string
  title: string
  body: string
  submitterRole: string
  submitterName: string | null
}) {
  const db = getServiceSupabase()

  const { data: clients } = await db
    .from('users')
    .select('user_id')
    .eq('org_id', input.orgId)
    .ilike('role', 'client')

  const clientIds = (clients ?? []).map((c) => String(c.user_id))
  if (!clientIds.length) return 0

  const message =
    `${input.submitterName || `A ${input.submitterRole}`} submitted an operational report: "${input.title}". ` +
    `${input.body.slice(0, 200)}${input.body.length > 200 ? '…' : ''}`

  const rows = clientIds.map((userId) => ({
    org_id: input.orgId,
    user_id: userId,
    target_role: 'client',
    title: 'Operational Report Received',
    message,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
    metadata: {
      report_kind: 'operational',
      report_id: input.reportId,
      submitter_role: input.submitterRole,
    },
  }))

  const { error } = await db.from('notifications').insert(rows)
  if (error) {
    console.error('[reports] Client broadcast failed:', error.message)
    return 0
  }

  return rows.length
}

export async function submitOperationalReport(
  event: H3Event,
  input: {
    report_type: string
    title: string
    body: string
    scope?: string
    metadata?: Record<string, unknown>
  },
) {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)
  const role = actor.userRole.toLowerCase()

  if (!['employee', 'messenger', 'client'].includes(role)) {
    throw createError({ statusCode: 403, message: 'Your account role cannot submit operational reports.' })
  }

  if (!input.title?.trim() || !input.body?.trim()) {
    throw createError({ statusCode: 400, message: 'Report title and body are required.' })
  }

  const db = getServiceSupabase()
  const scope = input.scope?.trim() || (role === 'employee' ? 'LOCAL' : 'GLOBAL')

  const { data: report, error } = await db
    .from('operational_reports')
    .insert({
      org_id: actor.orgId,
      submitted_by: actor.userId,
      submitter_role: role,
      report_type: input.report_type,
      title: input.title.trim(),
      body: input.body.trim(),
      scope,
      metadata: input.metadata ?? {},
    })
    .select('id, org_id, submitted_by, submitter_role, report_type, title, body, scope, metadata, created_at')
    .single()

  if (error || !report) {
    throw createError({ statusCode: 500, message: error?.message || 'Failed to save operational report.' })
  }

  let broadcastCount = 0
  if (role === 'employee' || role === 'messenger') {
    broadcastCount = await broadcastReportToClients({
      orgId: actor.orgId,
      reportId: String(report.id),
      title: report.title,
      body: report.body,
      submitterRole: role,
      submitterName: actor.fullName,
    })
  }

  return { report: report as OperationalReportRow, broadcastCount }
}

export async function listOperationalReports(event: H3Event) {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)
  const role = actor.userRole.toLowerCase()
  const db = getServiceSupabase()

  let query = db
    .from('operational_reports')
    .select('id, org_id, submitted_by, submitter_role, report_type, title, body, scope, metadata, created_at')
    .eq('org_id', actor.orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (role === 'employee' || role === 'messenger') {
    query = query.eq('submitted_by', actor.userId)
  }

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })

  const submitterIds = [...new Set((data ?? []).map((r) => String(r.submitted_by)))]
  let nameById: Record<string, string> = {}
  if (submitterIds.length) {
    const { data: users } = await db.from('users').select('user_id, full_name').in('user_id', submitterIds)
    nameById = (users ?? []).reduce((acc: Record<string, string>, u) => {
      acc[String(u.user_id)] = String(u.full_name ?? '')
      return acc
    }, {})
  }

  const reports = (data ?? []).map((r) => ({
    ...r,
    submitter_name: nameById[String(r.submitted_by)] ?? null,
  }))

  return reports as OperationalReportRow[]
}

export async function countUnreadOperationalReports(event: H3Event): Promise<number> {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole.toLowerCase() !== 'client') return 0

  const db = getServiceSupabase()
  const { count, error } = await db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', actor.orgId)
    .eq('user_id', actor.userId)
    .ilike('target_role', 'client')
    .eq('is_read', false)
    .ilike('title', '%Operational Report%')

  if (error) return 0
  return count ?? 0
}

export async function buildEmployeeReportContext(event: H3Event) {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  const db = getServiceSupabase()
  const officeList = actor.officeIds.join(',')

  let docQuery = db
    .from('documents')
    .select('id, title, tracking_status, current_step, checkpoint_cleared_step, created_at')
    .eq('org_id', actor.orgId)
    .in('tracking_status', ['ARRIVED_AT_OFFICE', 'DISCREPANCY_REPORTED'])

  if (actor.officeIds.length) {
    docQuery = docQuery.or(`current_office_id.in.(${officeList}),origin_office_id.in.(${officeList})`)
  } else {
    docQuery = docQuery.eq('user_id', actor.userId)
  }

  const [{ data: docs }, { data: issues }] = await Promise.all([
    docQuery,
    db.from('document_issues').select('id, title, status, target_office_id').eq('org_id', actor.orgId).eq('status', 'open'),
  ])

  return {
    pending_reviews: (docs ?? []).filter(
      (d) => d.tracking_status === 'ARRIVED_AT_OFFICE'
        && (d.checkpoint_cleared_step ?? null) !== (d.current_step ?? 0),
    ).length,
    open_compliance_flags: (issues ?? []).length,
    assigned_offices: actor.officeIds.length,
  }
}

export async function buildMessengerReportContext(event: H3Event) {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)
  const db = getServiceSupabase()

  const { data: events } = await db
    .from('document_tracking_events')
    .select('status, created_at')
    .eq('org_id', actor.orgId)
    .eq('actor_id', actor.userId)
    .order('created_at', { ascending: false })
    .limit(500)

  const rows = events ?? []
  const pickups = rows.filter((e) => e.status === 'PICKED_UP' || e.status === 'IN_TRANSIT').length
  const dropoffs = rows.filter((e) => e.status === 'ARRIVED_AT_OFFICE').length
  const completed = rows.filter((e) => e.status === 'COMPLETED').length

  const timestamps = rows.map((e) => new Date(String(e.created_at)).getTime()).filter((t) => !Number.isNaN(t))
  const spanHours = timestamps.length >= 2
    ? Math.round(((Math.max(...timestamps) - Math.min(...timestamps)) / 3_600_000) * 10) / 10
    : 0

  return { pickups, dropoffs, completed_deliveries: completed, active_span_hours: spanHours }
}
