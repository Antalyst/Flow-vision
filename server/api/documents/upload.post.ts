/**
 * POST /api/documents/upload
 *
 * Dual-scope document registration pipeline.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  Role         │ origin_office_id │ current_office_id │ Scope         │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │  client       │ NULL             │ NULL              │ Org-wide      │
 * │  employee     │ REQUIRED (UUID)  │ = origin          │ Sub-office    │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Pipeline steps
 *   1.  RBAC auth guard
 *   2.  Resolve actor profile from DB  (org_id is ALWAYS server-derived)
 *   3.  Parse & validate multipart payload
 *   4.  Role-specific office validation
 *   5a. Stage scope validation          (if stage_id supplied)
 *   5b. Route checkpoint anti-leakage check — every office_id in the
 *       stage_steps sequence is verified to belong to the caller's org_id.
 *       Any cross-tenant pointer throws an immediate access exception.
 *   6.  AI document analysis
 *   7.  Generate document id + flowvision:// QR payload; stamp QR onto .docx/.xlsx
 *   8.  Supabase document insert
 *   9.  MySQL blob insert (QR-stamped file) + back-link
 *  10.  Tracking ledger initialization
 *         • Writes CREATED event with full route-schema snapshot in notes
 *         • Status: CREATED @ origin_office_id
 *         • Route sequence serialized as: Step 1 → Step 2 → … → Final
 *         (non-fatal on error — document is already committed)
 */

import { randomUUID } from 'node:crypto'
import { serverSupabaseClient } from '#supabase/server'
import { analyzeDocumentBuffer } from '~~/server/utils/aiAnalyzer'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { emitDocumentRegisteredEmail, emitLiaisonAssignedEmail } from '~~/server/utils/email/emailEvents'
import { buildDocumentTrackQrPayload } from '~~/server/utils/documentQr'
import { requiresQrStamp, stampDocumentWithQr } from '~~/server/utils/stampDocumentQr'
import { resolveAndAssociateLiaison } from '~~/server/utils/liaisonAssignment'
import { notifyLiaisonAssigned } from '~~/server/utils/notifications'

