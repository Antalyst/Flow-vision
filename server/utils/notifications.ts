import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext, resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { logActivitySafe, type ActivitySupabaseClient } from '~~/server/utils/activityLog'
import { resolveOfficeName, resolveRouteOfficeAtStep } from '~~/server/utils/routeCompletion'

export interface BroadcastPickupInput {
  orgId: string
  documentId: string
  documentTitle: string
}

const NOTIFICATION_COLUMNS =
  'id, org_id, office_id, document_id, target_role, title, message, user_id, is_claimed, is_read, claimed_by_user_id, created_at, metadata, documents(tracking_status)'

export interface MessengerPickupRouteMetadata {
  pickup_source_name?: string | null
  pickup_source_office_id?: string | null
  destination_office_name?: string | null
  destination_office_id?: string | null
}

async function resolveMessengerPickupRouteContext(
  db: ReturnType<typeof getServiceSupabase>,
  documentId: string,
): Promise<MessengerPickupRouteMetadata> {
  const { data: doc } = await db
    .from('documents')
    .select('tracking_status, current_step, stage_id, origin_office_id, current_office_id, office_id')
    .eq('id', documentId)
    .maybeSingle()

  if (!doc) return {}

  const trackingStatus = doc.tracking_status ?? 'CREATED'
  const currentStep = doc.current_step ?? 0

  let pickupOfficeId =
    doc.current_office_id ?? doc.origin_office_id ?? doc.office_id ?? null
  let destinationStep = currentStep + 1

  if (trackingStatus === 'CREATED') {
    pickupOfficeId = doc.origin_office_id ?? doc.office_id ?? pickupOfficeId
    destinationStep = 1
  } else if (trackingStatus === 'ARRIVED_AT_OFFICE') {
    pickupOfficeId = doc.current_office_id ?? pickupOfficeId
    destinationStep = currentStep + 1
  }

  const destination = await resolveRouteOfficeAtStep(db, doc.stage_id, destinationStep)
  const pickupSourceName = await resolveOfficeName(db, pickupOfficeId ? String(pickupOfficeId) : null)

  return {
    pickup_source_name: pickupSourceName,
    pickup_source_office_id: pickupOfficeId ? String(pickupOfficeId) : null,
    destination_office_name: destination.officeName,
    destination_office_id: destination.officeId,
  }
}

export interface InboundOfficeNotificationInput {
  orgId: string
  documentId: string
  documentTitle: string
  messengerName?: string | null
  officeId: string
  officeName?: string | null
  title?: string
  message?: string
  type?: string
  metadata?: Record<string, unknown>
}

export interface ClientStatusNotificationInput {
  orgId: string
  documentId: string
  documentTitle: string
  trackingStatus: string
  clientUserId?: string | null
  message?: string | null
}

export interface ResolvedDestinationOffice {
  officeId: string | null
  officeName: string | null
  stepNumber?: number | null
}

export type InboundDocumentOfficeFields = {
  current_office_id?: string | null
  office_id?: string | null
  origin_office_id?: string | null
  stage_id?: string | null
  current_step?: number | null
  tracking_status?: string | null
}

/**
 * Calculates the destination office ID and name for an inbound document notification.
 * - When status is ARRIVED_AT_OFFICE, targets doc.current_office_id (the current station step),
 *   rather than evaluating current_step + 1.
 * - When status is CREATED or current_step is 0/null, next step is Step 1.
 * - When status is PICKED_UP or IN_TRANSIT, next step is current_step + 1.
 * - Falls back to documents.office_id only if no stage step is configured,
 *   explicitly excluding origin_office_id and current_office_id (source offices).
 */
