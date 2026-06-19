import { serverSupabaseClient } from '#supabase/server'
import { getRouteContext, resolveRouteOfficeAtStep, resolveOfficeName } from '~~/server/utils/routeCompletion'

/**
 * GET /api/tracking/custody
 *
 * Returns documents currently assigned to the authenticated messenger:
 * - in_transit: active carrying load
 * - awaiting_scan: claimed (PICKED_UP) but not yet scanned into transit
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actorId = getCookie(event, 'user_session')
  const actorRole = getCookie(event, 'user_role')

  if (!actorId) throw createError({ statusCode: 401, message: 'Authentication required' })
  if (actorRole !== 'messenger') {
    throw createError({ statusCode: 403, message: 'Only messengers can view custody inventory' })
  }

  const { data: actorRow } = await client
    .from('users')
    .select('org_id, full_name')
    .eq('user_id', actorId)
    .single()

  if (!actorRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Messenger account has no organisation assigned' })
  }

  const orgId = String(actorRow.org_id)

  const { data: docs, error } = await client
    .from('documents')
    .select(
      'id, title, tracking_status, current_step, stage_id, qr_code_data, ' +
      'origin_office_id, current_office_id, office_id, assigned_messenger_id, created_at',
    )
    .eq('org_id', orgId)
    .eq('assigned_messenger_id', actorId)
    .in('tracking_status', ['IN_TRANSIT', 'PICKED_UP'])
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  const enriched = await Promise.all((docs ?? []).map(async (doc) => {
    const route = await getRouteContext(client, doc.stage_id)
    const destination = await resolveRouteOfficeAtStep(client, doc.stage_id, doc.current_step ?? 0)
    const originName = await resolveOfficeName(
      client,
      doc.origin_office_id ?? doc.current_office_id ?? doc.office_id,
    )

    const routeSteps: Array<{ step_number: number; office_id: string; office_name: string }> = []
    if (doc.stage_id) {
      const { data: steps } = await client
        .from('stage_steps')
        .select('step_number, office_id, offices(name)')
        .eq('stage_id', doc.stage_id)
        .order('step_number', { ascending: true })

      for (const step of steps ?? []) {
        routeSteps.push({
          step_number: step.step_number,
          office_id: String(step.office_id),
          office_name: (step as { offices?: { name?: string } }).offices?.name ?? 'Office',
        })
      }
    }

    return {
      id: doc.id,
      title: doc.title,
      tracking_status: doc.tracking_status,
      tracking_id: doc.qr_code_data || doc.id,
      current_step: doc.current_step ?? 0,
      total_steps: route.totalSteps,
      origin_office_name: originName,
      destination_office_name: destination.officeName,
      destination_office_id: destination.officeId,
      route_steps: routeSteps,
      created_at: doc.created_at,
    }
  }))

  const inTransit = enriched.filter((d) => d.tracking_status === 'IN_TRANSIT')
  const awaitingScan = enriched.filter((d) => d.tracking_status === 'PICKED_UP')

  return {
    success: true,
    summary: {
      in_transit_count: inTransit.length,
      awaiting_scan_count: awaitingScan.length,
    },
    data: {
      in_transit: inTransit,
      awaiting_scan: awaitingScan,
    },
  }
})
