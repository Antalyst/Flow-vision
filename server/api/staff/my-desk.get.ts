import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'

/**
 * GET /api/staff/my-desk
 *
 * Returns the staff member's own personal desk row — a separate `offices`
 * row (parent_office_id = their assigned office, assigned_user = them),
 * auto-created at account creation (see server/api/employee/users/index.post.ts).
 * Distinct from /api/staff/my-office, which returns the real parent office
 * they belong to. Shaped to drop straight into <OfficeQrCard>, the same
 * component /employee/offices.vue already uses to render this exact row.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'employee_sub_user') {
    throw createError({ statusCode: 403, message: 'Only staff accounts can use this endpoint' })
  }

  const { data: userRow, error: userError } = await client
    .from('users')
    .select('office_id, full_name, email')
    .eq('user_id', actor.userId)
    .maybeSingle()

  if (userError) throw createError({ statusCode: 500, message: userError.message })
  if (!userRow?.office_id) return { success: true, data: null }

  const { data: desk, error: deskError } = await client
    .from('offices')
    .select('*')
    .eq('org_id', actor.orgId)
    .eq('assigned_user', actor.userId)
    .eq('parent_office_id', userRow.office_id)
    .maybeSingle()

  if (deskError) throw createError({ statusCode: 500, message: deskError.message })
  if (!desk) return { success: true, data: null }

  const { count } = await client
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', actor.orgId)
    .eq('office_id', desk.id)

  return {
    success: true,
    data: {
      ...desk,
      doc_count: count ?? 0,
      assigned_user_profile: { full_name: userRow.full_name, email: userRow.email },
    },
  }
})