export async function resolveTargetOfficeIdForInboundNotification(
  db: ReturnType<typeof getServiceSupabase>,
  doc: InboundDocumentOfficeFields,
): Promise<ResolvedDestinationOffice> {
  const trackingStatus = (doc.tracking_status ?? '').toUpperCase()
  const currentStep = doc.current_step ?? 0

  // 1. If status is ARRIVED_AT_OFFICE, target the office where the document arrived (current station)
  if (trackingStatus === 'ARRIVED_AT_OFFICE') {
    if (doc.current_office_id) {
      const officeId = String(doc.current_office_id)
      const { data: offRow } = await db
        .from('offices')
        .select('name')
        .eq('id', officeId)
        .maybeSingle()

      return { officeId, officeName: offRow?.name ?? null, stepNumber: currentStep }
    }

    if (doc.stage_id && currentStep > 0) {
      const { data: stepRow, error: stepErr } = await db
        .from('stage_steps')
        .select('office_id, offices(name)')
        .eq('stage_id', doc.stage_id)
        .eq('step_number', currentStep)
        .maybeSingle()

      if (!stepErr && stepRow?.office_id) {
        const officeName = (stepRow as { offices?: { name?: string } | null }).offices?.name ?? null
        return { officeId: String(stepRow.office_id), officeName, stepNumber: currentStep }
      }
    }
  }

  // 2. Otherwise (CREATED, PICKED_UP, IN_TRANSIT), calculate forward destination step index
  let destinationStep = currentStep + 1
  if (trackingStatus === 'CREATED' || currentStep === 0) {
    destinationStep = 1
  }

  // Look up the destination step in stage_steps
  if (doc.stage_id) {
    const { data: stepRow, error: stepErr } = await db
      .from('stage_steps')
      .select('office_id, offices(name)')
      .eq('stage_id', doc.stage_id)
      .eq('step_number', destinationStep)
      .maybeSingle()

    if (!stepErr && stepRow?.office_id) {
      const officeName = (stepRow as { offices?: { name?: string } | null }).offices?.name ?? null
      return { officeId: String(stepRow.office_id), officeName, stepNumber: destinationStep }
    }
  }

  // Fallback: if no stage step found, check doc.office_id if distinct from source origin/current office
  const sourceOfficeId = doc.current_office_id ?? doc.origin_office_id ?? null
  if (doc.office_id && (!sourceOfficeId || String(doc.office_id) !== String(sourceOfficeId))) {
    const officeId = String(doc.office_id)
    const { data: offRow } = await db
      .from('offices')
      .select('name')
      .eq('id', officeId)
      .maybeSingle()

    return { officeId, officeName: offRow?.name ?? null, stepNumber: destinationStep }
  }

  return { officeId: null, officeName: null, stepNumber: destinationStep }
}

/**
 * Resolves all office IDs assigned to an employee user within an organisation.
 * Inspects:
 * 1. users.office_id and users.current_office_id
 * 2. offices.assigned_user = userId
 */
export async function resolveEmployeeAssignedOfficeIds(
  db: ReturnType<typeof getServiceSupabase>,
  orgId: string,
  userId: string,
): Promise<string[]> {
  const normalizedUserId = String(userId).trim()
  const officeIdSet = new Set<string>()

  // 1. Check user profile for directly assigned office_id or current_office_id
  const { data: userRow, error: userErr } = await db
    .from('users')
    .select('office_id, current_office_id')
    .eq('user_id', normalizedUserId)
    .maybeSingle()

  if (!userErr && userRow) {
    if (userRow.office_id != null && String(userRow.office_id).trim()) {
      officeIdSet.add(String(userRow.office_id).trim())
    }
    if (userRow.current_office_id != null && String(userRow.current_office_id).trim()) {
      officeIdSet.add(String(userRow.current_office_id).trim())
    }
  }

  // 2. Check offices assigned to this employee via offices.assigned_user
  const { data: officeRows, error: officeErr } = await db
    .from('offices')
    .select('id, assigned_user')
    .eq('org_id', orgId)

  if (officeErr) {
    console.error('[notifications] Failed to resolve employee offices:', officeErr.message, { orgId, userId })
  } else {
    for (const row of officeRows ?? []) {
      if (String((row as { assigned_user?: string | number }).assigned_user ?? '') === normalizedUserId) {
        if ((row as { id?: string }).id != null) {
          officeIdSet.add(String((row as { id: string }).id).trim())
        }
      }
    }
  }

  return Array.from(officeIdSet)
}

/**
 * Broadcast an Advance Shipping Notice (ASN) / Inbound Dispatch Alert
 * to destination office channels and org logistics via Supabase Realtime REST API.
 */
