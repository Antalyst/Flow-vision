/**
 * GET /api/tracking/eligible-liaisons?document_id=...
 * GET /api/tracking/eligible-liaisons?office_id=...
 *
 * Lists users the caller is allowed to assign as the Liaison for a document's
 * current leg — i.e. the picker list for `POST /api/tracking/assign-liaison`.
 *
 * Two ways to call it:
 *   - document_id — an EXISTING document; office context is read from the
 *     document itself (current_office_id / origin_office_id / office_id).
 *   - office_id   — no document exists yet (document CREATION time); the
 *     caller supplies the office directly (the origin office an employee/
 *     sub-user is registering under). Client admins may omit both — see
 *     below, org-wide reach with no office anchor.
 *
 * "Eligible" = same organisation, role IN (messenger, employee_sub_user), AND
 * already staff of the office in question (`users.office_id` matches
 * exactly). Messengers/staff from a different office, and unassigned/floating
 * users, never appear — an office can only hand a document to its own people.
 *
 * Same authorization as assign-liaison: client admins may query any office (or
 * none) in their org; employees only for an office assigned to them.
 */

import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (actor.userRole !== 'client' && actor.userRole !== 'employee' && actor.userRole !== 'employee_sub_user') {
    throw createError({ statusCode: 403, message: 'Forbidden.' })
  }

  const query = getQuery(event)
  const documentId = String(query.document_id ?? '').trim()
  const officeIdParam = String(query.office_id ?? '').trim()

  let effectiveOfficeId: string | null = null

  if (documentId) {
    const { data: doc, error: docErr } = await client
      .from('documents')
      .select('id, org_id, tracking_status, current_office_id, origin_office_id, office_id')
      .eq('id', documentId)
      .maybeSingle()

    if (docErr) throw createError({ statusCode: 500, message: docErr.message })
    if (!doc) throw createError({ statusCode: 404, message: 'Document not found.' })
    if (String(doc.org_id) !== actor.orgId) {
      throw createError({ statusCode: 403, message: 'SECURITY_ORG_MISMATCH', data: { code: 'SECURITY_ORG_MISMATCH' } })
    }

    effectiveOfficeId =
      doc.current_office_id ? String(doc.current_office_id)
      : doc.origin_office_id ? String(doc.origin_office_id)
      : doc.office_id ? String(doc.office_id)
      : null
  } else if (officeIdParam) {
    // Creation-time path: no document row exists yet. Verify the office is a
    // real office in the caller's own organisation before using it as the
    // candidate filter — never trust an office_id from the client otherwise.
    const { data: office, error: officeErr } = await client
      .from('offices')
      .select('id, org_id')
      .eq('id', officeIdParam)
      .maybeSingle()

    if (officeErr) throw createError({ statusCode: 500, message: officeErr.message })
    if (!office || String(office.org_id) !== actor.orgId) {
      throw createError({ statusCode: 403, message: 'SECURITY_ORG_MISMATCH', data: { code: 'SECURITY_ORG_MISMATCH' } })
    }

    effectiveOfficeId = String(office.id)
  }
  // Neither supplied: client admin creating an org-wide document — no office
  // anchor at all, handled by the org-wide fallback below.

  // Employees and staff (employee_sub_user) may only browse candidates for an
  // office assigned to them — same office-scope rule enforced by assign-liaison.post.ts.
  if (actor.userRole === 'employee' || actor.userRole === 'employee_sub_user') {
    if (!effectiveOfficeId || !actor.officeIds.includes(effectiveOfficeId)) {
      throw createError({
        statusCode: 403,
        message: 'OFFICE_SCOPE_MISMATCH: This document is not currently at an office assigned to you.',
        data: { code: 'OFFICE_SCOPE_MISMATCH' },
      })
    }
  }

  // No office context: an org-wide client-admin document has no single office
  // of staff to filter by, so offer every messenger/sub-user in the org instead
  // of an empty list — a client's reach is the whole organisation.
  const { data: candidates, error: candErr } = effectiveOfficeId
    ? await client
        .from('users')
        .select('user_id, full_name, email, role, office_id, status')
        .eq('org_id', actor.orgId)
        .in('role', ['messenger', 'employee_sub_user'])
        .eq('office_id', effectiveOfficeId)
        .order('full_name', { ascending: true })
    : await client
        .from('users')
        .select('user_id, full_name, email, role, office_id, status')
        .eq('org_id', actor.orgId)
        .in('role', ['messenger', 'employee_sub_user'])
        .order('full_name', { ascending: true })

  if (candErr) throw createError({ statusCode: 500, message: candErr.message })

  // Exclude the actor themselves here — they're already offered separately
  // below as the "(Myself)" option, so this avoids listing them twice.
  const active = (candidates ?? []).filter((u) => u.status !== 0 && String(u.user_id) !== String(actor.userId))

  const mapped = active.map((u) => ({
    user_id: u.user_id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    already_associated: true,
  }))

  // Let the creator/handler hand-carry it themselves instead of assigning a
  // messenger — already permitted server-side by assign-liaison.post.ts, this
  // just surfaces it as a pickable option instead of requiring a separate flow.
  if (actor.userRole === 'client' || actor.userRole === 'employee' || actor.userRole === 'employee_sub_user') {
    mapped.unshift({
      user_id: actor.userId,
      full_name: `${actor.fullName ?? 'Myself'} (Myself)`,
      email: null,
      role: actor.userRole,
      already_associated: true,
    })
  }

  return {
    success: true,
    data: {
      office_id: effectiveOfficeId,
      candidates: mapped,
    },
  }
})
