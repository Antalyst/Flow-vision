import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { getRouteContext, resolveRouteOfficeAtStep, resolveOfficeName } from '~~/server/utils/routeCompletion'

/**
 * GET /api/tracking/custody
 *
 * Returns documents currently assigned to the authenticated messenger:
 * - in_transit: active carrying load (IN_TRANSIT)
 * - awaiting_scan: claimed (PICKED_UP) but not yet scanned into transit
 */
export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)

    // 1. Validate User Authentication
    let user: any = null
    try {
      user = await serverSupabaseUser(event)
    } catch {
      // Fall back to session cookies
    }

    const actorId = user?.id || getCookie(event, 'user_session')
    const actorRole = user?.user_metadata?.role || getCookie(event, 'user_role')

    if (!actorId || String(actorId).trim() === '') {
      throw createError({ statusCode: 401, message: 'Authentication required' })
    }

    if (actorRole && actorRole !== 'messenger' && actorRole !== 'admin') {
      throw createError({ statusCode: 403, message: 'Only messengers can view custody inventory' })
    }

    // 2. Fetch actor organization details
    const { data: actorRow, error: userErr } = await client
      .from('users')
      .select('org_id, full_name, role')
      .eq('user_id', actorId)
      .maybeSingle()

    if (userErr) {
      console.error('[GET /api/tracking/custody] Postgres error fetching user:', userErr.message || userErr)
      throw createError({ statusCode: 500, message: userErr.message })
    }

    if (!actorRow?.org_id) {
      throw createError({ statusCode: 403, message: 'Messenger account has no organisation assigned' })
    }

    const orgId = String(actorRow.org_id)

    // 3. Query documents assigned to this messenger (using target_completion_date)
    const { data: docs, error: docsErr } = await client
      .from('documents')
      .select(
        'id, title, tracking_status, current_step, stage_id, qr_code_data, ' +
        'origin_office_id, current_office_id, office_id, assigned_messenger_id, created_at, priority, target_completion_date',
      )
      .eq('org_id', orgId)
      .eq('assigned_messenger_id', actorId)
      .in('tracking_status', ['IN_TRANSIT', 'PICKED_UP'])
      .order('created_at', { ascending: false })

    if (docsErr) {
      console.error('[GET /api/tracking/custody] Postgres error querying documents:', docsErr.message || docsErr)
      throw createError({ statusCode: 500, message: docsErr.message })
    }

    // 4. Enrich documents with route and checkpoint metadata safely
    const enriched = await Promise.all((docs ?? []).map(async (doc) => {
      try {
        const route = await getRouteContext(client, doc.stage_id)
        const destination = await resolveRouteOfficeAtStep(client, doc.stage_id, doc.current_step ?? 0)
        const originName = await resolveOfficeName(
          client,
          doc.origin_office_id ?? doc.current_office_id ?? doc.office_id,
        )

        const routeSteps: Array<{ step_number: number; office_id: string; office_name: string }> = []
        if (doc.stage_id) {
          const { data: steps, error: stepErr } = await client
            .from('stage_steps')
            .select('step_number, office_id, offices(name)')
            .eq('stage_id', doc.stage_id)
            .order('step_number', { ascending: true })

          if (stepErr) {
            console.error(
              `[GET /api/tracking/custody] Postgres error resolving stage_steps for stage ${doc.stage_id}:`,
              stepErr.message || stepErr,
            )
          } else {
            for (const step of steps ?? []) {
              routeSteps.push({
                step_number: step.step_number,
                office_id: String(step.office_id),
                office_name: (step as { offices?: { name?: string } }).offices?.name ?? 'Office',
              })
            }
          }
        }

        const targetDate = (doc as any).target_completion_date || (doc as any).target_date || null

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
          priority: (doc as any).priority || 'Medium',
          target_date: targetDate,
          target_completion_date: targetDate,
        }
      } catch (err: any) {
        console.error(`[GET /api/tracking/custody] Error enriching document ${doc.id}:`, err?.message || err)
        const targetDate = (doc as any).target_completion_date || (doc as any).target_date || null
        return {
          id: doc.id,
          title: doc.title,
          tracking_status: doc.tracking_status,
          tracking_id: doc.qr_code_data || doc.id,
          current_step: doc.current_step ?? 0,
          total_steps: 0,
          origin_office_name: 'Origin desk',
          destination_office_name: 'Unassigned',
          destination_office_id: null,
          route_steps: [],
          created_at: doc.created_at,
          priority: (doc as any).priority || 'Medium',
          target_date: targetDate,
          target_completion_date: targetDate,
        }
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
  } catch (err: any) {
    console.error('[GET /api/tracking/custody] Unhandled exception:', err?.message || err)
    if (err?.statusCode) throw err
    throw createError({
      statusCode: 500,
      message: err?.message || 'Failed to fetch custody inventory',
    })
  }
})