export async function broadcastInboundDispatchRealtime(
  orgId: string,
  targetOfficeId: string | number | null,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const config = useRuntimeConfig()
  const supabaseUrl = String(config.public.supabaseUrl || '').replace(/\/$/, '')
  const supabaseKey = String(config.supabaseServiceKey || '')

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[notifications] Realtime broadcast skipped: missing Supabase credentials.')
    return
  }

  const normalizedOrgId = String(orgId).trim()
  const channels = [`org:${normalizedOrgId}:logistics`]

  if (targetOfficeId != null) {
    const offStr = String(targetOfficeId).trim()
    if (offStr && offStr !== 'null' && offStr !== 'undefined') {
      channels.push(`org:${normalizedOrgId}:office:${offStr}`)
    }
  }

  const uniqueChannels = Array.from(new Set(channels))
  const messages = uniqueChannels.map((topic) => ({
    topic,
    event,
    payload,
  }))

  try {
    await $fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: { messages },
    })
    console.log(`[notifications] Realtime broadcast [${event}] sent to: ${uniqueChannels.join(', ')}`)
  } catch (broadcastErr: any) {
    console.warn('[notifications] Supabase Realtime broadcast failed (non-fatal):', broadcastErr?.message || broadcastErr)
  }
}

/** Notify destination office employees that a messenger claimed or delivered an inbound transfer, or of a pre-pickup ASN notice. */
export async function broadcastInboundOfficeNotification(
  input: InboundOfficeNotificationInput,
): Promise<string | null> {
  if (!input.officeId) {
    console.error('[notifications] Inbound office alert skipped: office_id is required', input)
    return null
  }

  const destinationLabel = input.officeName ? input.officeName : 'your office'
  const message =
    input.message ??
    `${input.messengerName || 'A courier'} has accepted the pickup for "${input.documentTitle}" ` +
    `and is transferring it to ${destinationLabel}.`

  const title = input.title ?? 'Inbound Document En Route'

  const metadata = {
    ...(input.metadata || {}),
    ...(input.type ? { type: input.type } : {}),
  }

  const row = {
    org_id: input.orgId,
    office_id: input.officeId,
    document_id: input.documentId,
    target_role: 'employee',
    user_id: null,
    title,
    message,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
  }

  const db = getServiceSupabase()
  const { data, error } = await db
    .from('notifications')
    .insert(row)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[notifications] Inbound office alert failed:', error?.message, row)
    return null
  }

  return (data as { id: string }).id
}

export interface ComplianceIssueNotificationInput {
  orgId: string
  documentId: string
  documentTitle: string
  issueId: string
  issueTitle: string
  targetOfficeId: string
  targetOfficeName?: string | null
  reporterName?: string | null
}

/** Notify employees at the targeted office desk about a new compliance issue. */
export async function broadcastComplianceIssueNotification(
  input: ComplianceIssueNotificationInput,
): Promise<string | null> {
  if (!input.targetOfficeId) {
    console.error('[notifications] Compliance alert skipped: target office is required', input)
    return null
  }

  const deskLabel = input.targetOfficeName || 'your office'
  const message =
    `${input.reporterName || 'An employee'} flagged "${input.documentTitle}" ` +
    `(${input.issueTitle}). Open Compliance Logs to review and respond.`

  const row = {
    org_id: input.orgId,
    office_id: input.targetOfficeId,
    document_id: input.documentId,
    target_role: 'employee',
    user_id: null,
    title: 'Compliance Issue Reported',
    message,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
  }

  const db = getServiceSupabase()
  const { data, error } = await db
    .from('notifications')
    .insert(row)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[notifications] Compliance issue alert failed:', error?.message, row)
    return null
  }

  return (data as { id: string }).id
}

export interface ComplianceMessageNotificationInput {
  orgId: string
  documentId: string
  documentTitle: string
  issueId: string
  targetOfficeId: string
  targetOfficeName?: string | null
  senderName?: string | null
  preview: string
}

