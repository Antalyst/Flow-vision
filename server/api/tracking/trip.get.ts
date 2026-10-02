import { serverSupabaseClient } from '#supabase/server'
import { resolveOfficeName } from '~~/server/utils/routeCompletion'
import { getDocumentRoute, routeStopAt, type RouteStop } from '~~/server/utils/documentRoute'

/** Route-stop lookup in the { officeId, officeName } shape these endpoints already use. */
function stopInfo(stops: RouteStop[], step: number) {
  const stop = routeStopAt(stops, step)
  return { officeId: stop?.office_id ?? null, officeName: stop?.office_name ?? null }
}


const TERMINAL_STATUSES = new Set(['COMPLETED', 'DISCREPANCY_REPORTED'])

/**
 * GET /api/tracking/trip?document_id={uuid}
 *
 * Live active trip payload for a messenger's in-flight document hand-off.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)
  const documentId = String(query.document_id ?? '').trim()

  if (!documentId) {
    throw createError({ statusCode: 400, message: 'document_id is required' })
  }

  const actorId = sessionUserId(event)
  const actorRole = sessionRole(event)

  if (!actorId) throw createError({ statusCode: 401, message: 'Authentication required' })
  if (actorRole !== 'messenger') {
    throw createError({ statusCode: 403, message: 'Only messengers can view active delivery trips' })
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

  const { data: doc, error: docErr } = await client
    .from('documents')
    .select(
      'id, org_id, title, tracking_status, current_step, stage_id, qr_code_data, ' +
      'origin_office_id, current_office_id, office_id, assigned_messenger_id, created_at',
    )
    .eq('id', documentId)
    .single()

  if (docErr || !doc) {
    throw createError({ statusCode: 404, message: 'Document not found' })
  }

  if (String(doc.org_id) !== orgId) {
    throw createError({ statusCode: 403, message: 'Forbidden: document belongs to a different organisation' })
  }

  const stops = await getDocumentRoute(doc)
  const route = { totalSteps: stops.length }
  const currentStep = doc.current_step ?? 0
  const trackingStatus = doc.tracking_status ?? 'CREATED'

  const routeSteps: Array<{ step_number: number; office_id: string; office_name: string }> = stops

  const destinationStep =
    trackingStatus === 'IN_TRANSIT' ? currentStep : Math.max(1, currentStep + 1)
  const destination = stopInfo(stops, destinationStep)

  let sourceOfficeId = doc.origin_office_id ?? doc.office_id ?? null
  let sourceOfficeName = await resolveOfficeName(client, sourceOfficeId ? String(sourceOfficeId) : null)

  if (destinationStep > 1) {
    const prior = stopInfo(stops, destinationStep - 1)
    if (prior.officeId) {
      sourceOfficeId = prior.officeId
      sourceOfficeName = prior.officeName
    }
  }

  if (trackingStatus === 'ARRIVED_AT_OFFICE' && doc.current_office_id) {
    sourceOfficeId = String(doc.current_office_id)
    sourceOfficeName = await resolveOfficeName(client, sourceOfficeId)
  }

  const assignedToSelf = String(doc.assigned_messenger_id ?? '') === String(actorId)
  const isActiveTrip = assignedToSelf && ['IN_TRANSIT', 'PICKED_UP'].includes(trackingStatus)
  const isTerminal = TERMINAL_STATUSES.has(trackingStatus) || (!assignedToSelf && trackingStatus !== 'CREATED')

  let terminalReason: string | null = null
  if (trackingStatus === 'COMPLETED') {
    terminalReason = 'This document has been marked completed.'
  } else if (trackingStatus === 'DISCREPANCY_REPORTED') {
    terminalReason = 'This document has been flagged for compliance review.'
  } else if (!assignedToSelf) {
    terminalReason = 'This delivery is no longer assigned to you.'
  } else if (!['IN_TRANSIT', 'PICKED_UP'].includes(trackingStatus)) {
    terminalReason = `Document is no longer in an active transit state (${trackingStatus}).`
  }

  return {
    success: true,
    data: {
      id: doc.id,
      title: doc.title,
      tracking_id: doc.qr_code_data || doc.id,
      tracking_status: trackingStatus,
      current_step: currentStep,
      total_steps: route.totalSteps,
      source_office_name: sourceOfficeName,
      source_office_id: sourceOfficeId ? String(sourceOfficeId) : null,
      destination_office_name: destination.officeName,
      destination_office_id: destination.officeId,
      route_steps: routeSteps,
      is_active_trip: isActiveTrip,
      is_terminal: isTerminal,
      terminal_reason: terminalReason,
      created_at: doc.created_at,
    },
  }
})
