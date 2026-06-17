import type { H3Event } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext, resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export type ActivitySupabaseClient = Awaited<ReturnType<typeof serverSupabaseClient>>

export const ACTIVITY_ACTION_TYPES = [
  'upload',
  'scan',
  'pickup',
  'dropoff',
  'claim',
  'issue_report',
  'issue_resolve',
  'advance',
  'system',
] as const

export type ActivityActionType = typeof ACTIVITY_ACTION_TYPES[number]

export interface ActivityLogInput {
  orgId: string
  userId: string
  actionType: ActivityActionType | string
  /** Required by DB (`details` NOT NULL). Defaults to `message` when omitted. */
  details?: string
  message?: string
  officeId?: string | null
  userName?: string | null
  actorName?: string | null
  documentId?: string | null
  metadata?: Record<string, unknown> | null
}

function buildActivityRow(input: ActivityLogInput): Record<string, unknown> {
  const details = (input.details ?? input.message ?? '').trim()
  if (!details) {
    throw createError({ statusCode: 500, message: 'Activity log requires non-empty details/message.' })
  }
  if (!input.userId) {
    throw createError({ statusCode: 500, message: 'Activity log requires user_id.' })
  }
  if (!input.orgId) {
    throw createError({ statusCode: 500, message: 'Activity log requires org_id.' })
  }

  const message = (input.message ?? details).trim()

  return {
    org_id: input.orgId,
    office_id: input.officeId ?? null,
    user_id: input.userId,
    action_type: input.actionType,
    details,
    message,
    user_name: input.userName ?? null,
    actor_name: input.actorName ?? input.userName ?? null,
    document_id: input.documentId ?? null,
    metadata: input.metadata ?? {},
  }
}

/**
 * Inserts a row into public.activity_logs. Throws on failure.
 */
export async function logActivity(
  input: ActivityLogInput,
  client: ActivitySupabaseClient,
): Promise<string> {
  const row = buildActivityRow(input)

  const { data, error } = await client
    .from('activity_logs')
    .insert(row)
    .select('id')
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      message: `Activity log insert failed: ${error?.message ?? 'unknown error'}`,
      data: { row },
    })
  }

  return (data as { id: string }).id
}

/**
 * Best-effort activity log — never throws; returns log id or null.
 */
export async function logActivitySafe(
  input: ActivityLogInput,
  client: ActivitySupabaseClient,
): Promise<string | null> {
  try {
    return await logActivity(input, client)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[activityLog] Failed to write activity log:', message, input)
    return null
  }
}

/**
 * Resolves session actor (org_id, user_id, full_name) then writes an activity log.
 */
export async function logActivityForEvent(
  event: H3Event,
  client: ActivitySupabaseClient,
  input: Omit<ActivityLogInput, 'orgId' | 'userId'> & {
    orgId?: string
    userId?: string
    userName?: string | null
    actorName?: string | null
  },
): Promise<string | null> {
  const actor = await resolveActorContext(event, client)

  return logActivitySafe({
    orgId: input.orgId ?? actor.orgId,
    userId: input.userId ?? actor.userId,
    userName: input.userName ?? actor.fullName,
    actorName: input.actorName ?? actor.fullName,
    actionType: input.actionType,
    details: input.details,
    message: input.message,
    officeId: input.officeId,
    documentId: input.documentId,
    metadata: input.metadata,
  }, client)
}

export type ActivityDatePreset = 'day' | 'week' | 'month' | 'all'

export function resolveActivityDateRange(preset: ActivityDatePreset): { from: string | null, to: string | null } {
  if (preset === 'all') return { from: null, to: null }

  const now = new Date()
  const to = now.toISOString()
  const fromDate = new Date(now)

  if (preset === 'day') fromDate.setDate(fromDate.getDate() - 1)
  else if (preset === 'week') fromDate.setDate(fromDate.getDate() - 7)
  else if (preset === 'month') fromDate.setMonth(fromDate.getMonth() - 1)

  return { from: fromDate.toISOString(), to }
}

const ACTIVITY_LOG_COLUMNS =
  'id, org_id, office_id, user_id, user_name, actor_name, action_type, details, message, document_id, metadata, created_at'

export async function fetchActivityLogsForActor(
  event: H3Event,
  options: {
    datePreset?: ActivityDatePreset
    actionType?: string
    limit?: number
  } = {},
) {
  const client = await serverSupabaseClient(event)
  const userId = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role')

  if (!userId || !userRole) {
    throw createError({ statusCode: 401, message: 'Authentication required.' })
  }

  const limit = Math.min(options.limit ?? 100, 500)
  const { from, to } = resolveActivityDateRange(options.datePreset ?? 'week')

  let query = client
    .from('activity_logs')
    .select(ACTIVITY_LOG_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  if (options.actionType && options.actionType !== 'all') {
    query = query.eq('action_type', options.actionType)
  }

  if (userRole === 'messenger') {
    query = query.eq('user_id', userId)
  } else if (userRole === 'client') {
    const actor = await resolveActorContext(event, client)
    query = query.eq('org_id', actor.orgId)
  } else if (userRole === 'employee') {
    const withOffices = await resolveActorContextWithOffices(event, client)
    query = query.eq('org_id', withOffices.orgId)

    const officeIds = withOffices.officeIds
    if (officeIds.length > 0) {
      const officeList = officeIds.join(',')
      query = query.or(`office_id.is.null,office_id.in.(${officeList})`)
    } else {
      query = query.eq('user_id', userId)
    }
  } else {
    throw createError({ statusCode: 403, message: 'Unsupported role for activity log access.' })
  }

  const { data, error } = await query

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    message: (row.message as string | null) ?? (row.details as string | null) ?? '',
  }))
}

export function trackingStatusToActionType(status: string): ActivityActionType {
  switch (status) {
    case 'PICKED_UP': return 'pickup'
    case 'IN_TRANSIT': return 'scan'
    case 'ARRIVED_AT_OFFICE': return 'dropoff'
    case 'DISCREPANCY_REPORTED': return 'issue_report'
    case 'COMPLETED': return 'system'
    default: return 'advance'
  }
}