/** Notify the targeted office when a new compliance thread message arrives. */
export async function broadcastComplianceMessageNotification(
  input: ComplianceMessageNotificationInput,
): Promise<string | null> {
  if (!input.targetOfficeId) return null

  const row = {
    org_id: input.orgId,
    office_id: input.targetOfficeId,
    document_id: input.documentId,
    target_role: 'employee',
    user_id: null,
    title: 'New Compliance Message',
    message:
      `${input.senderName || 'A colleague'} messaged about "${input.documentTitle}": ` +
      `"${input.preview.slice(0, 120)}${input.preview.length > 120 ? '…' : ''}"`,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
  }

  const db = getServiceSupabase()
  const { data, error } = await db
    .from('notifications')
    .insert(row)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[notifications] Compliance message alert failed:', error?.message, row)
    return null
  }

  return (data as { id: string }).id
}

export interface DocumentOwnerNotificationInput {
  orgId: string
  documentId: string
  documentTitle: string
  userId: string | null | undefined
  title: string
  message: string
  trackingStatus?: string | null
  originOfficeId?: string | null
  originOfficeName?: string | null
  targetOfficeId?: string | null
  targetOfficeName?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Inserts a persistent notification targeting the document owner/uploader (doc.user_id)
 * and broadcasts a realtime WebSocket event (DOCUMENT_OWNER_UPDATE) to org:<orgId>:user:<doc.user_id>.
 */
export async function notifyDocumentOwner(
  input: DocumentOwnerNotificationInput,
): Promise<string | null> {
  if (!input.userId) return null
  const normalizedUserId = String(input.userId).trim()
  if (!normalizedUserId || normalizedUserId === 'null' || normalizedUserId === 'undefined') return null

  const row = {
    org_id: input.orgId,
    document_id: input.documentId,
    user_id: normalizedUserId,
    target_role: 'client',
    title: input.title,
    message: input.message,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
  }

  const db = getServiceSupabase()
  const { data, error } = await db
    .from('notifications')
    .insert(row)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[notifications] Document owner notification insert failed:', error?.message, row)
  }

  // Realtime Broadcast to owner channel: org:<orgId>:user:<userId>
  const config = useRuntimeConfig()
  const supabaseUrl = String(config.public.supabaseUrl || '').replace(/\/$/, '')
  const supabaseKey = String(config.supabaseServiceKey || '')

  if (supabaseUrl && supabaseKey) {
    const normalizedOrgId = String(input.orgId).trim()
    const topic = `org:${normalizedOrgId}:user:${normalizedUserId}`
    const payload = {
      type: 'DOCUMENT_OWNER_UPDATE',
      event: 'DOCUMENT_OWNER_UPDATE',
      document_id: input.documentId,
      document_title: input.documentTitle,
      title: input.title,
      message: input.message,
      tracking_status: input.trackingStatus ?? null,
      origin_office_id: input.originOfficeId ?? null,
      origin_office_name: input.originOfficeName ?? null,
      target_office_id: input.targetOfficeId ?? null,
      target_office_name: input.targetOfficeName ?? null,
      timestamp: new Date().toISOString(),
      ...(input.metadata ?? {}),
    }

    try {
      await $fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          messages: [
            {
              topic,
              event: 'DOCUMENT_OWNER_UPDATE',
              payload,
            },
          ],
        },
      })
      console.log(`[notifications] Realtime DOCUMENT_OWNER_UPDATE sent to: ${topic}`)
    } catch (broadcastErr: any) {
      console.warn('[notifications] Realtime DOCUMENT_OWNER_UPDATE broadcast failed (non-fatal):', broadcastErr?.message || broadcastErr)
    }
  }

  return data ? (data as { id: string }).id : null
}

/** Notify the document creator (client role) when tracking status changes. */
export async function notifyClientStatusUpdate(
  input: ClientStatusNotificationInput,
): Promise<string | null> {
  if (!input.clientUserId) return null

  const row = {
    org_id: input.orgId,
    document_id: input.documentId,
    user_id: input.clientUserId,
    target_role: 'client',
    title: `Document Update: ${input.trackingStatus}`,
    message:
      input.message ??
      `Your document "${input.documentTitle}" status has been updated to "${input.trackingStatus}".`,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
  }

  const db = getServiceSupabase()
  const { data, error } = await db
    .from('notifications')
    .insert(row)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[notifications] Client update alert failed:', error?.message, row)
    return null
  }

  return (data as { id: string }).id
}

