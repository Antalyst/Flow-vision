/**
 * server/utils/liaisonAssignment.ts
 *
 * Shared messenger/Liaison candidate validation — the single source of truth
 * for "is this user allowed to be assigned as the courier for this office
 * right now", reused by:
 *   - POST /api/tracking/assign-liaison   (assignment on an existing document)
 *   - POST /api/documents/upload          (optional initial assignment at creation)
 *   - POST /api/documents/scan/register   (optional initial assignment at creation)
 *
 * Extracted so all three call sites enforce byte-for-byte the same rules —
 * see FLOWVISION FIX — MOVE INITIAL MESSENGER ASSIGNMENT TO DOCUMENT CREATION.
 */

import { resolveBranchOfficeId } from './officeHierarchy'

// 'client' included: an org-wide client admin can be a document's creator, and the
// business rule explicitly allows a creator to become their own document's Liaison.
export const ELIGIBLE_LIAISON_ROLES = ['employee', 'employee_sub_user', 'messenger', 'client']

export interface LiaisonRow {
  user_id: string
  org_id: string
  role: string
  full_name: string | null
  office_id: string | null
  status: number
}

/**
 * Loads and validates a candidate Liaison against the calling office's
 * organisation/office scope. Throws the same user-facing errors used by
 * assign-liaison.post.ts. On success, first-time office association is
 * persisted (identical side effect to the existing endpoint) and the
 * validated liaison row is returned.
 */
export async function resolveAndAssociateLiaison(
  client: any,
  params: { orgId: string; liaisonUserId: string; effectiveOfficeId: string | null },
): Promise<LiaisonRow> {
  const { orgId, liaisonUserId, effectiveOfficeId: rawEffectiveOfficeId } = params

  // Messengers/sub-users are registered under the BRANCH office, never one of
  // its desks (see officeHierarchy.ts) — a document sitting at "Desk One"
  // must validate/associate against "Treasurer", or every existing messenger
  // there would be rejected as "a different office" and a first-time
  // association would tie the messenger to the desk instead of the branch.
  const effectiveOfficeId = rawEffectiveOfficeId
    ? await resolveBranchOfficeId(client, rawEffectiveOfficeId)
    : null

  const { data: liaison, error: liaisonErr } = await client
    .from('users')
    .select('user_id, org_id, role, full_name, office_id, status')
    .eq('user_id', liaisonUserId)
    .maybeSingle()

  if (liaisonErr) throw createError({ statusCode: 500, message: 'We could not load this messenger. Please try again.' })
  if (!liaison) throw createError({ statusCode: 404, message: 'We could not find this messenger.' })

  if (String(liaison.org_id) !== orgId) {
    throw createError({
      statusCode: 403,
      message: 'This messenger belongs to a different office and cannot be assigned here.',
      data: { code: 'SECURITY_ORG_MISMATCH' },
    })
  }

  if (!ELIGIBLE_LIAISON_ROLES.includes(String(liaison.role))) {
    throw createError({
      statusCode: 422,
      message: 'This user cannot be assigned as a messenger.',
      data: { code: 'INELIGIBLE_USER' },
    })
  }

  if (liaison.status === 0) {
    throw createError({
      statusCode: 422,
      message: 'This messenger account is inactive.',
      data: { code: 'INACTIVE_USER' },
    })
  }

  const liaisonOfficeId = liaison.office_id ? String(liaison.office_id) : null

  if (effectiveOfficeId && liaisonOfficeId && liaisonOfficeId !== effectiveOfficeId) {
    throw createError({
      statusCode: 403,
      message: 'This user already belongs to a different office and cannot be assigned here.',
      data: { code: 'LIAISON_OFFICE_MISMATCH' },
    })
  }

  // First-time association: an unaffiliated user (no office_id yet) becomes tied to
  // this office by virtue of being selected as its Liaison. Client admins are
  // org-wide by design (never office-scoped), so they're exempt.
  if (effectiveOfficeId && !liaisonOfficeId && liaison.role !== 'client') {
    const { error: assocErr } = await client
      .from('users')
      .update({ office_id: effectiveOfficeId })
      .eq('user_id', liaison.user_id)

    if (assocErr) {
      console.warn('[liaisonAssignment] Non-fatal: could not persist office association:', assocErr.message)
    }
  }

  return liaison as LiaisonRow
}
