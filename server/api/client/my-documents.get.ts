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
 * GET /api/client/my-documents
 *
 * Personal, self-scoped document list for the "My Tracking" page — every
 * document THIS client user registered, unlike the org-wide Documents list
 * or Activity Log. Mirrors the "My Orders" idea from an e-commerce tracker.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole.toLowerCase() !== 'client') {
    throw createError({ statusCode: 403, message: 'Only client accounts can access this list.' })
  }

  const db = getServiceSupabase()

  const { data: rows, error } = await db
    .from('documents')
    .select('id, title, tracking_status, status, priority, created_at, current_office_id, target_completion_date, stage_id')
    .eq('org_id', actor.orgId)
    .eq('user_id', actor.userId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw createError({ statusCode: 500, message: error.message })

  const documents = rows ?? []
  const officeIds = [...new Set(documents.map((d) => d.current_office_id).filter(Boolean))]

  let officeNameById: Record<string, string> = {}
  if (officeIds.length > 0) {
    const { data: offices } = await db.from('offices').select('id, name').in('id', officeIds)
    officeNameById = (offices ?? []).reduce((acc: Record<string, string>, o: any) => {
      acc[String(o.id)] = o.name
      return acc
    }, {})
  }

  const enriched = documents.map((doc) => ({
    ...doc,
    current_office_name: doc.current_office_id ? (officeNameById[String(doc.current_office_id)] ?? null) : null,
  }))

  return { success: true, data: enriched }
})