/** Alert destination office employees that a messenger dropped off a folder awaiting desk review. */
export async function broadcastOfficeReviewNotification(input: {
  orgId: string
  documentId: string
  documentTitle: string
  officeId: string
  officeName?: string | null
  messengerName?: string | null
}): Promise<string | null> {
  if (!input.officeId) return null

  const deskLabel = input.officeName || 'your office'
  const row = {
    org_id: input.orgId,
    office_id: input.officeId,
    document_id: input.documentId,
    target_role: 'employee',
    user_id: null,
    title: 'Inbound Document — Review Required',
    message:
      `${input.messengerName || 'A messenger'} delivered "${input.documentTitle}" to ${deskLabel}. ` +
      'Open the document preview, verify the hard copy, and mark the checkpoint done to release the next pickup.',
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
  }

  const db = getServiceSupabase()
  const { data, error } = await db
    .from('notifications')
    .insert(row)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[notifications] Office review alert failed:', error?.message, row)
    return null
  }

  return (data as { id: string }).id
}

/** Service-role Supabase client — bypasses RLS on public.notifications. */
function getServiceSupabase() {
  const config = useRuntimeConfig()
  return createClient(
    String(config.public.supabaseUrl),
    String(config.supabaseServiceKey),
  )
}

function isUnclaimedFlag(value: unknown): boolean {
  return value === false || value === 'false' || value === 0 || value == null
}

/**
 * Broadcast a pickup request to the entire messenger pool in an organisation.
 * Matches public.notifications schema: user_id NULL = org-wide pool broadcast.
 */
export async function broadcastPickupNotification(
  _client: ActivitySupabaseClient,
  input: BroadcastPickupInput,
): Promise<string> {
  const db = getServiceSupabase()
  const routeContext = await resolveMessengerPickupRouteContext(db, input.documentId)

  const pickupLabel = routeContext.pickup_source_name ?? 'Origin desk'
  const destinationLabel = routeContext.destination_office_name ?? 'Next route office'

  const message =
    `A new document "${input.documentTitle}" is ready for collection at ${pickupLabel}. ` +
    `Deliver next to ${destinationLabel}.`

  const row = {
    org_id: input.orgId,
    document_id: input.documentId,
    target_role: 'messenger',
    user_id: null,
    title: 'New Document Ready for Pickup',
    message,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
    metadata: routeContext,
  }

  const { data, error } = await db
    .from('notifications')
    .insert(row)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[notifications] Broadcast insert failed:', error?.message, row)
    throw createError({
      statusCode: 500,
      message: `Notification broadcast failed: ${error?.message ?? 'unknown error'}`,
      data: { row },
    })
  }

  return (data as { id: string }).id
}

/** @deprecated Use broadcastPickupNotification */
export async function createPickupNotification(
  input: { orgId: string, documentId: string, title: string, message: string, userId?: string | null },
  client: ActivitySupabaseClient,
): Promise<string | null> {
  try {
    return await broadcastPickupNotification(client, {
      orgId: input.orgId,
      documentId: input.documentId,
      documentTitle: input.title.replace(/^Pickup:\s*/i, '') || 'Document',
    })
  } catch (err) {
    console.error('[notifications] createPickupNotification failed:', err)
    return null
  }
}

