import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import { buildDocumentTrackQrPayload } from '~~/server/utils/documentQr'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { broadcastPickupNotification } from '~~/server/utils/notifications'

const ALLOWED_ROLES = ['client', 'employee'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

export type DocumentPriority = 'High' | 'Medium' | 'Low'
const PRIORITIES: DocumentPriority[] = ['High', 'Medium', 'Low']

export interface RegisterDocumentBody {
  title: string
  description?: string
  priority: DocumentPriority
  stage_id: string
  origin_office_id?: string | null
}

interface ResolvedRouteStep {
  step_number: number
  office_id: string
  office_name: string
  office_code: string | null
  org_id: string
}

export async function registerMetadataDocument(event: H3Event, body: RegisterDocumentBody) {
  const client = await serverSupabaseClient(event)

  const userId = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role') as AllowedRole | undefined

  if (!userId || !userRole || !(ALLOWED_ROLES as readonly string[]).includes(userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client or employee accounts may register documents.',
    })
  }

  const title = body.title?.trim()
  const description = body.description?.trim() || ''
  const priority = body.priority
  const stageIdRaw = body.stage_id?.trim()
  const originOfficeId = body.origin_office_id?.trim() || null

  if (!title) {
    throw createError({ statusCode: 400, message: 'Document title is required.' })
  }
  if (!stageIdRaw) {
    throw createError({ statusCode: 400, message: 'Target route (stage) is required.' })
  }
  if (!priority || !PRIORITIES.includes(priority)) {
    throw createError({
      statusCode: 400,
      message: 'Priority must be one of: High, Medium, Low.',
    })
  }

  const { data: actorRow, error: actorErr } = await client
    .from('users')
    .select('org_id, full_name, role')
    .eq('user_id', userId)
    .single()

  if (actorErr || !actorRow?.org_id) {
    throw createError({
      statusCode: 401,
      message: 'Could not resolve authenticated user profile. Please log in again.',
    })
  }

  const orgId = String(actorRow.org_id)
  const actorName = actorRow.full_name ?? null
  const resolvedRole = (actorRow.role as string) === userRole ? userRole : null

  if (!resolvedRole) {
    throw createError({
      statusCode: 403,
      message: 'Role mismatch: session cookie does not match database profile.',
    })
  }

  let resolvedOriginOfficeId: string | null = null
  let resolvedOfficeName: string | null = null

  if (resolvedRole === 'employee') {
    if (!originOfficeId) {
      throw createError({
        statusCode: 400,
        message:
          'EMPLOYEE_ORIGIN_REQUIRED: Employees must supply origin_office_id — ' +
          'the sub-office/branch where this hard-copy is being physically registered.',
      })
    }

    const { data: officeRow, error: officeErr } = await client
      .from('offices')
      .select('id, name, org_id, assigned_user')
      .eq('id', originOfficeId)
      .maybeSingle()

    if (officeErr) {
      throw createError({ statusCode: 500, message: `Office lookup failed: ${officeErr.message}` })
    }
    if (!officeRow) {
      throw createError({
        statusCode: 404,
        message: `OFFICE_NOT_FOUND: No office found with id ${originOfficeId}.`,
      })
    }
    if (String(officeRow.org_id) !== orgId) {
      throw createError({
        statusCode: 403,
        message: 'CROSS_ORG_VIOLATION: Office belongs to a different organisation.',
      })
    }
    if (String(officeRow.assigned_user) !== String(userId)) {
      throw createError({
        statusCode: 403,
        message: 'UNAUTHORIZED_OFFICE: This office is not assigned to your account.',
      })
    }

    resolvedOriginOfficeId = String(officeRow.id)
    resolvedOfficeName = officeRow.name
  }

  let resolvedStageId: string | null = stageIdRaw
  let resolvedRouteSteps: ResolvedRouteStep[] = []

  const { data: stageRow, error: stageErr } = await client
    .from('stages')
    .select('stage_id, name, org_id, office_id')
    .eq('stage_id', stageIdRaw)
    .maybeSingle()

  if (stageErr) {
    throw createError({ statusCode: 500, message: `Stage lookup failed: ${stageErr.message}` })
  }
  if (!stageRow) {
    throw createError({
      statusCode: 404,
      message: `STAGE_NOT_FOUND: No stage template found with id ${stageIdRaw}.`,
    })
  }
  if (String(stageRow.org_id) !== orgId) {
    throw createError({
      statusCode: 403,
      message: 'CROSS_ORG_VIOLATION: The selected stage template belongs to a different organisation.',
    })
  }
  if (resolvedRole === 'employee' && stageRow.office_id) {
    if (String(stageRow.office_id) !== resolvedOriginOfficeId) {
      throw createError({
        statusCode: 403,
        message:
          'STAGE_SCOPE_MISMATCH: Employees may only use global stages or stages scoped to their own sub-office.',
      })
    }
  }

  resolvedStageId = String(stageRow.stage_id)

  const { data: rawSteps, error: stepsErr } = await client
    .from('stage_steps')
    .select('step_number, office_id')
    .eq('stage_id', resolvedStageId)
    .order('step_number', { ascending: true })

  if (stepsErr) {
    throw createError({
      statusCode: 500,
      message: `Route checkpoint fetch failed: ${stepsErr.message}`,
    })
  }

  const steps = rawSteps ?? []

  if (steps.length > 0) {
    const uniqueCheckpointIds = [
      ...new Set(steps.map((s: { office_id: string }) => String(s.office_id)).filter(Boolean)),
    ]

    const { data: checkpointOffices, error: cpOfficeErr } = await client
      .from('offices')
      .select('id, name, code, org_id')
      .in('id', uniqueCheckpointIds)

    if (cpOfficeErr) {
      throw createError({
        statusCode: 500,
        message: `Route checkpoint office verification failed: ${cpOfficeErr.message}`,
      })
    }

    const fetchedOffices = checkpointOffices ?? []
    const crossOrgViolators = fetchedOffices.filter(
      (o: { org_id: string }) => String(o.org_id) !== orgId,
    )

    if (crossOrgViolators.length > 0) {
      throw createError({
        statusCode: 403,
        message: 'CROSS_ORG_ROUTE_VIOLATION: Route contains offices from another organisation.',
      })
    }

    const fetchedIds = new Set(fetchedOffices.map((o: { id: string }) => String(o.id)))
    const ghostIds = uniqueCheckpointIds.filter((id) => !fetchedIds.has(id))

    if (ghostIds.length > 0) {
      throw createError({
        statusCode: 404,
        message: `INVALID_ROUTE_CHECKPOINTS: Unknown office IDs in route: [${ghostIds.join(', ')}].`,
      })
    }

    const officeMap = fetchedOffices.reduce(
      (acc: Record<string, { name?: string; code?: string; org_id?: string }>, o: { id: string; name?: string; code?: string; org_id?: string }) => {
        acc[String(o.id)] = o
        return acc
      },
      {},
    )

    resolvedRouteSteps = steps.map((s: { step_number: number; office_id: string }) => {
      const office = officeMap[String(s.office_id)]
      return {
        step_number: s.step_number,
        office_id: String(s.office_id),
        office_name: office?.name ?? `Office ${String(s.office_id).slice(0, 8)}`,
        office_code: office?.code ?? null,
        org_id: String(office?.org_id ?? orgId),
      }
    })
  }

  const documentId = randomUUID()
  const qrPayload = buildDocumentTrackQrPayload(documentId)
  const effectiveOfficeId = resolvedOriginOfficeId

  const { data: supabaseDoc, error: supabaseError } = await client
    .from('documents')
    .insert({
      id: documentId,
      org_id: orgId,
      office_id: effectiveOfficeId,
      stage_id: resolvedStageId,
      user_id: userId,
      title,
      description,
      qr_code_data: qrPayload,
      status: 'Pending',
      tracking_status: 'CREATED',
      current_step: 0,
      creator_role: resolvedRole,
      origin_office_id: resolvedOriginOfficeId,
      current_office_id: resolvedOriginOfficeId,
    })
    .select()
    .single()

  if (supabaseError) {
    throw createError({
      statusCode: 500,
      message: `Document registration failed: ${supabaseError.message}`,
    })
  }

  try {
    let routeSnapshotLine = ''
    if (resolvedRouteSteps.length > 0) {
      const originLabel = resolvedOfficeName ? `[Origin: ${resolvedOfficeName}]` : '[Origin: Org-wide]'
      const stopLabels = resolvedRouteSteps.map((step, idx) => {
        const isLast = idx === resolvedRouteSteps.length - 1
        const label = step.office_code
          ? `${step.office_name} (${step.office_code})`
          : step.office_name
        return isLast ? `Final Stop: ${label}` : `Stop ${step.step_number}: ${label}`
      })
      routeSnapshotLine =
        `\nRoute schema locked (${resolvedRouteSteps.length} checkpoint${resolvedRouteSteps.length !== 1 ? 's' : ''}): ` +
        [originLabel, ...stopLabels].join(' → ')
    }

    const initNotes = resolvedRole === 'employee'
      ? `Hard-copy registered at "${resolvedOfficeName}" (office: ${resolvedOriginOfficeId}) ` +
        `by ${actorName ?? 'an employee'} (role: employee). Priority: ${priority}. ` +
        `Armed for messenger QR-scan pickup.` +
        routeSnapshotLine
      : `Hard-copy registered org-wide under organisation ${orgId} ` +
        `by ${actorName ?? 'an administrator'} (role: client). Priority: ${priority}. ` +
        `Ready for messenger pickup.` +
        routeSnapshotLine

    await client.from('document_tracking_events').insert({
      document_id: documentId,
      org_id: orgId,
      status: 'CREATED',
      step_index: 0,
      office_id: null,
      office_name: resolvedOfficeName,
      actor_id: userId,
      actor_role: resolvedRole,
      actor_name: actorName,
      notes: initNotes,
    })
  } catch (trackErr) {
    console.warn('[Register] Non-fatal: failed to seed CREATED tracking event:', trackErr)
  }

  const registerMessage = `${actorName ?? 'User'} registered hard-copy "${title}"`

  const activityLogId = await logActivitySafe({
    orgId,
    officeId: resolvedRole === 'client' ? null : effectiveOfficeId,
    userId,
    userName: actorName,
    actorName,
    actionType: 'upload',
    details: registerMessage,
    message: registerMessage,
    documentId,
    metadata: {
      creator_role: resolvedRole,
      tracking_status: 'CREATED',
      priority,
      registration_type: 'metadata_only',
    },
  }, client)

  let notificationId: string | null = null
  try {
    notificationId = await broadcastPickupNotification(client, {
      orgId,
      documentId,
      documentTitle: title,
    })
  } catch (notificationErr) {
    console.error('[Register] Messenger notification broadcast failed:', notificationErr)
  }

  return {
    success: true,
    message: resolvedRole === 'employee'
      ? `Hard-copy registered at "${resolvedOfficeName}" and armed for messenger pickup.`
      : 'Hard-copy registered org-wide. Messengers have been notified.',
    scope: {
      role: resolvedRole,
      org_id: orgId,
      origin_office_id: resolvedOriginOfficeId,
      origin_office: resolvedOfficeName,
      stage_id: resolvedStageId,
      tracking_status: 'CREATED',
      priority,
      route_checkpoints: resolvedRouteSteps.map((s) => ({
        step: s.step_number,
        office_id: s.office_id,
        office_name: s.office_name,
        office_code: s.office_code,
      })),
    },
    metadata: {
      ...supabaseDoc,
      priority,
      qr_code_data: qrPayload,
      activity_log_id: activityLogId,
      notification_id: notificationId,
    },
  }
}
