import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  // Resolve actor context
  const actor = await resolveActorContextWithOffices(event, client)

  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees can fetch tables/desks' })
  }

  if (actor.officeIds.length === 0) {
    return { success: true, data: [] }
  }

  // Fetch all offices where parent_office_id is in employee's officeIds
  const { data: offices, error } = await client
    .from('offices')
    .select('*')
    .in('parent_office_id', actor.officeIds)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch offices',
    })
  }

  const rows = offices ?? []
  if (rows.length === 0) {
    return { success: true, data: [] }
  }

  const deskIds = rows.map((o: any) => o.id)
  const assignedUserIds = [...new Set(rows.map((o: any) => o.assigned_user).filter(Boolean))]

  // Resolve assigned-user names via a plain lookup — a Supabase embedded FK join
  // (users!offices_assigned_user_fkey(...)) is brittle to constraint naming and
  // silently drops this field if it errors, which made every desk look "Unassigned".
  const profileById: Record<string, { full_name: string; email: string }> = {}
  if (assignedUserIds.length > 0) {
    const { data: users } = await client
      .from('users')
      .select('user_id, full_name, email')
      .in('user_id', assignedUserIds)
    for (const u of (users || [])) {
      profileById[u.user_id] = { full_name: u.full_name, email: u.email }
    }
  }

  // Count documents currently registered at each desk.
  const docCountByOffice: Record<string, number> = {}
  const { data: docs } = await client
    .from('documents')
    .select('office_id')
    .eq('org_id', actor.orgId)
    .in('office_id', deskIds)
  for (const d of (docs || [])) {
    const id = String(d.office_id)
    docCountByOffice[id] = (docCountByOffice[id] || 0) + 1
  }

  const enriched = rows.map((o: any) => ({
    ...o,
    assigned_user_profile: o.assigned_user ? (profileById[o.assigned_user] ?? null) : null,
    doc_count: docCountByOffice[String(o.id)] ?? 0,
  }))

  return { success: true, data: enriched }
})