export async function fetchNotificationsForRole(
  event: H3Event,
  options: { unclaimedOnly?: boolean } = {},
) {
  const client = await serverSupabaseClient(event)
  const userId = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role')

  if (!userId || !userRole) {
    throw createError({ statusCode: 401, message: 'Authentication required.' })
  }

  if (userRole.toLowerCase() !== 'messenger') {
    throw createError({ statusCode: 403, message: 'Only messengers can view pickup notifications.' })
  }

  const actor = await resolveActorContext(event, client)
  const db = getServiceSupabase()

  // Pool broadcasts use user_id = null — never .eq('user_id', userId) on this query.
  let query = db
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('org_id', actor.orgId)
    .ilike('target_role', 'messenger')
    .order('created_at', { ascending: false })
    .limit(50)

  if (options.unclaimedOnly !== false) {
    query = query.eq('is_claimed', false)
  } else {
    query = query.or(`is_claimed.eq.false,claimed_by_user_id.eq.${userId}`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[notifications] Messenger fetch failed:', error.message, { orgId: actor.orgId, userId })
    throw createError({ statusCode: 500, message: error.message })
  }

  const rows = data ?? []

  if (rows.length === 0) {
    console.info('[notifications] Messenger queue empty', { orgId: actor.orgId, userId })
  }

  // Filter out notifications for documents that are not in a claimable status
  let filteredRows = rows
  if (options.unclaimedOnly !== false) {
    filteredRows = rows.filter((row) => {
      const doc = (row as any).documents
      if (doc) {
        return ['CREATED', 'ARRIVED_AT_OFFICE'].includes(doc.tracking_status)
      }
      return true
    })
  }

  if (options.unclaimedOnly === false) {
    return filteredRows
  }

  return filteredRows.filter((row) => isUnclaimedFlag(row.is_claimed))
}

export async function countUnclaimedMessengerNotifications(event: H3Event): Promise<number> {
  const rows = await fetchNotificationsForRole(event, { unclaimedOnly: true })
  return rows.length
}

export async function fetchEmployeeNotifications(
  event: H3Event,
  options: { unreadOnly?: boolean } = {},
) {
  const client = await serverSupabaseClient(event)
  const userId = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role')

  if (!userId || !userRole) {
    throw createError({ statusCode: 401, message: 'Authentication required.' })
  }

  if (userRole.toLowerCase() !== 'employee') {
    throw createError({ statusCode: 403, message: 'Only employees can view office inbound notifications.' })
  }

  const actor = await resolveActorContextWithOffices(event, client)
  const db = getServiceSupabase()

  const officeIds = await resolveEmployeeAssignedOfficeIds(db, actor.orgId, actor.userId)

  if (officeIds.length === 0) {
    console.info('[notifications] Employee has no offices via offices.assigned_user', {
      orgId: actor.orgId,
      userId: actor.userId,
    })
    return []
  }

  let query = db
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('org_id', actor.orgId)
    .ilike('target_role', 'employee')
    .in('office_id', officeIds)
    .order('created_at', { ascending: false })
    .limit(50)

  if (options.unreadOnly !== false) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('[notifications] Employee fetch failed:', error.message, {
      orgId: actor.orgId,
      userId: actor.userId,
      officeIds,
    })
    throw createError({ statusCode: 500, message: error.message })
  }

  const rows = data ?? []

  if (rows.length === 0) {
    console.info('[notifications] Employee inbound queue empty', {
      orgId: actor.orgId,
      userId: actor.userId,
      officeIds,
      unreadOnly: options.unreadOnly !== false,
    })
  }

  return rows
}

export async function fetchClientNotifications(
  event: H3Event,
  options: { unreadOnly?: boolean } = {},
) {
  const client = await serverSupabaseClient(event)
  const userId = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role')

  if (!userId || !userRole) {
    throw createError({ statusCode: 401, message: 'Authentication required.' })
  }

  if (userRole.toLowerCase() !== 'client') {
    throw createError({ statusCode: 403, message: 'Only clients can view document update notifications.' })
  }

  const actor = await resolveActorContext(event, client)
  const db = getServiceSupabase()

  let query = db
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('org_id', actor.orgId)
    .eq('user_id', actor.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (options.unreadOnly !== false) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('[notifications] Client fetch failed:', error.message, {
      orgId: actor.orgId,
      userId: actor.userId,
    })
    throw createError({ statusCode: 500, message: error.message })
  }

  return data ?? []
}

export async function markClientNotificationRead(
  notificationId: string,
  clientOrgId: string,
  clientUserId: string,
): Promise<boolean> {
  const db = getServiceSupabase()

  const { data: notif, error: notifErr } = await db
    .from('notifications')
    .select('id, org_id, user_id, target_role')
    .eq('id', notificationId)
    .single()

  if (notifErr || !notif) return false
  if (String(notif.org_id) !== String(clientOrgId)) return false
  if (String(notif.user_id) !== String(clientUserId)) return false

  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  return !error
}