const ALLOWED_ROLES = ['client', 'employee', 'employee_sub_user'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

// Resolved step shape used internally across steps 5b and 9
interface ResolvedRouteStep {
  step_number: number
  office_id:   string
  office_name: string
  office_code: string | null
  org_id:      string
}

export default defineEventHandler(async (event) => {
  const db     = event.context.db
  const client = await serverSupabaseClient(event)

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'We could not save the document right now. Please try again.',
    })
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 1 — RBAC Auth Guard
  // ─────────────────────────────────────────────────────────────────────

  const userId   = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role') as AllowedRole | undefined

  if (!userId || !userRole || !(ALLOWED_ROLES as readonly string[]).includes(userRole)) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to upload documents.',
    })
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 2 — Resolve Actor Profile
  // org_id is ALWAYS read from the database — never trusted from the form.
  // This guarantees cross-tenant isolation regardless of client payload.
  // ─────────────────────────────────────────────────────────────────────

  const { data: actorRow, error: actorErr } = await client
    .from('users')
    .select('org_id, full_name, role, office_id')
    .eq('user_id', userId)
    .single()

  if (actorErr || !actorRow?.org_id) {
    throw createError({
      statusCode: 401,
      message: 'We could not find your account. Please log in again.',
    })
  }

  const orgId       = String(actorRow.org_id)
  const actorName   = actorRow.full_name ?? null
  // Double-check: role in DB must match session cookie (prevents cookie tampering)
  const resolvedRole = (actorRow.role as string) === userRole ? userRole : null

  if (!resolvedRole) {
    throw createError({
      statusCode: 403,
      message: 'Your session has expired. Please log in again.',
    })
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 3 — Parse Multipart Payload
  // ─────────────────────────────────────────────────────────────────────

  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, message: 'Please choose a file to upload.' })
  }

  const get = (name: string) => formData.find((f) => f.name === name)?.data.toString().trim() || null

  const fileItem       = formData.find((f) => f.name === 'file')
  const stageIdRaw     = get('stage_id')
  const originOfficeId = get('origin_office_id')   // UUID string | null
  const officeIdLegacy = get('office_id')           // legacy field — kept for compatibility
  const manualTitle       = get('manual_title')
  const manualDescription = get('manual_description')
  const categoryId        = get('category_id')
  const initialLiaisonUserId = get('assigned_messenger_id')   // optional — messenger for the first leg
  const expectedCompletionHoursRaw = get('expected_completion_hours')

  // Optional, uploader-set end-to-end time budget for this specific document —
  // separate from the route's own per-checkpoint SLA. See docs/tracking-ux-improvement-plan.md Part 7.
  let targetCompletionDate: string | null = null
  if (expectedCompletionHoursRaw) {
    const hours = Number(expectedCompletionHoursRaw)
    if (Number.isFinite(hours) && hours > 0) {
      targetCompletionDate = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    }
  }

  if (!fileItem?.data) {
    throw createError({ statusCode: 400, message: 'Please choose a file to upload.' })
  }

  const fileName = fileItem.filename || 'unnamed'
  const mimeType = fileItem.type    || 'application/octet-stream'

  // Validate allowed file types (Word, Excel & PDF)
  const fileExt = fileName.split('.').pop()?.toLowerCase() || ''
  const ALLOWED_DOCUMENT_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'csv', 'pdf']

  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(fileExt)) {
    throw createError({
      statusCode: 400,
      message: 'INVALID_FILE_TYPE: Only Word (.doc, .docx), Excel (.xls, .xlsx, .csv) and PDF documents are accepted.',
    })
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 4 — Role-Specific Office Validation
  // ─────────────────────────────────────────────────────────────────────

  let resolvedOriginOfficeId: string | null = null
  let resolvedOfficeName:     string | null = null

  if (resolvedRole === 'employee' || resolvedRole === 'employee_sub_user') {
    // Employee / sub-user mandate: origin_office_id is required
    if (!originOfficeId) {
      throw createError({
        statusCode: 400,
        message: 'Please select the office where this document is being registered.',
      })
    }

    // Verify: office exists and belongs to the same org
    const { data: officeRow, error: officeErr } = await client
      .from('offices')
      .select('id, name, org_id, assigned_user')
      .eq('id', originOfficeId)
      .maybeSingle()

    if (officeErr) {
      throw createError({ statusCode: 500, message: 'We could not check this office. Please try again.' })
    }

    if (!officeRow) {
      throw createError({
        statusCode: 404,
        message: 'We could not find this office.',
      })
    }

    if (String(officeRow.org_id) !== orgId) {
      throw createError({
        statusCode: 403,
        message: 'You can only register documents for offices in your own LGU.',
      })
    }

    // Employees own an office directly via offices.assigned_user. Sub-users don't
    // own offices — they're assigned to one via users.office_id (same dual-check
    // used by actorContext.ts and scan/register.post.ts).
    const isOwningEmployee = String(officeRow.assigned_user) === String(userId)
    const isAssignedSubUser =
      resolvedRole === 'employee_sub_user' && String(actorRow.office_id ?? '') === String(officeRow.id)

    if (!isOwningEmployee && !isAssignedSubUser) {
      throw createError({
        statusCode: 403,
        message: 'You can only register documents for your assigned office.',
      })
    }

    resolvedOriginOfficeId = String(officeRow.id)
    resolvedOfficeName     = officeRow.name
  } else {
    // Client admin — origin_office_id is explicitly NULL (org-wide scope)
    resolvedOriginOfficeId = null
    resolvedOfficeName     = null
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 5a — Stage Scope Validation (when stage_id is supplied)
  //
  // A client admin may bind any org-wide (global) or local stage.
  // An employee may only bind:
  //   a) A global stage (office_id IS NULL)  — shared org route template
  //   b) A local stage scoped to their own origin office
  // ─────────────────────────────────────────────────────────────────────

  let resolvedStageId: string | null = stageIdRaw

  if (stageIdRaw) {
    const { data: stageRow, error: stageErr } = await client
      .from('stages')
      .select('stage_id, name, org_id, office_id')
      .eq('stage_id', stageIdRaw)
      .maybeSingle()

    if (stageErr) {
      throw createError({ statusCode: 500, message: 'We could not check this document route. Please try again.' })
    }

    if (!stageRow) {
      throw createError({
        statusCode: 404,
        message: 'We could not find this document route.',
      })
    }

    if (String(stageRow.org_id) !== orgId) {
      throw createError({
        statusCode: 403,
        message: 'This document route belongs to a different LGU.',
      })
    }

    // Staff (employee_sub_user) operate org-wide and may use any of the org's
    // configured routes, not just ones scoped to their own office.
    if (resolvedRole === 'employee' && stageRow.office_id) {
      // Local stage — must be scoped to the employee's own origin office
      if (String(stageRow.office_id) !== resolvedOriginOfficeId) {
        throw createError({
          statusCode: 403,
          message: `You can only use shared routes or routes set up for your office (${resolvedOfficeName ?? resolvedOriginOfficeId}).`,
        })
      }
    }

    resolvedStageId = String(stageRow.stage_id)
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 5b — Route Checkpoint Anti-Leakage Structural Check
  //
  // Fetch every stage_step (office_id pointer) that forms the selected
  // routing pathway. For each checkpoint:
  //   1. Confirm the office exists in the database.
  //   2. Confirm its org_id matches the caller's server-resolved org_id.
  //
  // If a SINGLE checkpoint's org_id does not match → immediate 403 with
  // the specific violating office IDs listed. This prevents an actor from
  // embedding a foreign office into a multi-hop routing sequence to leak
  // document metadata across organisation boundaries.
  //
  // Route steps are cached in resolvedRouteSteps for Step 9 (ledger init)
  // to avoid a second round-trip to the database.
  // ─────────────────────────────────────────────────────────────────────

  let resolvedRouteSteps: ResolvedRouteStep[] = []

  if (resolvedStageId) {
    // 5b-i: Fetch the ordered checkpoint sequence for this stage
    const { data: rawSteps, error: stepsErr } = await client
      .from('stage_steps')
      .select('step_number, office_id')
      .eq('stage_id', resolvedStageId)
      .order('step_number', { ascending: true })

    if (stepsErr) {
      throw createError({
        statusCode: 500,
        message: 'We could not check this document route. Please try again.',
      })
    }

    const steps = rawSteps ?? []

    if (steps.length > 0) {
      // 5b-ii: Collect distinct office IDs from the full route sequence
      const uniqueCheckpointIds = [
        ...new Set(steps.map((s: any) => String(s.office_id)).filter(Boolean)),
      ]

      // 5b-iii: Bulk fetch all referenced offices in a single round-trip
      const { data: checkpointOffices, error: cpOfficeErr } = await client
        .from('offices')
        .select('id, name, code, org_id')
        .in('id', uniqueCheckpointIds)

      if (cpOfficeErr) {
        throw createError({
          statusCode: 500,
          message: 'We could not check this document route. Please try again.',
        })
      }

      const fetchedOffices = checkpointOffices ?? []

      // 5b-iv: Cross-org violation check — every checkpoint MUST be in our org
      const crossOrgViolators = fetchedOffices.filter(
        (o: any) => String(o.org_id) !== orgId,
      )

      if (crossOrgViolators.length > 0) {
        throw createError({
          statusCode: 403,
          message: 'This document route includes offices from a different LGU. Please choose a different route.',
        })
      }

      // 5b-v: Ghost office check — referenced IDs not found in the database at all
      const fetchedIds = new Set(fetchedOffices.map((o: any) => String(o.id)))
      const ghostIds   = uniqueCheckpointIds.filter((id) => !fetchedIds.has(id))

      if (ghostIds.length > 0) {
        throw createError({
          statusCode: 404,
          message: 'This document route includes an office that no longer exists. Please choose a different route.',
        })
      }

      // 5b-vi: Build enriched, ordered route steps for ledger use in Step 9
      const officeMap = fetchedOffices.reduce(
        (acc: Record<string, any>, o: any) => { acc[String(o.id)] = o; return acc },
        {} as Record<string, any>,
      )

      resolvedRouteSteps = steps.map((s: any) => {
        const office = officeMap[String(s.office_id)]
        return {
          step_number: s.step_number,
          office_id:   String(s.office_id),
          office_name: office?.name ?? `Office ${String(s.office_id).slice(0, 8)}`,
          office_code: office?.code ?? null,
          org_id:      String(office?.org_id ?? orgId),
        } satisfies ResolvedRouteStep
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 6 — AI Document Analysis (or Manual Override)
  // ─────────────────────────────────────────────────────────────────────

  let aiAnalysis: { title: string, description: string, status: string }
  if (manualTitle || manualDescription) {
    aiAnalysis = {
      title: manualTitle || fileName,
      description: manualDescription || 'Manually uploaded document.',
      status: 'MANUAL',
    }
  } else {
    aiAnalysis = await analyzeDocumentBuffer(fileItem.data, mimeType)
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 7 — Supabase Document Insert
  // ─────────────────────────────────────────────────────────────────────

  const documentId = randomUUID()
  const qrCode     = buildDocumentTrackQrPayload(documentId)

  let storageBuffer: Buffer = Buffer.from(fileItem.data)
  if (requiresQrStamp(fileName, mimeType)) {
    try {
      storageBuffer = await stampDocumentWithQr(storageBuffer, fileName, mimeType, qrCode)
    } catch (stampErr) {
      console.error('[Upload] QR stamp failed:', stampErr)
      throw createError({
        statusCode: 422,
        message: `We could not add the QR code to "${fileName}". Please make sure the file is a valid Word or Excel document and try again.`,
        data: { code: 'QR_STAMP_FAILED' },
      })
    }
  }

  // Derive effective office_id for legacy compatibility:
  //  - employee: use their origin office
  //  - client:   use whatever was passed (may be null)
  const effectiveOfficeId = resolvedOriginOfficeId ?? officeIdLegacy ?? null

  let supabaseDocId: string | null = null
  let mysqlInsertedId: number | null = null

  try {
    const { data: supabaseDoc, error: supabaseError } = await client
      .from('documents')
      .insert({
        id:                documentId,
        org_id:            orgId,               // server-resolved, never from form
        office_id:         effectiveOfficeId,
        stage_id:          resolvedStageId,
        user_id:           userId,
        category_id:       categoryId || null,
        title:             aiAnalysis.title,
        description:       aiAnalysis.description,
        ai_analysis_status: aiAnalysis.status,
        qr_code_data:      qrCode,
        status:            'Pending',
        tracking_status:   'CREATED',
        current_step:      0,
        // Mini-office architecture
        creator_role:      resolvedRole,
        origin_office_id:  resolvedOriginOfficeId,
        // current_office_id = origin for employees (doc physically there at start)
        // NULL for client admins (not yet at a specific office)
        current_office_id: resolvedOriginOfficeId,
        target_completion_date: targetCompletionDate,
      })
      .select()
      .single()

    if (supabaseError) throw supabaseError
    supabaseDocId = supabaseDoc.id

    // ───────────────────────────────────────────────────────────────────
    // Step 8 — MySQL Blob Insert + Back-link
    // ───────────────────────────────────────────────────────────────────

    const [mysqlResult] = await db.execute(
      'INSERT INTO document_storage (document_uuid, file_blob, file_name, mime_type) VALUES (?, ?, ?, ?)',
      [supabaseDoc.id, storageBuffer, fileName, mimeType],
    )
    mysqlInsertedId = (mysqlResult as any).insertId

    const { error: linkError } = await client
      .from('documents')
      .update({ mysql_storage_id: mysqlInsertedId })
      .eq('id', supabaseDoc.id)

    if (linkError) throw linkError

    // ───────────────────────────────────────────────────────────────────
    // Step 9 — Tracking Ledger Initialization
    //
    // Writes the initial CREATED event, seeding the immutable audit trail.
    //
    // The notes payload encodes three layers of context:
    //
    //   Layer A — Actor context:
    //     Who registered this document, under which role, from which office.
    //
    //   Layer B — Armed-for-pickup handshake:
    //     Explicitly states the document is physically at its origin
    //     checkpoint and waiting for a messenger QR-scan pickup.
    //
    //   Layer C — Route schema snapshot (NEW):
    //     A human-readable serialization of the full checkpoint sequence
    //     locked at registration time. This preserves the intended path
    //     in the audit log even if the stage template is later modified.
    //     Format: [Origin] → Stop 1: OfficeName → … → Final: OfficeName
    //
    // Failure here is non-fatal — the document IS committed, so we only
    // log a warning rather than rolling back.
    // ───────────────────────────────────────────────────────────────────

    try {
      // ── Layer C: Route schema snapshot ───────────────────────────────
      let routeSnapshotLine = ''
      if (resolvedRouteSteps.length > 0) {
        const originLabel = resolvedOfficeName ? `[Origin: ${resolvedOfficeName}]` : '[Origin: Org-wide]'

        const stopLabels = resolvedRouteSteps.map((step, idx) => {
          const isLast  = idx === resolvedRouteSteps.length - 1
          const label   = step.office_code
            ? `${step.office_name} (${step.office_code})`
            : step.office_name
          return isLast ? `Final Stop: ${label}` : `Stop ${step.step_number}: ${label}`
        })

        routeSnapshotLine =
          `\nRoute schema locked (${resolvedRouteSteps.length} checkpoint${resolvedRouteSteps.length !== 1 ? 's' : ''}): ` +
          [originLabel, ...stopLabels].join(' → ')
      } else if (resolvedStageId) {
        routeSnapshotLine = `\nRoute template attached (stage_id: ${resolvedStageId}) — no checkpoint steps defined yet.`
      }

      // ── Layer A + B: Actor context + armed-for-pickup handshake ──────
      const initNotes = (resolvedRole === 'employee' || resolvedRole === 'employee_sub_user')
        ? `Document physically registered at "${resolvedOfficeName}" (office: ${resolvedOriginOfficeId}) ` +
          `by ${actorName ?? 'an employee'} (role: ${resolvedRole}). ` +
          `Hard-copy asset is stationed at its origin checkpoint and armed for messenger QR-scan pickup.` +
          routeSnapshotLine
        : `Document registered org-wide under organisation ${orgId} ` +
          `by ${actorName ?? 'an administrator'} (role: client). ` +
          `Not yet assigned to a specific office checkpoint. Ready for route assignment and messenger pickup.` +
          routeSnapshotLine

      await client.from('document_tracking_events').insert({
        document_id: supabaseDoc.id,
        org_id:      orgId,
        status:      'CREATED',
        step_index:  0,
        // office_id in tracking_events is stored as null (UUID not integer);
        // office_name is denormalized so reads don't require a join.
        office_id:   null,
        office_name: resolvedOfficeName,
        actor_id:    userId,
        actor_role:  resolvedRole,
        actor_name:  actorName,
        notes:       initNotes,
      })
    } catch (trackErr) {
      console.warn('[Upload] Non-fatal: failed to seed CREATED tracking event:', trackErr)
    }

    const docTitle = aiAnalysis.title ?? (supabaseDoc as { title?: string }).title ?? 'Document'

    const uploadMessage = `${actorName ?? 'User'} uploaded "${docTitle}"`

    const activityLogId = await logActivitySafe({
      orgId: String(orgId),
      officeId: resolvedRole === 'client' ? null : effectiveOfficeId,
      userId,
      userName: actorName,
      actorName: actorName,
      actionType: 'upload',
      details: uploadMessage,
      message: uploadMessage,
      documentId: supabaseDoc.id,
      metadata: { creator_role: resolvedRole, tracking_status: 'CREATED' },
    }, client)

    // Office-assigned Liaison model: no automatic pool broadcast or destination-office
    // ASN here. The registering office already knows about this document (they just
    // uploaded it) — they now explicitly assign a Liaison via
    // POST /api/tracking/assign-liaison whenever they're ready.
    const notificationId: string | null = null

    try {
      await emitDocumentRegisteredEmail({
        orgId: String(orgId),
        documentId: supabaseDoc.id,
        title: docTitle,
        trackingCode: qrCode,
        creatorUserId: userId,
        creatorRole: resolvedRole,
        status: 'CREATED',
        currentStep: 0,
        originOfficeName: resolvedOfficeName,
      })
    } catch (emailErr) {
      console.warn('[Upload] Non-fatal: registration email failed:', emailErr)
    }

    // ─────────────────────────────────────────────────────────────────
    // Optional initial messenger assignment (first leg) — same validation
    // as POST /api/tracking/assign-liaison, reused via resolveAndAssociateLiaison
    // so the rules can never drift between the two call sites. The document
    // is ALREADY committed above — a failure here must never look like the
    // whole registration failed; it's reported back as a warning so the
    // creator can assign a messenger the normal way (AssignLiaisonPanel)
    // instead of silently leaving them thinking one was assigned.
    // ─────────────────────────────────────────────────────────────────
    let assignedMessenger: { user_id: string; full_name: string | null } | null = null
    let messengerAssignmentError: string | null = null

    if (initialLiaisonUserId) {
      try {
        const liaison = await resolveAndAssociateLiaison(client, {
          orgId: String(orgId),
          liaisonUserId: initialLiaisonUserId,
          effectiveOfficeId: resolvedOriginOfficeId,
        })

        const { error: assignUpdateErr } = await client
          .from('documents')
          .update({ assigned_messenger_id: liaison.user_id })
          .eq('id', supabaseDoc.id)

        if (assignUpdateErr) throw new Error(assignUpdateErr.message)

        assignedMessenger = { user_id: liaison.user_id, full_name: liaison.full_name }

        const assignMessage = `${actorName ?? 'The creator'} assigned ${liaison.full_name ?? 'a messenger'} to deliver "${docTitle}" for its first leg.`
        await logActivitySafe({
          orgId: String(orgId),
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
          orgId: String(orgId),
          documentId: supabaseDoc.id,
          documentTitle: docTitle,
          liaisonUserId: liaison.user_id,
          assignedByOfficeName: resolvedOfficeName,
          destinationOfficeName: resolvedRouteSteps[0]?.office_name ?? null,
        })

        try {
          await emitLiaisonAssignedEmail({
            orgId: String(orgId),
            documentId: supabaseDoc.id,
            title: docTitle,
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
          console.warn('[Upload] Non-fatal: initial-assignment email failed:', emailErr)
        }
      } catch (assignErr: any) {
        messengerAssignmentError = assignErr?.message || 'We could not assign that messenger. Please assign one from the document details instead.'
        console.warn('[Upload] Initial messenger assignment failed (document still created):', messengerAssignmentError)
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // Response
    // ─────────────────────────────────────────────────────────────────

    return {
      success: true,
      message: (resolvedRole === 'employee' || resolvedRole === 'employee_sub_user')
        ? `Document registered at "${resolvedOfficeName}". Assign a messenger to start the delivery.`
        : 'Document registered successfully. Assign a messenger to start the delivery.',
      assigned_messenger: assignedMessenger,
      messenger_assignment_error: messengerAssignmentError,
      scope: {
        role:              resolvedRole,
        org_id:            orgId,
        origin_office_id:  resolvedOriginOfficeId,
        origin_office:     resolvedOfficeName,
        stage_id:          resolvedStageId,
        tracking_status:   'CREATED',
        // Expose the validated checkpoint array to the client
        route_checkpoints: resolvedRouteSteps.map((s) => ({
          step:        s.step_number,
          office_id:   s.office_id,
          office_name: s.office_name,
          office_code: s.office_code,
        })),
      },
      metadata: {
        ...supabaseDoc,
        assigned_messenger_id: assignedMessenger?.user_id ?? null,
        mysql_storage_id: mysqlInsertedId,
        activity_log_id: activityLogId,
        notification_id: notificationId,
      },
      storage: {
        engine:   'Hostinger_MySQL_Blob',
        targetId: mysqlInsertedId,
      },
    }
  } catch (error: any) {
    // Compensating write: delete the Supabase row if blob linking failed mid-flight
    if (supabaseDocId) {
      try {
        await client.from('documents').delete().eq('id', supabaseDocId)
      } catch {
        // Best-effort rollback — ignore delete failures
      }
    }

    console.error('[Document Upload] Pipeline failed:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.statusCode ? error.message : 'We could not upload this document. Please try again.',
    })
  }
})
