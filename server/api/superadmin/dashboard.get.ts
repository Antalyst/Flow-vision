import { getSuperadminDb, requireSuperadmin } from '~~/server/utils/superadminContext'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const db = getSuperadminDb()

  const [
    orgsRes,
    clientsRes,
    employeesRes,
    subUsersRes,
    messengersRes,
    activeRes,
    inactiveRes,
    documentsRes,
    activityRes,
    reportsRes,
  ] = await Promise.all([
    db.from('org').select('org_id', { count: 'exact', head: true }),
    db.from('users').select('user_id', { count: 'exact', head: true }).eq('role', 'client'),
    db.from('users').select('user_id', { count: 'exact', head: true }).eq('role', 'employee'),
    db.from('users').select('user_id', { count: 'exact', head: true }).eq('role', 'employee_sub_user'),
    db.from('users').select('user_id', { count: 'exact', head: true }).eq('role', 'messenger'),
    db.from('users').select('user_id', { count: 'exact', head: true }).eq('status', 1),
    db.from('users').select('user_id', { count: 'exact', head: true }).eq('status', 0),
    db.from('documents').select('id', { count: 'exact', head: true }),
    db.from('activity_logs')
      .select('id, org_id, user_name, actor_name, action_type, message, details, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    db.from('operational_reports')
      .select('id, org_id, submitter_role, report_type, title, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const orgIds = [...new Set((activityRes.data ?? []).map((r) => r.org_id).filter(Boolean))]
  const { data: orgs } = orgIds.length
    ? await db.from('org').select('org_id, name').in('org_id', orgIds)
    : { data: [] as { org_id: string; name: string }[] }
  const orgById = Object.fromEntries((orgs ?? []).map((o) => [o.org_id, o.name]))

  return {
    success: true,
    data: {
      totals: {
        organizations: orgsRes.count ?? 0,
        clients: clientsRes.count ?? 0,
        employees: employeesRes.count ?? 0,
        employeeSubUsers: subUsersRes.count ?? 0,
        messengers: messengersRes.count ?? 0,
        totalUsers: (clientsRes.count ?? 0) + (employeesRes.count ?? 0) + (subUsersRes.count ?? 0) + (messengersRes.count ?? 0),
        activeUsers: activeRes.count ?? 0,
        inactiveUsers: inactiveRes.count ?? 0,
        documents: documentsRes.count ?? 0,
      },
      recentActivity: (activityRes.data ?? []).map((r) => ({ ...r, org_name: orgById[r.org_id] ?? null })),
      recentReports: reportsRes.data ?? [],
    },
  }
})