export async function markEmployeeNotificationRead(
  notificationId: string,
  employeeOrgId: string,
  employeeOfficeIds: string[],
): Promise<boolean> {
  const db = getServiceSupabase()

  const { data: notif, error: notifErr } = await db
    .from('notifications')
    .select('id, org_id, office_id, target_role')
    .eq('id', notificationId)
    .single()

  if (notifErr || !notif) return false
  if (String(notif.org_id) !== String(employeeOrgId)) return false
  if (String(notif.target_role).toLowerCase() !== 'employee') return false

  if (notif.office_id && employeeOfficeIds.length > 0) {
    if (!employeeOfficeIds.includes(String(notif.office_id))) return false
  } else if (notif.office_id && employeeOfficeIds.length === 0) {
    return false
  }

  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  return !error
}

export interface ClaimPickupResult {
  success: boolean
  code?: string
  message: string
  document?: {
    id: string
    title: string
    tracking_status: string
    assigned_messenger_id: string
  }
}

/**
 * Atomic messenger pickup claim with optimistic concurrency lock.
 */
export async function claimPickupNotification(
  client: ActivitySupabaseClient,
  notificationId: string,
  userId: string,
  userName: string,
  messengerOrgId: string,
): Promise<ClaimPickupResult> {
  const db = getServiceSupabase()

  const { data: notif, error: notifErr } = await db
    .from('notifications')
    .select('id, org_id, document_id, is_claimed, claimed_by_user_id, target_role')
    .eq('id', notificationId)
    .single()

  if (notifErr || !notif) {
    return { success: false, code: 'NOT_FOUND', message: 'Pickup notification not found.' }
  }

  if (String(notif.org_id) !== String(messengerOrgId)) {
    return {
      success: false,
      code: 'ORG_MISMATCH',
      message: 'This pickup request belongs to a different organisation.',
    }
  }

  if (notif.is_claimed) {
    return {
      success: false,
      code: 'ALREADY_CLAIMED',
      message: 'This package has already been collected by another messenger.',
    }
  }

  const { data: doc, error: docErr } = await db
    .from('documents')
    .select('id, title, tracking_status, current_step, stage_id, origin_office_id, current_office_id, office_id, org_id, user_id, checkpoint_cleared_step')
    .eq('id', notif.document_id)
    .single()

  if (docErr || !doc) {
    return { success: false, code: 'DOCUMENT_NOT_FOUND', message: 'Linked document no longer exists.' }
  }

  if (String(doc.org_id) !== String(messengerOrgId)) {
    return { success: false, code: 'ORG_MISMATCH', message: 'Document belongs to a different organisation.' }
  }

  if (!['CREATED', 'ARRIVED_AT_OFFICE'].includes(doc.tracking_status)) {
    return {
      success: false,
      code: 'INVALID_STATUS',
      message: `Document is in "${doc.tracking_status}" status and cannot be claimed for pickup.`,
    }
  }

  if (
    doc.tracking_status === 'ARRIVED_AT_OFFICE' &&
    (doc.checkpoint_cleared_step ?? null) !== (doc.current_step ?? 0)
  ) {
    return {
      success: false,
      code: 'NOT_CLEARED',
      message: 'This document is still awaiting office desk review. An employee must mark the checkpoint done before pickup.',
    }
  }

  const { data: claimedRows, error: claimErr } = await db
    .from('notifications')
    .update({
      is_claimed: true,
      claimed_by_user_id: userId,
      is_read: true,
    })
    .eq('id', notificationId)
    .eq('is_claimed', false)
    .select('id')

  if (claimErr) {
    return { success: false, code: 'CLAIM_FAILED', message: claimErr.message }
  }

  const claimed = Array.isArray(claimedRows) ? claimedRows : claimedRows ? [claimedRows] : []
  if (claimed.length === 0) {
    return {
      success: false,
      code: 'ALREADY_CLAIMED',
      message: 'This package has already been collected by another messenger.',
    }
  }

  const { data: updatedDoc, error: updateErr } = await db
    .from('documents')
    .update({
      assigned_messenger_id: userId,
      tracking_status: 'PICKED_UP',
    })
    .eq('id', doc.id)
    .in('tracking_status', ['CREATED', 'ARRIVED_AT_OFFICE'])
    .select('id, title, tracking_status, assigned_messenger_id')
    .single()

  if (updateErr || !updatedDoc) {
    await db
      .from('notifications')
      .update({ is_claimed: false, claimed_by_user_id: null, is_read: false })
      .eq('id', notificationId)

    return {
      success: false,
      code: 'DOCUMENT_UPDATE_FAILED',
      message: 'Document was already picked up by another messenger.',
    }
  }

  await db
    .from('notifications')
    .update({
      is_claimed: true,
      claimed_by_user_id: userId,
      is_read: true,
    })
    .eq('document_id', doc.id)
    .eq('org_id', notif.org_id)
    .eq('is_claimed', false)

  const logMessage = `${userName} accepted and picked up ${doc.title}`

  await logActivitySafe({
    orgId: String(notif.org_id),
    userId,
    userName,
    actorName: userName,
    actionType: 'pickup',
    details: logMessage,
    message: logMessage,
    documentId: doc.id,
    officeId: doc.origin_office_id ?? null,
    metadata: { notification_id: notificationId },
  }, client)

  await client.from('document_tracking_events').insert({
    document_id: doc.id,
    org_id: String(notif.org_id),
    status: 'PICKED_UP',
    step_index: doc.current_step ?? 0,
    actor_id: userId,
    actor_role: 'messenger',
    actor_name: userName,
    notes: logMessage,
  })

  try {
    const destination = await resolveTargetOfficeIdForInboundNotification(db, doc)

    if (!destination.officeId) {
      console.error('[notifications] Cannot route inbound alert — no target office on document', {
        documentId: doc.id,
        current_office_id: doc.current_office_id,
        office_id: doc.office_id,
        origin_office_id: doc.origin_office_id,
      })
    } else {
      let officeName = destination.officeName

      if (!officeName) {
        const { data: officeRow } = await db
          .from('offices')
          .select('name')
          .eq('id', destination.officeId)
          .maybeSingle()
        officeName = officeRow?.name ?? null
      }

      const inboundId = await broadcastInboundOfficeNotification({
        orgId: String(doc.org_id),
        documentId: doc.id,
        documentTitle: doc.title,
        messengerName: userName,
        officeId: destination.officeId,
        officeName,
      })

      if (!inboundId) {
        console.error('[notifications] Inbound office alert was not created', {
          documentId: doc.id,
          officeId: destination.officeId,
        })
      }

      const dispatchPayload = {
        type: 'INCOMING_DISPATCH',
        event: 'INCOMING_DISPATCH',
        document_id: doc.id,
        document_title: doc.title,
        batch_manifest_id: null,
        target_office_id: destination.officeId,
        target_office_name: officeName,
        next_step: destination.stepNumber ?? (doc.current_step ?? 0) + 1,
        assigned_messenger_id: userId,
        messenger_name: userName,
        tracking_status: 'PICKED_UP',
        dispatched_at: new Date().toISOString(),
        notes: officeName
          ? `${userName} accepted pickup for "${doc.title}" → transferring to ${officeName}.`
          : `${userName} accepted pickup for "${doc.title}".`,
      }

      await broadcastInboundDispatchRealtime(
        String(doc.org_id),
        destination.officeId,
        'INCOMING_DISPATCH',
        dispatchPayload,
      )
      await broadcastInboundDispatchRealtime(
        String(doc.org_id),
        destination.officeId,
        'ASN_PROACTIVE_ALERT',
        dispatchPayload,
      )
    }

    await notifyClientStatusUpdate({
      orgId: String(doc.org_id),
      documentId: doc.id,
      documentTitle: doc.title,
      trackingStatus: 'PICKED_UP',
      clientUserId: doc.user_id ? String(doc.user_id) : null,
    })
  } catch (inboundErr) {
    console.warn('[notifications] Inbound office notification failed:', inboundErr)
  }

  return {
    success: true,
    message: logMessage,
    document: {
      id: updatedDoc.id,
      title: updatedDoc.title,
      tracking_status: updatedDoc.tracking_status,
      assigned_messenger_id: updatedDoc.assigned_messenger_id,
    },
  }
}
