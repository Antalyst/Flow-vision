/**
 * POST /api/tracking/assign-liaison
 *
 * Office-assigned Liaison model. The current office (client admin, or an employee
 * authorized for the document's current office) directly assigns a specific user as
 * the courier for the next leg. This REPLACES the old "broadcast to messenger pool,
 * first to accept wins" workflow — there is no accept/claim step. Once this call
 * succeeds, `documents.assigned_messenger_id` is already authoritative; the liaison
 * simply sees the assignment and performs the pickup scan.
 *
 * Body:
 *   document_id       string (UUID)  required
 *   liaison_user_id    string (UUID)  required
 *
 * Server-side validation (never trust office_id / liaison id / org_id from the client):
 *   1. Authenticate the caller.
 *   2. Resolve their organisation (and, for employees, their assigned offices) from the DB.
 *   3. Load the document; verify it belongs to the caller's organisation.
 *   4. Verify the document is actually eligible for assignment right now (CREATED, or
 *      ARRIVED_AT_OFFICE with the checkpoint already cleared by an employee) — not
 *      IN_TRANSIT/PICKED_UP (already has an active courier), not DISCREPANCY_REPORTED
 *      (frozen), not COMPLETED (workflow over).
 *   5. Verify the caller is authorized for the document's CURRENT office (client admins
 *      may assign anywhere in their org; employees only for offices assigned to them).
 *   6. Load the candidate liaison; verify same organisation, active, and an eligible role.
 *   7. Verify office association: `users.office_id` (already the existing "employee's
 *      home office" field, reused here rather than inventing a new table — see
 *      LIAISON_PROCESS_FLOW.md) must be null (first-time association with this office,
 *      set now) or already equal to the document's current office. A candidate already
 *      tied to a DIFFERENT office is rejected — offices cannot poach another office's staff.
 *   8. Write `assigned_messenger_id`; leave every other tracking field untouched.
 *   9. Activity log + direct notification to the liaison + notification to the document
 *      creator (role-aware, since the creator may be a client OR an employee).
 */

