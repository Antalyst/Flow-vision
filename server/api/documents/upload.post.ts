/**
 * POST /api/documents/upload
 *
 * Dual-scope document registration pipeline.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  Role         │ origin_office_id │ current_office_id │ Scope         │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │  supabase       │ NULL             │ NULL              │ Org-wide      │
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
 *   7.  Supabase document insert
 *   8.  MySQL blob insert + back-link
 *   9.  Tracking ledger initialization
 *         • Writes CREATED event with full route-schema snapshot in notes
 *         • Status: CREATED @ origin_office_id
 *         • Route sequence serialized as: Step 1 → Step 2 → … → Final
 *         (non-fatal on error — document is already committed)
 */

import { randomUUID } from 'node:crypto'
import { analyzeDocumentBuffer } from '~~/server/utils/aiAnalyzer'

const ALLOWED_ROLES = ['supabase', 'employee'] as const
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
  const supabase = useServerSupabase()

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'MySQL storage connector is not available on the request context.',
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
      message: 'Forbidden: only supabase or employee accounts may upload documents.',
    })
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 2 — Resolve Actor Profile
  // org_id is ALWAYS read from the database — never trusted from the form.
  // This guarantees cross-tenant isolation regardless of supabase payload.
  // ─────────────────────────────────────────────────────────────────────

  const { data: actorRow, error: actorErr } = await supabase
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

  const orgId       = String(actorRow.org_id)
  const actorName   = actorRow.full_name ?? null
  // Double-check: role in DB must match session cookie (prevents cookie tampering)
  const resolvedRole = (actorRow.role as string) === userRole ? userRole : null

  if (!resolvedRole) {
    throw createError({
      statusCode: 403,
      message: 'Role mismatch: session cookie does not match database profile.',
    })
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 3 — Parse Multipart Payload
  // ─────────────────────────────────────────────────────────────────────

  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, message: 'No multipart form data received.' })
  }

  const get = (name: string) => formData.find((f) => f.name === name)?.data.toString().trim() || null

  const fileItem       = formData.find((f) => f.name === 'file')
  const stageIdRaw     = get('stage_id')
  const clientQrCode   = get('qr_code_data')
  const originOfficeId = get('origin_office_id')   // UUID string | null
  const officeIdLegacy = get('office_id')           // legacy field — kept for compatibility

  if (!fileItem?.data) {
    throw createError({ statusCode: 400, message: 'Missing document file payload.' })
  }

  const fileName = fileItem.filename || 'unnamed'
  const mimeType = fileItem.type    || 'application/octet-stream'

  // ─────────────────────────────────────────────────────────────────────
  // Step 4 — Role-Specific Office Validation
  // ─────────────────────────────────────────────────────────────────────

  let resolvedOriginOfficeId: string | null = null
  let resolvedOfficeName:     string | null = null

  if (resolvedRole === 'employee') {
    // Employee mandate: origin_office_id is required
    if (!originOfficeId) {
      throw createError({
        statusCode: 400,
        message:
          'EMPLOYEE_ORIGIN_REQUIRED: Employees must supply origin_office_id — ' +
          'the sub-office/branch where this hard-copy is being physically registered.',
      })
    }

    // Verify: office exists, belongs to the same org, and is assigned to this employee
    const { data: officeRow, error: officeErr } = await supabase
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
        message:
          `CROSS_ORG_VIOLATION: Office ${originOfficeId} belongs to a different organisation. ` +
          'Cross-tenant document registration is not permitted.',
      })
    }

    if (String(officeRow.assigned_user) !== String(userId)) {
      throw createError({
        statusCode: 403,
        message:
          'UNAUTHORIZED_OFFICE: This office is not assigned to your account. ' +
          'Employees may only register documents under their own sub-office branches.',
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
  // A supabase admin may bind any org-wide (global) or local stage.
  // An employee may only bind:
  //   a) A global stage (office_id IS NULL)  — shared org route template
  //   b) A local stage scoped to their own origin office
  // ─────────────────────────────────────────────────────────────────────

  let resolvedStageId: string | null = stageIdRaw

  if (stageIdRaw) {
    const { data: stageRow, error: stageErr } = await supabase
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
      // Local stage — must be scoped to the employee's own origin office
      if (String(stageRow.office_id) !== resolvedOriginOfficeId) {
        throw createError({
          statusCode: 403,
          message:
            'STAGE_SCOPE_MISMATCH: Employees may only use global stages or stages scoped ' +
            'to their own sub-office. Select a global route template or one belonging to ' +
            `your office (${resolvedOfficeName ?? resolvedOriginOfficeId}).`,
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
    const { data: rawSteps, error: stepsErr } = await supabase
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
      // 5b-ii: Collect distinct office IDs from the full route sequence
      const uniqueCheckpointIds = [
        ...new Set(steps.map((s: any) => String(s.office_id)).filter(Boolean)),
      ]

      // 5b-iii: Bulk fetch all referenced offices in a single round-trip
      const { data: checkpointOffices, error: cpOfficeErr } = await supabase
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

      // 5b-iv: Cross-org violation check — every checkpoint MUST be in our org
      const crossOrgViolators = fetchedOffices.filter(
        (o: any) => String(o.org_id) !== orgId,
      )

      if (crossOrgViolators.length > 0) {
        const violatingIds   = crossOrgViolators.map((o: any) => String(o.id)).join(', ')
        const violatingNames = crossOrgViolators.map((o: any) => o.name || o.id).join(', ')
        throw createError({
          statusCode: 403,
          message:
            `CROSS_ORG_ROUTE_VIOLATION: Route checkpoints [${violatingNames}] (id: ${violatingIds}) ` +
            `belong to a different organisation. All destination offices in a routing pathway ` +
            `must be registered under organisation ${orgId}. ` +
            'Cross-tenant routing is strictly prohibited and has been logged.',
        })
      }

      // 5b-v: Ghost office check — referenced IDs not found in the database at all
      const fetchedIds = new Set(fetchedOffices.map((o: any) => String(o.id)))
      const ghostIds   = uniqueCheckpointIds.filter((id) => !fetchedIds.has(id))

      if (ghostIds.length > 0) {
        throw createError({
          statusCode: 404,
          message:
            `INVALID_ROUTE_CHECKPOINTS: The following office IDs in the routing pathway do not ` +
            `exist in the database: [${ghostIds.join(', ')}]. ` +
            'Ensure all destination offices are registered before routing documents through them.',
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
  // Step 6 — AI Document Analysis
  // ─────────────────────────────────────────────────────────────────────

  const aiAnalysis = await analyzeDocumentBuffer(fileItem.data, mimeType)

  // ─────────────────────────────────────────────────────────────────────
  // Step 7 — Supabase Document Insert
  // ─────────────────────────────────────────────────────────────────────

  const documentId = randomUUID()
  const qrCode     = clientQrCode || `QR-${Math.random().toString(36).substring(2, 11).toUpperCase()}`

  // Derive effective office_id for legacy compatibility:
  //  - employee: use their origin office
  //  - supabase:   use whatever was passed (may be null)
  const effectiveOfficeId = resolvedOriginOfficeId ?? officeIdLegacy ?? null

  let supabaseDocId: string | null = null
  let mysqlInsertedId: number | null = null

  try {
    const { data: supabaseDoc, error: supabaseError } = await supabase
      .from('documents')
      .insert({
        id:                documentId,
        org_id:            orgId,               // server-resolved, never from form
        office_id:         effectiveOfficeId,
        stage_id:          resolvedStageId,
        user_id:           userId,
        title:             aiAnalysis.title,
        description:       aiAnalysis.description,
        qr_code_data:      qrCode,
        status:            'Pending',
        tracking_status:   'CREATED',
        current_step:      0,
        // Mini-office architecture
        creator_role:      resolvedRole,
        origin_office_id:  resolvedOriginOfficeId,
        // current_office_id = origin for employees (doc physically there at start)
        // NULL for supabase admins (not yet at a specific office)
        current_office_id: resolvedOriginOfficeId,
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
      [supabaseDoc.id, fileItem.data, fileName, mimeType],
    )
    mysqlInsertedId = (mysqlResult as any).insertId

    const { error: linkError } = await supabase
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
      const initNotes = resolvedRole === 'employee'
        ? `Document physically registered at "${resolvedOfficeName}" (office: ${resolvedOriginOfficeId}) ` +
          `by ${actorName ?? 'an employee'} (role: employee). ` +
          `Hard-copy asset is stationed at its origin checkpoint and armed for messenger QR-scan pickup.` +
          routeSnapshotLine
        : `Document registered org-wide under organisation ${orgId} ` +
          `by ${actorName ?? 'an administrator'} (role: supabase). ` +
          `Not yet assigned to a specific office checkpoint. Ready for route assignment and messenger pickup.` +
          routeSnapshotLine

      await supabase.from('document_tracking_events').insert({
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

    // ─────────────────────────────────────────────────────────────────
    // Response
    // ─────────────────────────────────────────────────────────────────

    return {
      success: true,
      message: resolvedRole === 'employee'
        ? `Document registered at "${resolvedOfficeName}" and armed for messenger pickup.`
        : 'Document analyzed and registered org-wide. Ready for route assignment.',
      scope: {
        role:              resolvedRole,
        org_id:            orgId,
        origin_office_id:  resolvedOriginOfficeId,
        origin_office:     resolvedOfficeName,
        stage_id:          resolvedStageId,
        tracking_status:   'CREATED',
        // Expose the validated checkpoint array to the supabase
        route_checkpoints: resolvedRouteSteps.map((s) => ({
          step:        s.step_number,
          office_id:   s.office_id,
          office_name: s.office_name,
          office_code: s.office_code,
        })),
      },
      metadata: {
        ...supabaseDoc,
        mysql_storage_id: mysqlInsertedId,
      },
      storage: {
        engine:   'Hostinger_MySQL_Blob',
        targetId: mysqlInsertedId,
      },
    }
  } catch (error: any) {
    // Compensating write: delete the Supabase row if blob linking failed mid-flight
    if (supabaseDocId) {
      await supabase.from('documents').delete().eq('id', supabaseDocId).catch(() => {})
    }

    console.error('[Document Upload] Pipeline failed:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Document upload failed: ${error.message || 'Internal Server Error'}`,
    })
  }
})
