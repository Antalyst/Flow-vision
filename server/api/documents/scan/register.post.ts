/**
 * POST /api/documents/scan/register
 *
 * Final step of the "Scan Physical Document" workflow. Takes the user-reviewed
 * (and possibly AI-assisted) metadata plus the final set of captured page
 * photos, and registers a real document through the SAME pipeline as a normal
 * digital upload (`/api/documents/upload`):
 *
 *   1.  RBAC auth guard (client / employee / employee_sub_user)
 *   2.  Resolve actor profile from DB (org_id always server-derived)
 *   3.  Parse multipart payload (reviewed metadata + ordered page images)
 *   4.  Role-specific office validation (identical to /upload)
 *   5.  Stage scope + route checkpoint anti-leakage validation (identical to /upload)
 *   6.  Build the storable file:
 *         FIRST_PAGE      → the single captured photo, stored as-is
 *         FULL_DOCUMENT   → all captured pages combined into one PDF, in order
 *       The original captured pixels are never altered — only losslessly
 *       repackaged into a PDF container for multi-page scans.
 *   7.  Supabase `documents` insert — source_type='SCAN', scan_status, page_count,
 *       ai_analysis_status, scan_session_id (existing scanner columns; no new tables)
 *   8.  MySQL `document_storage` blob insert + back-link (same table as /upload)
 *   9.  document_ai_analysis insert (only if AI metadata was actually supplied —
 *       i.e. NOT recorded when the user chose "Continue Manually")
 *  10.  document_scan_sessions marked COMPLETED
 *  11.  Tracking ledger CREATED event (existing state machine, unchanged)
 *  12.  Activity log (action_type: 'scan') + messenger pickup/ASN notifications
 *       (existing notification system, unchanged)
 *
 * Reuses the existing QR payload builder and MySQL document_storage table —
 * no new QR system, no new tracking system, no new storage architecture.
 */

import { randomUUID } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { serverSupabaseClient } from '#supabase/server'
import { logActivitySafe } from '~~/server/utils/activityLog'
import {
  broadcastPickupNotification,
  broadcastInboundOfficeNotification,
  broadcastInboundDispatchRealtime,
  resolveTargetOfficeIdForInboundNotification,
} from '~~/server/utils/notifications'
import { buildDocumentTrackQrPayload } from '~~/server/utils/documentQr'

