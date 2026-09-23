/**
 * GET /api/tracking/eligible-liaisons?document_id=...
 *
 * Lists users the caller is allowed to assign as the Liaison for this document's
 * current leg — i.e. the picker list for `POST /api/tracking/assign-liaison`.
 *
 * "Eligible" = same organisation, an eligible role (employee / employee_sub_user /
 * messenger — never client), and either already associated with the document's
 * current office (`users.office_id`) or not yet associated with ANY office (a
 * floating candidate who would be onboarded to this office on assignment — see
 * assign-liaison.post.ts). Users already tied to a DIFFERENT office never appear —
 * an office cannot see, let alone pick, another office's staff.
 *
 * Same authorization as assign-liaison: client admins may query any document in
 * their org; employees only for documents currently at an office assigned to them.
 */

import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

// 'client' included: an org-wide client admin can be a document's creator, and the
// business rule explicitly allows a creator to become their own document's Liaison.
// Client rows always have office_id IS NULL, so they already surface for any office
// via the `office_id.is.null` branch below.
const ELIGIBLE_LIAISON_ROLES = ['employee', 'employee_sub_user', 'messenger', 'client']

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (actor.userRole !== 'client' && actor.userRole !== 'employee' && actor.userRole !== 'employee_sub_user') {
    throw createError({ statusCode: 403, message: 'Forbidden.' })
  }

  const query = getQuery(event)
  const documentId = String(query.document_id ?? '').trim()
  if (!documentId) {
    throw createError({ statusCode: 400, message: 'document_id is required.' })
  }

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

  const effectiveOfficeId: string | null =
    doc.current_office_id ? String(doc.current_office_id)
    : doc.origin_office_id ? String(doc.origin_office_id)
    : doc.office_id ? String(doc.office_id)
    : null

  if (actor.userRole === 'employee' || actor.userRole === 'employee_sub_user') {
    if (!effectiveOfficeId || !actor.officeIds.includes(effectiveOfficeId)) {
      throw createError({
        statusCode: 403,
        message: 'OFFICE_SCOPE_MISMATCH: This document is not currently at an office assigned to you.',
        data: { code: 'OFFICE_SCOPE_MISMATCH' },
      })
    }
  }

  let usersQuery = client
    .from('users')
    .select('user_id, full_name, email, role, office_id, status')
    .eq('org_id', actor.orgId)
    .in('role', ELIGIBLE_LIAISON_ROLES)
    .order('full_name', { ascending: true })

  usersQuery = effectiveOfficeId
    ? usersQuery.or(`office_id.eq.${effectiveOfficeId},office_id.is.null`)
    : usersQuery.is('office_id', null) // no office context yet (org-wide document) — only floating candidates

  const { data: candidates, error: candErr } = await usersQuery

  if (candErr) throw createError({ statusCode: 500, message: candErr.message })

  const active = (candidates ?? []).filter((u) => u.status !== 0)

  return {
    success: true,
    data: {
      office_id: effectiveOfficeId,
      candidates: active.map((u) => ({
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        already_associated: u.office_id != null,
      })),
    },
  }
})
