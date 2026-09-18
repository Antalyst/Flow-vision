import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'

function getServiceSupabase() {
  const config = useRuntimeConfig()
  return createClient(
    String(config.public.supabaseUrl),
    String(config.supabaseServiceKey),
  )
}

/**
 * GET /api/client/dashboard-documents
 *
 * Minimal document list scoped the same way as the dashboard KPIs
 * (org + optional current office), so clicking a KPI figure in the AI
 * Digest can show exactly the documents behind that number without
 * leaving the drawer.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole.toLowerCase() !== 'client') {
    throw createError({ statusCode: 403, message: 'Only client accounts can access this list.' })
  }

  const query = getQuery(event)
  const officeId = query.officeId as string | undefined
  const db = getServiceSupabase()

  let dbQuery = db
    .from('documents')
    .select('id, title, tracking_status, status, created_at, current_office_id')
    .eq('org_id', actor.orgId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (officeId) {
    dbQuery = dbQuery.eq('current_office_id', officeId)
  }

  const { data, error } = await dbQuery
  if (error) throw createError({ statusCode: 500, message: error.message })

  return { success: true, data: data ?? [] }
})