const ALLOWED_ROLES = ['client', 'employee', 'employee_sub_user'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

const PRIORITIES = ['High', 'Medium', 'Low'] as const
type Priority = (typeof PRIORITIES)[number]

const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_PAGES = 20

interface ResolvedRouteStep {
  step_number: number
  office_id: string
  office_name: string
  office_code: string | null
  org_id: string
}

export default defineEventHandler(async (event) => {
  const db = event.context.db
  const client = await serverSupabaseClient(event)

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'MySQL storage connector is not available on the request context.',
    })
  }

  // ── Step 1 — RBAC ──────────────────────────────────────────────────────
  const userId = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role') as AllowedRole | undefined

  if (!userId || !userRole || !(ALLOWED_ROLES as readonly string[]).includes(userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client, employee, or sub-user accounts may register documents.',
    })
  }

  // ── Step 2 — Resolve actor (org_id always server-derived) ───────────────
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

  // ── Step 3 — Parse multipart payload ────────────────────────────────────
  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, message: 'No multipart form data received.' })
  }

  const get = (name: string) => formData.find((f) => f.name === name)?.data.toString().trim() || null
  const getBool = (name: string) => get(name) === 'true'

  const sessionId = get('session_id')
  const scanMode = get('scan_mode') === 'FULL_DOCUMENT' ? 'FULL_DOCUMENT' : 'FIRST_PAGE'
  const stageIdRaw = get('stage_id')
  const originOfficeId = get('origin_office_id')
  const categoryId = get('category_id')

  const aiSkipped = getBool('ai_skipped')
  const manualTitle = get('title')
  const manualDescription = get('summary') ?? get('description')

  // FIRST_PAGE is a one-page contract end-to-end — cap here so page_count, the
  // stored file, and the AI-analysis-time page_count can never disagree.
  let pageItems = formData
    .filter((f) => f.name === 'pages')
    .map((f) => ({ data: Buffer.from(f.data), type: f.type || 'image/jpeg' }))
  if (scanMode === 'FIRST_PAGE' && pageItems.length > 1) {
    pageItems = pageItems.slice(0, 1)
  }

  if (!pageItems.length) {
    throw createError({ statusCode: 400, message: 'At least one captured page image is required.' })
  }
  if (pageItems.length > MAX_PAGES) {
    throw createError({ statusCode: 413, message: `Too many pages — maximum ${MAX_PAGES} per scan.` })
  }
  for (const item of pageItems) {
    if (!item.type.startsWith('image/')) {
      throw createError({ statusCode: 415, message: `Unsupported file type for a scanned page: ${item.type}` })
    }
    if (item.data.length > MAX_IMAGE_BYTES) {
      throw createError({ statusCode: 413, message: 'One of the captured pages exceeds the 12MB size limit.' })
    }
  }

  if (!sessionId) {
    throw createError({ statusCode: 400, message: 'session_id is required — start a scan session first.' })
  }

  const { data: session, error: sessionErr } = await client
    .from('document_scan_sessions')
    .select('id, user_id, organization_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionErr) {
    throw createError({ statusCode: 500, message: `Scan session lookup failed: ${sessionErr.message}` })
  }
  if (!session) {
    throw createError({ statusCode: 404, message: 'Scan session not found.' })
  }
  if (String(session.user_id) !== String(userId) || String(session.organization_id) !== orgId) {
    throw createError({ statusCode: 403, message: 'This scan session does not belong to you.' })
  }

  // ── Step 4 — Role-specific office validation (identical to /upload) ─────
  let resolvedOriginOfficeId: string | null = null
  let resolvedOfficeName: string | null = null

  if (resolvedRole === 'employee') {
    if (!originOfficeId) {
      throw createError({
        statusCode: 400,
        message:
          'EMPLOYEE_ORIGIN_REQUIRED: Employees must supply origin_office_id — ' +
          'the sub-office/branch where this scanned hard-copy is being physically registered.',
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
      throw createError({ statusCode: 404, message: `OFFICE_NOT_FOUND: No office found with id ${originOfficeId}.` })
    }
    if (String(officeRow.org_id) !== orgId) {
      throw createError({
        statusCode: 403,
        message: `CROSS_ORG_VIOLATION: Office ${originOfficeId} belongs to a different organisation.`,
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

  // ── Step 5a/5b — Stage + route checkpoint validation (identical to /upload) ─
  let resolvedStageId: string | null = stageIdRaw
  let resolvedRouteSteps: ResolvedRouteStep[] = []

  if (stageIdRaw) {
    const { data: stageRow, error: stageErr } = await client
      .from('stages')
      .select('stage_id, name, org_id, office_id')
      .eq('stage_id', stageIdRaw)
      .maybeSingle()

    if (stageErr) throw createError({ statusCode: 500, message: `Stage lookup failed: ${stageErr.message}` })
    if (!stageRow) throw createError({ statusCode: 404, message: `STAGE_NOT_FOUND: No stage template found with id ${stageIdRaw}.` })
    if (String(stageRow.org_id) !== orgId) {
      throw createError({ statusCode: 403, message: 'CROSS_ORG_VIOLATION: The selected stage template belongs to a different organisation.' })
    }
    if (resolvedRole === 'employee' && stageRow.office_id && String(stageRow.office_id) !== resolvedOriginOfficeId) {
      throw createError({
        statusCode: 403,
        message: 'STAGE_SCOPE_MISMATCH: Employees may only use global stages or stages scoped to their own sub-office.',
      })
    }

    resolvedStageId = String(stageRow.stage_id)

    const { data: rawSteps, error: stepsErr } = await client
      .from('stage_steps')
      .select('step_number, office_id')
      .eq('stage_id', resolvedStageId)
      .order('step_number', { ascending: true })

    if (stepsErr) throw createError({ statusCode: 500, message: `Route checkpoint fetch failed: ${stepsErr.message}` })

    const steps = rawSteps ?? []
    if (steps.length > 0) {
      const uniqueCheckpointIds = [...new Set(steps.map((s: any) => String(s.office_id)).filter(Boolean))]
      const { data: checkpointOffices, error: cpOfficeErr } = await client
        .from('offices')
        .select('id, name, code, org_id')
        .in('id', uniqueCheckpointIds)

      if (cpOfficeErr) throw createError({ statusCode: 500, message: `Route checkpoint office verification failed: ${cpOfficeErr.message}` })

      const fetchedOffices = checkpointOffices ?? []
      const crossOrgViolators = fetchedOffices.filter((o: any) => String(o.org_id) !== orgId)
      if (crossOrgViolators.length > 0) {
        throw createError({
          statusCode: 403,
          message: `CROSS_ORG_ROUTE_VIOLATION: Route checkpoints belong to a different organisation.`,
        })
      }

      const fetchedIds = new Set(fetchedOffices.map((o: any) => String(o.id)))
      const ghostIds = uniqueCheckpointIds.filter((id) => !fetchedIds.has(id))
      if (ghostIds.length > 0) {
        throw createError({ statusCode: 404, message: `INVALID_ROUTE_CHECKPOINTS: Unknown office IDs in route: [${ghostIds.join(', ')}].` })
      }

      const officeMap = fetchedOffices.reduce((acc: Record<string, any>, o: any) => { acc[String(o.id)] = o; return acc }, {})
      resolvedRouteSteps = steps.map((s: any) => {
        const office = officeMap[String(s.office_id)]
        return {
          step_number: s.step_number,
          office_id: String(s.office_id),
          office_name: office?.name ?? `Office ${String(s.office_id).slice(0, 8)}`,
          office_code: office?.code ?? null,
          org_id: String(office?.org_id ?? orgId),
        } satisfies ResolvedRouteStep
      })
    }
  }

  // ── Step 6 — Build the storable file from captured pages ───────────────
  let storageBuffer: Buffer
  let storageFileName: string
  let storageMimeType: string

  if (scanMode === 'FIRST_PAGE' || pageItems.length === 1) {
    const first = pageItems[0]!
    storageBuffer = first.data
    storageMimeType = first.type
    storageFileName = `scan-${Date.now()}.${storageMimeType === 'image/png' ? 'png' : 'jpg'}`
  } else {
    try {
      const pdfDoc = await PDFDocument.create()
      for (const page of pageItems) {
        const embedded = page.type === 'image/png'
          ? await pdfDoc.embedPng(page.data)
          : await pdfDoc.embedJpg(page.data)
        const pdfPage = pdfDoc.addPage([embedded.width, embedded.height])
        pdfPage.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })
      }
      storageBuffer = Buffer.from(await pdfDoc.save())
      storageMimeType = 'application/pdf'
      storageFileName = `scan-${Date.now()}.pdf`
    } catch (pdfErr: any) {
      throw createError({
        statusCode: 422,
        message: `Could not combine the ${pageItems.length} scanned pages into a document: ${pdfErr.message}`,
        data: { code: 'SCAN_PDF_BUILD_FAILED' },
      })
    }
  }

  // ── Step 7-11 — Persist everything ──────────────────────────────────────
  const documentId = randomUUID()
  const qrCode = buildDocumentTrackQrPayload(documentId)
  const effectiveOfficeId = resolvedOriginOfficeId

  const title = (manualTitle && manualTitle.trim()) || `Scanned Document ${new Date().toLocaleDateString()}`
  const description = (manualDescription && manualDescription.trim()) || 'Registered via physical document scan.'

  const priorityRaw = get('priority')
  const priority: Priority = (PRIORITIES as readonly string[]).includes(priorityRaw ?? '')
    ? (priorityRaw as Priority)
    : 'Medium'

  let supabaseDocId: string | null = null
  let mysqlInsertedId: number | null = null

  try {
    const { data: supabaseDoc, error: supabaseError } = await client
      .from('documents')
      .insert({
        id: documentId,
        org_id: orgId,
        office_id: effectiveOfficeId,
        stage_id: resolvedStageId,
        user_id: userId,
        category_id: categoryId || null,
        title,
        description,
        qr_code_data: qrCode,
        status: 'Pending',
        tracking_status: 'CREATED',
        current_step: 0,
        creator_role: resolvedRole,
        origin_office_id: resolvedOriginOfficeId,
        current_office_id: resolvedOriginOfficeId,
        priority,
        source_type: 'SCAN',
        scan_status: 'COMPLETED',
        ai_analysis_status: aiSkipped ? 'NOT_ANALYZED' : 'COMPLETED',
        page_count: pageItems.length,
        scan_session_id: sessionId,
      })
      .select()
      .single()

    if (supabaseError) throw supabaseError
    supabaseDocId = supabaseDoc.id

    // MySQL blob insert (same document_storage table as /upload)
    const [mysqlResult] = await db.execute(
      'INSERT INTO document_storage (document_uuid, file_blob, file_name, mime_type) VALUES (?, ?, ?, ?)',
      [supabaseDoc.id, storageBuffer, storageFileName, storageMimeType],
    )
    mysqlInsertedId = (mysqlResult as any).insertId

    const { error: linkError } = await client
      .from('documents')
      .update({ mysql_storage_id: mysqlInsertedId })
      .eq('id', supabaseDoc.id)
    if (linkError) throw linkError

    // AI analysis persistence — only when the user actually had AI metadata to review
    if (!aiSkipped) {
      const confidenceRaw = Number(get('confidence'))
      const rawResponseStr = get('raw_response')
      let rawResponse: Record<string, unknown> = {}
      if (rawResponseStr) {
        try { rawResponse = JSON.parse(rawResponseStr) } catch { /* keep empty */ }
      }

      const { error: aiErr } = await client.from('document_ai_analysis').insert({
        document_id: supabaseDoc.id,
        scan_session_id: sessionId,
        model: get('model') || 'unknown',
        document_type: get('document_type'),
        title: get('title'),
        sender: get('sender'),
        recipient: get('recipient'),
        subject: get('subject'),
        document_date: get('document_date') || null,
        summary: get('summary'),
        priority,
        contains_signature: getBool('contains_signature'),
        contains_letterhead: getBool('contains_letterhead'),
        contains_stamp: getBool('contains_stamp'),
        contains_seal: getBool('contains_seal'),
        confidence: Number.isFinite(confidenceRaw) ? confidenceRaw : null,
        raw_response: rawResponse,
      })
      if (aiErr) console.warn('[Scan Register] Non-fatal: failed to persist document_ai_analysis:', aiErr)
    }

    // Close out the scan session
    await client
      .from('document_scan_sessions')
      .update({ status: 'COMPLETED', page_count: pageItems.length, completed_at: new Date().toISOString() })
      .eq('id', sessionId)

    // Tracking ledger CREATED event (existing state machine, unchanged)
    try {
      let routeSnapshotLine = ''
      if (resolvedRouteSteps.length > 0) {
        const originLabel = resolvedOfficeName ? `[Origin: ${resolvedOfficeName}]` : '[Origin: Org-wide]'
        const stopLabels = resolvedRouteSteps.map((step, idx) => {
          const isLast = idx === resolvedRouteSteps.length - 1
          const label = step.office_code ? `${step.office_name} (${step.office_code})` : step.office_name
          return isLast ? `Final Stop: ${label}` : `Stop ${step.step_number}: ${label}`
        })
        routeSnapshotLine = `\nRoute schema locked (${resolvedRouteSteps.length} checkpoint${resolvedRouteSteps.length !== 1 ? 's' : ''}): ` + [originLabel, ...stopLabels].join(' → ')
      }

      const initNotes = resolvedRole === 'employee'
        ? `Document physically scanned and registered at "${resolvedOfficeName}" (office: ${resolvedOriginOfficeId}) ` +
          `by ${actorName ?? 'an employee'} (role: employee) via camera scan (${scanMode}, ${pageItems.length} page(s)). ` +
          `Armed for messenger QR-scan pickup.` + routeSnapshotLine
        : `Document physically scanned and registered org-wide under organisation ${orgId} ` +
          `by ${actorName ?? 'an administrator'} (role: client) via camera scan (${scanMode}, ${pageItems.length} page(s)). ` +
          `Ready for route assignment and messenger pickup.` + routeSnapshotLine

      await client.from('document_tracking_events').insert({
        document_id: supabaseDoc.id,
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
      console.warn('[Scan Register] Non-fatal: failed to seed CREATED tracking event:', trackErr)
    }

    // Activity log (existing audit system — dedicated 'scan' action type)
    const scanMessage = `${actorName ?? 'User'} scanned and registered "${title}"`
    const activityLogId = await logActivitySafe({
      orgId,
      officeId: resolvedRole === 'client' ? null : effectiveOfficeId,
      userId,
      userName: actorName,
      actorName,
      actionType: 'scan',
      details: scanMessage,
      message: scanMessage,
      documentId: supabaseDoc.id,
      metadata: { creator_role: resolvedRole, tracking_status: 'CREATED', priority, scan_mode: scanMode, page_count: pageItems.length },
    }, client)

    // Messenger pickup + inbound ASN notifications (existing notification system)
    let notificationId: string | null = null
    try {
      notificationId = await broadcastPickupNotification(client, { orgId, documentId: supabaseDoc.id, documentTitle: title })
    } catch (notificationErr) {
      console.error('[Scan Register] Messenger notification broadcast failed:', notificationErr)
    }

    try {
      let destOfficeId = resolvedRouteSteps[0]?.office_id ? String(resolvedRouteSteps[0].office_id) : null
      let destOfficeName = resolvedRouteSteps[0]?.office_name ?? null

      if (!destOfficeId && (supabaseDoc as any).stage_id) {
        const dest = await resolveTargetOfficeIdForInboundNotification(client, supabaseDoc as any)
        destOfficeId = dest.officeId
        destOfficeName = dest.officeName
      }

      if (destOfficeId) {
        const originLabel = resolvedOfficeName ? resolvedOfficeName : 'origin office'
        await broadcastInboundOfficeNotification({
          orgId,
          documentId: supabaseDoc.id,
          documentTitle: title,
          officeId: destOfficeId,
          officeName: destOfficeName,
          type: 'ASN_PENDING_PICKUP',
          title: 'Inbound Advance Notice — Awaiting Pickup',
          message: `"${title}" has been released by ${originLabel} and is waiting for courier pickup.`,
          metadata: { type: 'ASN_PENDING_PICKUP', origin_office_id: resolvedOriginOfficeId, origin_office_name: resolvedOfficeName, target_step: 1 },
        })

        await broadcastInboundDispatchRealtime(orgId, destOfficeId, 'ASN_PENDING_PICKUP', {
          type: 'ASN_PENDING_PICKUP',
          event: 'ASN_PENDING_PICKUP',
          document_id: supabaseDoc.id,
          document_title: title,
          origin_office_id: resolvedOriginOfficeId,
          origin_office_name: resolvedOfficeName,
          target_office_id: destOfficeId,
          target_office_name: destOfficeName,
          step: 1,
          tracking_status: 'CREATED',
          dispatched_at: new Date().toISOString(),
          notes: `Document released by ${originLabel} and awaiting courier pickup.`,
        })
      }
    } catch (asnErr) {
      console.warn('[Scan Register] Pre-pickup ASN alert failed (non-fatal):', asnErr)
    }

    return {
      success: true,
      message: resolvedRole === 'employee'
        ? `Scanned document registered at "${resolvedOfficeName}" and armed for messenger pickup.`
        : 'Scanned document registered org-wide. Ready for route assignment.',
      scope: {
        role: resolvedRole,
        org_id: orgId,
        origin_office_id: resolvedOriginOfficeId,
        origin_office: resolvedOfficeName,
        stage_id: resolvedStageId,
        tracking_status: 'CREATED',
        route_checkpoints: resolvedRouteSteps.map((s) => ({ step: s.step_number, office_id: s.office_id, office_name: s.office_name, office_code: s.office_code })),
      },
      metadata: {
        ...supabaseDoc,
        mysql_storage_id: mysqlInsertedId,
        activity_log_id: activityLogId,
        notification_id: notificationId,
      },
      storage: { engine: 'Hostinger_MySQL_Blob', targetId: mysqlInsertedId },
    }
  } catch (error: any) {
    if (supabaseDocId) {
      try { await client.from('documents').delete().eq('id', supabaseDocId) } catch { /* best-effort rollback */ }
    }

    console.error('[Document Scan Register] Pipeline failed:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Scanned document registration failed: ${error.message || 'Internal Server Error'}`,
    })
  }
})
