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
 *   5.  Stage scope validation          (if stage_id supplied)
 *   6.  AI document analysis
 *   7.  Supabase document insert
 *   8.  MySQL blob insert + back-link
 *   9.  Tracking ledger initialization  (non-fatal on error)
 */

import { randomUUID } from 'node:crypto'
import { serverSupabaseClient } from '#supabase/server'
import { analyzeDocumentBuffer } from '~~/server/utils/aiAnalyzer'

const ALLOWED_ROLES = ['client', 'employee'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

export default defineEventHandler(async (event) => {
  const db     = event.context.db
  const client = await serverSupabaseClient(event)

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
      message: 'Forbidden: only client or employee accounts may upload documents.',
    })
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 2 — Resolve Actor Profile
  // org_id is ALWAYS read from the database — never trusted from the form.
  // This guarantees cross-tenant isolation regardless of client payload.
  // ─────────────────────────────────────────────────────────────────────

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
  // Step 5 — Stage Scope Validation (when stage_id is supplied)
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
        title:             aiAnalysis.title,
        description:       aiAnalysis.description,
        qr_code_data:      qrCode,
        status:            'Pending',
        tracking_status:   'CREATED',
        current_step:      0,
        // Mini-office architecture
        creator_role:      resolvedRole,
        origin_office_id:  resolvedOriginOfficeId,
        // current_office_id = origin for employees (doc is physically there at start)
        // NULL for client admins (not yet at a specific office)
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

    const { error: linkError } = await client
      .from('documents')
      .update({ mysql_storage_id: mysqlInsertedId })
      .eq('id', supabaseDoc.id)

    if (linkError) throw linkError

    // ───────────────────────────────────────────────────────────────────
    // Step 9 — Tracking Ledger Initialization
    //
    // Writes the initial CREATED event to document_tracking_events.
    // This seeds the immutable audit trail and makes the document
    // immediately visible to the tracking operations dashboard.
    //
    // The notes string is role-aware:
    //  - Employee: records physical origin office + "armed for QR pickup"
    //  - Client:   records org-wide creation + "ready for routing"
    //
    // Failure here is non-fatal — the document IS committed, so we only
    // log a warning rather than rolling back.
    // ───────────────────────────────────────────────────────────────────

    try {
      const initNotes = resolvedRole === 'employee'
        ? `Document physically registered at ${resolvedOfficeName} (${resolvedOriginOfficeId}). ` +
          'Hard-copy asset is at its origin checkpoint and armed for messenger QR pickup scan.'
        : `Document registered org-wide under ${orgId} by ${actorName ?? 'an administrator'}. ` +
          'Not yet assigned to a specific office. Ready for route assignment and pickup.'

      await client.from('document_tracking_events').insert({
        document_id: supabaseDoc.id,
        org_id:      orgId,
        status:      'CREATED',
        step_index:  0,
        // office_id column in tracking_events is legacy INTEGER — store null, use office_name
        office_id:   null,
        office_name: resolvedOfficeName,         // denormalized — avoids join on read
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
        ? `Document registered at ${resolvedOfficeName} and armed for messenger pickup.`
        : 'Document analyzed and registered org-wide. Ready for route assignment.',
      scope: {
        role:             resolvedRole,
        org_id:           orgId,
        origin_office_id: resolvedOriginOfficeId,
        origin_office:    resolvedOfficeName,
        stage_id:         resolvedStageId,
        tracking_status:  'CREATED',
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
      await client.from('documents').delete().eq('id', supabaseDocId).catch(() => {})
    }

    console.error('[Document Upload] Pipeline failed:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Document upload failed: ${error.message || 'Internal Server Error'}`,
    })
  }
})
