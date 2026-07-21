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
    .select('*, assigned_user_profile:users!offices_assigned_user_fkey(full_name, email)')
    .in('parent_office_id', actor.officeIds)
    .order('created_at', { ascending: false })

  if (error) {
    // If the join fails due to naming, fallback to regular fetch
    const { data: fallbackData, error: fallbackError } = await client
      .from('offices')
      .select('*')
      .in('parent_office_id', actor.officeIds)
      .order('created_at', { ascending: false })

    if (fallbackError) {
      throw createError({
        statusCode: 500,
        message: fallbackError.message || 'Failed to fetch offices',
      })
    }
    return { success: true, data: fallbackData ?? [] }
  }

  return { success: true, data: offices ?? [] }
})