import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { notifyDocumentCreator, notifyLiaisonAssigned } from '~~/server/utils/notifications'
import { emitLiaisonAssignedEmail } from '~~/server/utils/email/emailEvents'
import { resolveAndAssociateLiaison } from '~~/server/utils/liaisonAssignment'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (actor.userRole !== 'client' && actor.userRole !== 'employee' && actor.userRole !== 'employee_sub_user') {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to assign a messenger.',
    })
  }

  const body = await readBody(event)
  const documentId = String(body?.document_id ?? '').trim()
  const liaisonUserId = String(body?.liaison_user_id ?? '').trim()

  if (!documentId) throw createError({ statusCode: 400, message: 'Please select a document.' })
  if (!liaisonUserId) throw createError({ statusCode: 400, message: 'Please select a messenger to assign.' })

  // ── Load & validate the document ────────────────────────────────────────
  const { data: doc, error: docErr } = await client
    .from('documents')
    .select(
      'id, org_id, user_id, creator_role, title, tracking_status, current_step, stage_id, ' +
      'origin_office_id, current_office_id, office_id, checkpoint_cleared_step, assigned_messenger_id, qr_code_data',
    )
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) throw createError({ statusCode: 500, message: 'We could not load this document. Please try again.' })
  if (!doc) throw createError({ statusCode: 404, message: 'We could not find this document.' })

  if (String(doc.org_id) !== actor.orgId) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to assign a messenger to this document.',
      data: { code: 'SECURITY_ORG_MISMATCH' },
    })
  }

  if (doc.tracking_status === 'COMPLETED') {
    throw createError({
      statusCode: 422,
      message: 'This document is already completed and no longer needs a messenger.',
      data: { code: 'ASSIGNMENT_CLOSED' },
    })
  }

  if (doc.tracking_status === 'DISCREPANCY_REPORTED') {
    throw createError({
      statusCode: 422,
      message: 'This document has an open issue. Please resolve it before assigning a messenger.',
      data: { code: 'DISCREPANCY_REPORTED' },
    })
  }

  if (doc.tracking_status === 'IN_TRANSIT' || doc.tracking_status === 'PICKED_UP') {
    throw createError({
      statusCode: 422,
      message: 'This document already has a messenger assigned for this leg.',
      data: { code: 'ALREADY_IN_CUSTODY', tracking_status: doc.tracking_status },
    })
  }

  if (doc.tracking_status === 'ARRIVED_AT_OFFICE' && (doc.checkpoint_cleared_step ?? null) !== (doc.current_step ?? 0)) {
    throw createError({
      statusCode: 422,
      message: 'Please confirm receipt of this document before assigning the next messenger.',
      data: { code: 'DESK_REVIEW_REQUIRED' },
    })
  }

  if (doc.tracking_status !== 'CREATED' && doc.tracking_status !== 'ARRIVED_AT_OFFICE') {
    throw createError({
      statusCode: 422,
      message: 'This document cannot be assigned a messenger right now. Please check its current status.',
      data: { code: 'INVALID_STATUS', tracking_status: doc.tracking_status },
    })
  }

  // ── Resolve the document's CURRENT office and authorize the caller ──────
  const effectiveOfficeId: string | null =
    doc.current_office_id ? String(doc.current_office_id)
    : doc.origin_office_id ? String(doc.origin_office_id)
    : doc.office_id ? String(doc.office_id)
    : null

  // Employees and staff (employee_sub_user) may only assign a Liaison on a
  // document currently at an office assigned to them — office scope, not org
  // scope. `actor.officeIds` already covers both roles (resolveActorContextWithOffices
  // resolves employee_sub_user's single `users.office_id` the same way it
  // resolves an employee's `offices.assigned_user` rows).
  if (actor.userRole === 'employee' || actor.userRole === 'employee_sub_user') {
    if (!effectiveOfficeId || !actor.officeIds.includes(effectiveOfficeId)) {
      throw createError({
        statusCode: 403,
        message: 'This document is not currently at your office.',
        data: { code: 'OFFICE_SCOPE_MISMATCH' },
      })
    }
  }
  // client admins may assign anywhere within their own organisation — no further check.

  // ── Load & validate the candidate Liaison (shared with creation-time assignment) ──
  const liaison = await resolveAndAssociateLiaison(client, {
    orgId: actor.orgId,
    liaisonUserId,
    effectiveOfficeId,
  })

  // ── Assign — this write is already authoritative, no accept/claim step ─
  const { data: updatedDoc, error: updateErr } = await client
    .from('documents')
    .update({ assigned_messenger_id: liaison.user_id })
    .eq('id', doc.id)
    .select('id, title, tracking_status, current_step, assigned_messenger_id, current_office_id, origin_office_id')
    .single()

  if (updateErr) throw createError({ statusCode: 500, message: updateErr.message })

  let officeName: string | null = null
  if (effectiveOfficeId) {
    const { data: officeRow } = await client.from('offices').select('name').eq('id', effectiveOfficeId).maybeSingle()
    officeName = officeRow?.name ?? null
  }

  let destinationOfficeName: string | null = null
  if (doc.stage_id) {
    const nextStep = (doc.current_step ?? 0) + 1
    const { data: stepRow } = await client
      .from('stage_steps')
      .select('office_id, offices(name)')
      .eq('stage_id', doc.stage_id)
      .eq('step_number', nextStep)
      .maybeSingle()
    destinationOfficeName = (stepRow as { offices?: { name?: string } } | null)?.offices?.name ?? null
  }

  const assignMessage =
    `${actor.fullName ?? 'An office user'} assigned ${liaison.full_name ?? 'a messenger'} to deliver "${doc.title}"` +
    (destinationOfficeName ? ` to ${destinationOfficeName}` : '') + '.'

  const activityLogId = await logActivitySafe({
    orgId: actor.orgId,
    officeId: effectiveOfficeId,
    userId: actor.userId,
    userName: actor.fullName,
    actorName: actor.fullName,
    actionType: 'assign_liaison',
    details: assignMessage,
    message: assignMessage,
    documentId: doc.id,
    metadata: {
      liaison_user_id: liaison.user_id,
      liaison_name: liaison.full_name,
      office_id: effectiveOfficeId,
      office_name: officeName,
      destination_office_name: destinationOfficeName,
    },
  }, client)

  const liaisonNotificationId = await notifyLiaisonAssigned({
    orgId: actor.orgId,
    documentId: doc.id,
    documentTitle: doc.title,
    liaisonUserId: liaison.user_id,
    assignedByOfficeName: officeName,
    destinationOfficeName,
  })

  const creatorNotificationId = await notifyDocumentCreator({
    orgId: actor.orgId,
    documentId: doc.id,
    documentTitle: doc.title,
    userId: doc.user_id,
    creatorRole: doc.creator_role,
    officeId: doc.origin_office_id ?? effectiveOfficeId,
    title: 'Messenger Assigned',
    message:
      `Your document "${doc.title}" has been assigned to ${liaison.full_name ?? 'a messenger'} for delivery` +
      (destinationOfficeName ? ` to ${destinationOfficeName}.` : '.'),
  })

  try {
    await emitLiaisonAssignedEmail({
      orgId: actor.orgId,
      documentId: doc.id,
      title: doc.title,
      trackingCode: doc.qr_code_data ?? null,
      creatorUserId: doc.user_id,
      creatorRole: doc.creator_role,
      status: doc.tracking_status,
      currentStep: doc.current_step ?? 0,
      liaisonUserId: liaison.user_id,
      liaisonName: liaison.full_name,
      currentOfficeName: officeName,
      destinationOfficeName,
    })
  } catch (emailErr) {
    console.warn('[assign-liaison] Non-fatal: assignment email failed:', emailErr)
  }

  return {
    success: true,
    message: `${liaison.full_name ?? 'Messenger'} has been assigned and notified. Ready for pickup.`,
    data: {
      document: updatedDoc,
      liaison: { user_id: liaison.user_id, full_name: liaison.full_name, role: liaison.role },
      activity_log_id: activityLogId,
      liaison_notification_id: liaisonNotificationId,
      creator_notification_id: creatorNotificationId,
    },
  }
})
