import { getSuperadminDb, requireSuperadmin } from '~~/server/utils/superadminContext'

interface NormalizedEntry {
  id: string
  kind: 'report' | 'feedback'
  org_id: string
  org_name: string | null
  submitter_name: string | null
  submitter_role: string
  title: string
  body: string
  report_type: string
  scope: string
  created_at: string
}

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const db = getSuperadminDb()
  const query = getQuery(event)

  const orgId = query.org_id ? String(query.org_id) : ''
  const type = String(query.type ?? 'all') // 'all' | 'report' | 'feedback'
  const limit = Math.min(Number(query.limit) || 100, 300)

  const wantReports = type !== 'feedback'
  const wantFeedback = type !== 'report'

  let reportsQuery = db
    .from('operational_reports')
    .select('id, org_id, submitted_by, submitter_role, report_type, title, body, scope, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (orgId) reportsQuery = reportsQuery.eq('org_id', orgId)

  let feedbackQuery = db
    .from('activity_logs')
    .select('id, org_id, user_id, user_name, actor_name, message, details, metadata, created_at')
    .eq('action_type', 'client_feedback')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (orgId) feedbackQuery = feedbackQuery.eq('org_id', orgId)

  const [{ data: reports }, { data: feedback }] = await Promise.all([
    wantReports ? reportsQuery : Promise.resolve({ data: [] as any[] }),
    wantFeedback ? feedbackQuery : Promise.resolve({ data: [] as any[] }),
  ])

  const submitterIds = [...new Set((reports ?? []).map((r) => String(r.submitted_by)))]
  const orgIds = [...new Set([...(reports ?? []).map((r) => r.org_id), ...(feedback ?? []).map((f) => f.org_id)].filter(Boolean))]

  const [{ data: submitters }, { data: orgs }] = await Promise.all([
    submitterIds.length ? db.from('users').select('user_id, full_name').in('user_id', submitterIds) : Promise.resolve({ data: [] as { user_id: string; full_name: string }[] }),
    orgIds.length ? db.from('org').select('org_id, name').in('org_id', orgIds) : Promise.resolve({ data: [] as { org_id: string; name: string }[] }),
  ])

  const nameById = Object.fromEntries((submitters ?? []).map((u) => [u.user_id, u.full_name]))
  const orgById = Object.fromEntries((orgs ?? []).map((o) => [o.org_id, o.name]))

  const normalizedReports: NormalizedEntry[] = (reports ?? []).map((r) => ({
    id: String(r.id),
    kind: 'report',
    org_id: r.org_id,
    org_name: orgById[r.org_id] ?? null,
    submitter_name: nameById[String(r.submitted_by)] ?? null,
    submitter_role: r.submitter_role,
    title: r.title,
    body: r.body,
    report_type: r.report_type,
    scope: r.scope,
    created_at: r.created_at,
  }))

  const normalizedFeedback: NormalizedEntry[] = (feedback ?? []).map((f) => {
    const meta = (f.metadata && typeof f.metadata === 'object') ? f.metadata as Record<string, unknown> : {}
    return {
      id: String(f.id),
      kind: 'feedback',
      org_id: f.org_id,
      org_name: orgById[f.org_id] ?? null,
      submitter_name: f.actor_name || f.user_name || null,
      submitter_role: 'client',
      title: typeof meta.subject === 'string' ? meta.subject : 'Platform Feedback',
      body: f.message || f.details || '',
      report_type: typeof meta.category === 'string' ? meta.category : 'general',
      scope: 'FEEDBACK',
      created_at: f.created_at,
    }
  })

  const merged = [...normalizedReports, ...normalizedFeedback]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  return { success: true, data: merged, count: merged.length }
})
