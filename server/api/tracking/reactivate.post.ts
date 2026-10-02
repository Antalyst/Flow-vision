/**
 * POST /api/tracking/reactivate
 *
 * Starts the next routing cycle of a COMPLETED recurring document — same
 * document id, same QR code, same file. The previous cycles' stops and events
 * are never modified; the new cycle's stops simply continue the step
 * numbering, and end with an automatic return to the creator's office.
 *
 * Body: { document_id: string, office_ids: string[], saved_route_id?: string }
 *   office_ids      ordered destinations of the new cycle
 *   saved_route_id  the saved route they were loaded from, if any (recorded only)
 *
 * Who may do this: the document's creator, the organization admin (client), or
 * the head of the document's originating office (where every cycle returns).
 * The partial unique index on document_routing_cycles (one ACTIVE per document)
 * makes a duplicate or concurrent reactivation fail cleanly with 409.
 */
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { buildCycleStops, getDocumentRoute, getOfficeHeadId, lifecycleDb, saveDocumentRoute, validateRouteOffices } from '~~/server/utils/documentRoute'
import { recordTrackingEvent, assertHistorySaved, type TrackingEventResult } from '~~/server/utils/documentAccess'
import { broadcastInboundOfficeNotification, notifyDocumentCreator } from '~~/server/utils/notifications'
import { logActivitySafe } from '~~/server/utils/activityLog'
import {
  assertRecurringRoutingAvailable,
  highestStoredStep,
  lastUsedStep,
  repairStaleActiveCycle,
} from '~~/server/utils/recurringRouting'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)
  // History entries this request writes; success is only reported once they're saved.
  const tracked: TrackingEventResult[] = []
  // Controlled 409 (not a raw database error) when the recurring schema isn't installed.
  await assertRecurringRoutingAvailable()
  const body = await readBody(event)
  const documentId = String(body?.document_id ?? '').trim()
  if (!UUID_RE.test(documentId)) throw createError({ statusCode: 400, message: 'Please select a document.' })
  if (!Array.isArray(body?.office_ids)) throw createError({ statusCode: 400, message: 'Add at least one destination office.' })

  const db = lifecycleDb()
  const { data: doc } = await db
    .from('documents')
    .select('id, org_id, user_id, title, creator_role, tracking_status, current_step, stage_id, origin_office_id, office_id, routing_type')
    .eq('id', documentId)
    .maybeSingle()

  if (!doc || String(doc.org_id) !== actor.orgId) {
    throw createError({ statusCode: 404, message: 'We could not find this document.' })
  }
  const isCreator = doc.user_id && String(doc.user_id) === actor.userId
  const originForAuth = doc.origin_office_id ?? doc.office_id
  const isOriginHead = !isCreator && actor.userRole === 'employee' && !!originForAuth
    && (await getOfficeHeadId(String(originForAuth))) === actor.userId
  if (!isCreator && !isOriginHead && actor.userRole !== 'client') {
    throw createError({
      statusCode: 403,
      message: 'Only the document\'s creator, its originating office head, or the organization admin can reactivate it.',
      data: { code: 'NOT_DOCUMENT_OWNER' },
    })
  }
  if (doc.routing_type !== 'RECURRING') {
    throw createError({ statusCode: 422, message: 'Only documents with a recurring route can be reactivated.', data: { code: 'NOT_RECURRING' } })
  }
  if (doc.tracking_status !== 'COMPLETED') {
    throw createError({
      statusCode: 409,
      message: 'The current routing cycle is still in progress. A document can be reactivated only after it has been returned and its cycle completed.',
      data: { code: 'CYCLE_STILL_ACTIVE' },
    })
  }

  const originOfficeId = doc.origin_office_id ?? doc.office_id
  if (!originOfficeId) {
    throw createError({ statusCode: 422, message: 'This document has no origin office to return to.' })
  }
  const { data: origin } = await db.from('offices').select('name').eq('id', originOfficeId).maybeSingle()
  const originName = origin?.name ?? 'Origin office'

  // D2 recovery: a cycle left ACTIVE on this COMPLETED document (its closing
  // write failed at return receipt) is closed from the recorded receipt first,
  // so it can never block reactivation.
  await repairStaleActiveCycle(doc, actor)

  const destinations = await validateRouteOffices(actor.orgId, body.office_ids.map(String), String(originOfficeId))

  // Optional: which of the organization's saved routes this cycle was built from.
  let savedRouteId: string | null = null
  if (body?.saved_route_id) {
    const { data: savedRoute } = await db.from('stages').select('stage_id, org_id').eq('stage_id', String(body.saved_route_id)).maybeSingle()
    if (!savedRoute || String(savedRoute.org_id) !== actor.orgId) {
      throw createError({ statusCode: 404, message: 'That saved route no longer exists. Choose the offices again.' })
    }
    savedRouteId = String(savedRoute.stage_id)
  }
  // D1: continue after the highest of the step counter and every stored stop.
  const previousStep = doc.current_step ?? 0
  const lastStep = lastUsedStep(previousStep, [await highestStoredStep(doc.id)])

  const route = await getDocumentRoute(doc)
  const lastCycle = route.reduce((max, s) => Math.max(max, s.cycle_number ?? 1), 0)
  const { data: cycleRows } = await db
    .from('document_routing_cycles')
    .select('cycle_number')
    .eq('document_id', doc.id)
    .order('cycle_number', { ascending: false })
    .limit(1)
  const cycleNumber = Math.max(lastCycle, Number(cycleRows?.[0]?.cycle_number ?? 0)) + 1
  const stops = buildCycleStops(destinations, String(originOfficeId), originName, cycleNumber, lastStep)

  // 1. Claim the new cycle first — the unique indexes make this the lock.
  const { data: cycle, error: cycleErr } = await db
    .from('document_routing_cycles')
    .insert({
      document_id: doc.id,
      org_id: actor.orgId,
      cycle_number: cycleNumber,
      start_step: stops[0]!.step_number,
      end_step: stops[stops.length - 1]!.step_number,
      status: 'ACTIVE',
      started_by: actor.userId,
    })
    .select('id, started_at')
    .single()
  if (cycleErr) {
    if (cycleErr.code === '23505') {
      throw createError({ statusCode: 409, message: 'This document was just reactivated. Refresh to see the new cycle.', data: { code: 'ALREADY_REACTIVATED' } })
    }
    throw createError({ statusCode: 500, message: 'We could not start a new cycle. Please try again.' })
  }

  // Undo exactly what this request created — earlier cycles are never touched.
  const rollback = async (stopsSaved: boolean) => {
    if (stopsSaved) {
      const { error } = await db.from('document_route_stops').delete()
        .eq('document_id', doc.id)
        .in('step_number', stops.map((s) => s.step_number))
        .eq('cycle_number', cycleNumber)
      if (error) console.error('[reactivate] rollback of new stops failed:', error.message)
    }
    const { error } = await db.from('document_routing_cycles').delete().eq('id', cycle.id)
    if (error) console.error('[reactivate] rollback of new cycle failed:', error.message)
  }

  // 2. The new cycle's route — strict: a colliding step number is an error,
  //    never skipped, and every stop must be stored.
  try {
    await saveDocumentRoute(doc.id, actor.orgId, stops, { strict: true })
  } catch (err) {
    await rollback(false)
    throw err
  }

  // 3. Back at the creator's office, cleared for liaison assignment (the origin
  //    leg needs no release approval — same rule as a newly registered document).
  const { data: updated, error: docErr } = await db
    .from('documents')
    .update({
      tracking_status: 'ARRIVED_AT_OFFICE',
      status: 'Pending',
      current_office_id: String(originOfficeId),
      // Moves a stale counter up to the last used step, so pickup heads to
      // the new cycle's first stop (lastStep + 1).
      current_step: lastStep,
      checkpoint_cleared_step: lastStep,
      assigned_messenger_id: null,
    })
    .eq('id', doc.id)
    .eq('tracking_status', 'COMPLETED')
    .eq('current_step', previousStep)
    .select('id')
  if (docErr || !updated || updated.length === 0) {
    await rollback(true)
    throw createError({ statusCode: 409, message: 'This document changed while reactivating. Refresh and try again.' })
  }

  const routeLabel = destinations.map((d) => d.office_name).join(' → ')
  tracked.push(await recordTrackingEvent({
    document_id: doc.id,
    org_id: actor.orgId,
    status: 'ARRIVED_AT_OFFICE',
    step_index: lastStep,
    office_name: originName,
    actor_id: actor.userId,
    actor_role: actor.userRole,
    actor_name: actor.fullName,
    event_type: 'CYCLE_STARTED',
    notes: `${actor.fullName ?? 'The creator'} reactivated "${doc.title}" — cycle ${cycleNumber}: ${routeLabel} → back to ${originName}.`,
    metadata: { cycle_number: cycleNumber, office_ids: destinations.map((d) => d.office_id), origin_office_id: originOfficeId, saved_route_id: savedRouteId },
  }))
  assertHistorySaved(tracked, 'The new cycle')

  await logActivitySafe({
    orgId: actor.orgId,
    officeId: String(originOfficeId),
    userId: actor.userId,
    userName: actor.fullName,
    actorName: actor.fullName,
    actionType: 'system',
    details: `Reactivated "${doc.title}" for routing cycle ${cycleNumber}`,
    message: `Reactivated "${doc.title}" for routing cycle ${cycleNumber}`,
    documentId: doc.id,
    metadata: { cycle_number: cycleNumber, saved_route_id: savedRouteId },
  }, client)

  // The creator's office must now assign a liaison for the first leg.
  try {
    await broadcastInboundOfficeNotification({
      orgId: actor.orgId,
      documentId: doc.id,
      documentTitle: doc.title,
      messengerName: null,
      officeId: String(originOfficeId),
      officeName: originName,
      type: 'CYCLE_STARTED',
      title: `Document Reactivated — Cycle ${cycleNumber}`,
      message: `"${doc.title}" was reactivated for cycle ${cycleNumber} (${routeLabel}). Assign a liaison to deliver it to ${destinations[0]!.office_name}.`,
    })
  } catch (notifyErr) {
    console.warn('[reactivate] Non-fatal: origin office notice failed:', notifyErr)
  }
  if (!isCreator) {
    await notifyDocumentCreator({
      orgId: actor.orgId,
      documentId: doc.id,
      documentTitle: doc.title,
      userId: doc.user_id,
      creatorRole: doc.creator_role,
      officeId: String(originOfficeId),
      title: `Document Reactivated — Cycle ${cycleNumber}`,
      message: `${actor.fullName ?? 'An administrator'} started cycle ${cycleNumber} of "${doc.title}": ${routeLabel}.`,
    })
  }

  return {
    success: true,
    message: `Cycle ${cycleNumber} started. Assign a liaison to deliver it to ${destinations[0]!.office_name}.`,
    data: { cycle_number: cycleNumber, started_at: cycle.started_at, stops },
  }
})
