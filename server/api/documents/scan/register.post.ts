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
import { emitDocumentRegisteredEmail, emitLiaisonAssignedEmail } from '~~/server/utils/email/emailEvents'
import { buildDocumentTrackQrPayload } from '~~/server/utils/documentQr'
import { resolveAndAssociateLiaison } from '~~/server/utils/liaisonAssignment'
import { notifyLiaisonAssigned } from '~~/server/utils/notifications'

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
      message: 'We could not save the document right now. Please try again.',
    })
  }

  // ── Step 1 — RBAC ──────────────────────────────────────────────────────
  const userId = sessionUserId(event)
  const userRole = sessionRole(event) as AllowedRole | undefined

  if (!userId || !userRole || !(ALLOWED_ROLES as readonly string[]).includes(userRole)) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to register documents.',
    })
  }

  // ── Step 2 — Resolve actor (org_id always server-derived) ───────────────
  const { data: actorRow, error: actorErr } = await client
    .from('users')
    .select('org_id, full_name, role, office_id')
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
  const initialLiaisonUserId = get('assigned_messenger_id')   // optional — messenger for the first leg

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
    throw createError({ statusCode: 400, message: 'Please scan at least one page before registering.' })
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
    throw createError({ statusCode: 400, message: 'Please scan the document before registering it.' })
  }

  const { data: session, error: sessionErr } = await client
    .from('document_scan_sessions')
    .select('id, user_id, organization_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionErr) {
    throw createError({ statusCode: 500, message: 'We could not check your scanning session. Please try again.' })
  }
  if (!session) {
    throw createError({ statusCode: 404, message: 'This scanning session has expired. Please scan the document again.' })
  }
  if (String(session.user_id) !== String(userId) || String(session.organization_id) !== orgId) {
    throw createError({ statusCode: 403, message: 'This scanning session does not belong to you.' })
  }

  // One scan session registers at most one document. A retried request (lost
  // response, double click) gets the document that was already created back —
  // never a second document with a second QR code.
  const findRegistered = async () => {
    const { data } = await client
      .from('documents')
      .select('id, title, qr_code_data, tracking_status, origin_office_id, assigned_messenger_id')
      .eq('scan_session_id', sessionId)
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle()
    return data
  }
  const alreadyRegistered = (doc: any) => ({
    success: true,
    already_registered: true,
    message: `This scan was already registered as "${doc.title}". No duplicate was created.`,
    assigned_messenger: null,
    messenger_assignment_error: null,
    metadata: doc,
  })
  const existingDoc = await findRegistered()
  if (existingDoc) return alreadyRegistered(existingDoc)

  // ── Step 4 — Role-specific office validation (identical to /upload) ─────
  let resolvedOriginOfficeId: string | null = null
  let resolvedOfficeName: string | null = null

  if (resolvedRole === 'employee' || resolvedRole === 'employee_sub_user') {
    if (!originOfficeId) {
      throw createError({
        statusCode: 400,
        message: 'Please select the office where this document is being registered.',
      })
    }

    const { data: officeRow, error: officeErr } = await client
      .from('offices')
      .select('id, name, org_id, assigned_user')
      .eq('id', originOfficeId)
      .maybeSingle()

    if (officeErr) {
      throw createError({ statusCode: 500, message: 'We could not check this office. Please try again.' })
    }
    if (!officeRow) {
      throw createError({ statusCode: 404, message: 'We could not find this office.' })
    }
    if (String(officeRow.org_id) !== orgId) {
      throw createError({
        statusCode: 403,
        message: 'You can only register documents for offices in your own LGU.',
      })
    }

    // Employees own an office via offices.assigned_user. Sub-users don't own
    // offices — they're assigned to one via users.office_id.
    const isOwningEmployee = String(officeRow.assigned_user) === String(userId)
    const isAssignedSubUser =
      resolvedRole === 'employee_sub_user' &&
      String(actorRow.office_id ?? '') === String(officeRow.id)

    if (!isOwningEmployee && !isAssignedSubUser) {
      throw createError({
        statusCode: 403,
        message: 'You can only register documents for your assigned office.',
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

    if (stageErr) throw createError({ statusCode: 500, message: 'We could not check this document route. Please try again.' })
    if (!stageRow) throw createError({ statusCode: 404, message: 'We could not find this document route.' })
    if (String(stageRow.org_id) !== orgId) {
      throw createError({ statusCode: 403, message: 'This document route belongs to a different LGU.' })
    }
    // Staff (employee_sub_user) operate org-wide and may use any of the org's
    // configured routes, not just ones scoped to their own office.
    if (
      resolvedRole === 'employee' &&
      stageRow.office_id &&
      String(stageRow.office_id) !== resolvedOriginOfficeId
    ) {
      throw createError({
        statusCode: 403,
        message: 'You can only use shared routes or routes set up for your own office.',
      })
    }

    resolvedStageId = String(stageRow.stage_id)

    const { data: rawSteps, error: stepsErr } = await client
      .from('stage_steps')
      .select('step_number, office_id')
      .eq('stage_id', resolvedStageId)
      .order('step_number', { ascending: true })

    if (stepsErr) throw createError({ statusCode: 500, message: 'We could not check this document route. Please try again.' })

    const steps = rawSteps ?? []
    if (steps.length > 0) {
      const uniqueCheckpointIds = [...new Set(steps.map((s: any) => String(s.office_id)).filter(Boolean))]
      const { data: checkpointOffices, error: cpOfficeErr } = await client
        .from('offices')
        .select('id, name, code, org_id')
        .in('id', uniqueCheckpointIds)

      if (cpOfficeErr) throw createError({ statusCode: 500, message: 'We could not check this document route. Please try again.' })

      const fetchedOffices = checkpointOffices ?? []
      const crossOrgViolators = fetchedOffices.filter((o: any) => String(o.org_id) !== orgId)
      if (crossOrgViolators.length > 0) {
        throw createError({
          statusCode: 403,
          message: `This document route includes offices from a different LGU. Please choose a different route.`,
        })
      }

      const fetchedIds = new Set(fetchedOffices.map((o: any) => String(o.id)))
      const ghostIds = uniqueCheckpointIds.filter((id) => !fetchedIds.has(id))
      if (ghostIds.length > 0) {
        throw createError({ statusCode: 404, message: 'This document route includes an office that no longer exists. Please choose a different route.' })
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
        message: `We could not combine the ${pageItems.length} scanned pages. Please try scanning again.`,
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

    if (supabaseError) {
      // Unique scan_session_id (optional index): a concurrent request won.
      if ((supabaseError as any).code === '23505') {
        const winner = await findRegistered()
        if (winner) return alreadyRegistered(winner)
      }
      throw supabaseError
    }
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

    // AI record — the AI's only contribution is a suggested title, so that is
    // all that is stored as AI output (the document itself uses the title the
    // user confirmed). No other column is filled from the client as "AI".
    if (!aiSkipped && get('model')) {
      const confidenceRaw = Number(get('confidence'))
      const aiTitle = get('ai_title')
      const { error: aiErr } = await client.from('document_ai_analysis').insert({
        document_id: supabaseDoc.id,
        scan_session_id: sessionId,
        model: get('model') || 'unknown',
        title: aiTitle,
        confidence: Number.isFinite(confidenceRaw) ? confidenceRaw : null,
        raw_response: { suggested_title: aiTitle, confirmed_title: title, edited_by_user: !!aiTitle && aiTitle !== title },
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

      const initNotes = (resolvedRole === 'employee' || resolvedRole === 'employee_sub_user')
        ? `Document physically scanned and registered at "${resolvedOfficeName}" (office: ${resolvedOriginOfficeId}) ` +
          `by ${actorName ?? 'an employee'} (role: ${resolvedRole}) via camera scan (${scanMode}, ${pageItems.length} page(s)). ` +
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

    // Office-assigned Liaison model: no automatic pool broadcast or destination-office
    // ASN here. The registering office already knows about this document (they just
    // scanned it in) — they now explicitly assign a Liaison via
    // POST /api/tracking/assign-liaison whenever they're ready.
    const notificationId: string | null = null

    try {
      await emitDocumentRegisteredEmail({
        orgId,
        documentId: supabaseDoc.id,
        title,
        trackingCode: qrCode,
        creatorUserId: userId,
        creatorRole: resolvedRole,
        status: 'CREATED',
        currentStep: 0,
        originOfficeName: resolvedOfficeName,
      })
    } catch (emailErr) {
      console.warn('[Scan Register] Non-fatal: registration email failed:', emailErr)
    }

    // Optional initial messenger assignment (first leg) — identical validation
    // to POST /api/tracking/assign-liaison via resolveAndAssociateLiaison. The
    // document is already committed above; a failure here is reported back as
    // a warning, never a silent or document-destroying failure.
    let assignedMessenger: { user_id: string; full_name: string | null } | null = null
    let messengerAssignmentError: string | null = null

    if (initialLiaisonUserId) {
      try {
        const liaison = await resolveAndAssociateLiaison(client, {
          orgId,
          liaisonUserId: initialLiaisonUserId,
          effectiveOfficeId: resolvedOriginOfficeId,
        })

        const { error: assignUpdateErr } = await client
          .from('documents')
          .update({ assigned_messenger_id: liaison.user_id })
          .eq('id', supabaseDoc.id)

        if (assignUpdateErr) throw new Error(assignUpdateErr.message)

        assignedMessenger = { user_id: liaison.user_id, full_name: liaison.full_name }

        const assignMessage = `${actorName ?? 'The creator'} assigned ${liaison.full_name ?? 'a messenger'} to deliver "${title}" for its first leg.`
        await logActivitySafe({
          orgId,
          officeId: resolvedRole === 'client' ? null : effectiveOfficeId,
          userId,
          userName: actorName,
          actorName,
          actionType: 'assign_liaison',
          details: assignMessage,
          message: assignMessage,
          documentId: supabaseDoc.id,
          metadata: { liaison_user_id: liaison.user_id, liaison_name: liaison.full_name, initial_assignment: true },
        }, client)

        await notifyLiaisonAssigned({
          orgId,
          documentId: supabaseDoc.id,
          documentTitle: title,
          liaisonUserId: liaison.user_id,
          assignedByOfficeName: resolvedOfficeName,
          destinationOfficeName: resolvedRouteSteps[0]?.office_name ?? null,
        })

        try {
          await emitLiaisonAssignedEmail({
            orgId,
            documentId: supabaseDoc.id,
            title,
            trackingCode: qrCode,
            creatorUserId: userId,
            creatorRole: resolvedRole,
            status: 'CREATED',
            currentStep: 0,
            liaisonUserId: liaison.user_id,
            liaisonName: liaison.full_name,
            currentOfficeName: resolvedOfficeName,
            destinationOfficeName: resolvedRouteSteps[0]?.office_name ?? null,
          })
        } catch (emailErr) {
          console.warn('[Scan Register] Non-fatal: initial-assignment email failed:', emailErr)
        }
      } catch (assignErr: any) {
        messengerAssignmentError = assignErr?.message || 'We could not assign that messenger. Please assign one from the document details instead.'
        console.warn('[Scan Register] Initial messenger assignment failed (document still created):', messengerAssignmentError)
      }
    }

    return {
      success: true,
      message: (resolvedRole === 'employee' || resolvedRole === 'employee_sub_user')
        ? `Scanned document registered at "${resolvedOfficeName}". Assign a messenger to start the delivery.`
        : 'Scanned document registered org-wide. Assign a messenger to start the delivery.',
      assigned_messenger: assignedMessenger,
      messenger_assignment_error: messengerAssignmentError,
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
        assigned_messenger_id: assignedMessenger?.user_id ?? null,
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
      message: error.statusCode ? error.message : 'We could not register this document. Please try again.',
    })
  }
})
