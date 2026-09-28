/**
 * server/utils/deskAccess.ts
 *
 * Shared desk-level authorization + resolution helpers, reused by every
 * desk-related endpoint (CRUD, dropoff-to-desk, desk-transfer). Mirrors the
 * conventions already established in actorContext.ts — org_id is always
 * server-resolved, never trusted from the client.
 */

import type { ActorContext } from '~~/server/utils/actorContext'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Extracts a desk UUID from `flowvision://desk?id=<uuid>`.
 * Mirrors app/utils/parseFlowVisionQr.ts's extractDocumentTrackId — duplicated
 * here (not imported) because server (Nitro) and app (Vite) do not share the
 * same `~` alias target in this project.
 */
function extractDeskId(raw: string): string | null {
  const trimmed = raw.trim()
  if (!/^flowvision:\/\/desk\b/i.test(trimmed)) return null
  try {
    const url = new URL(trimmed.replace(/^flowvision:\/\//i, 'https://flowvision.local/'))
    const deskId = url.searchParams.get('id')?.trim()
    return deskId && UUID_RE.test(deskId) ? deskId : null
  } catch {
    return null
  }
}

export interface DeskRow {
  id: string
  org_id: string
  office_id: string
  name: string
  code: string
  assigned_user_id: string | null
  qr_code_data: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DeskWithOffice extends DeskRow {
  office: { id: string; name: string; org_id: string; assigned_user: string | null } | null
}

/** Loads a desk row by its raw id. Returns null if not found — caller decides the error. */
export async function getDeskById(client: any, deskId: string): Promise<DeskRow | null> {
  const { data, error } = await client
    .from('desks')
    .select('*')
    .eq('id', deskId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, message: 'We could not load this desk. Please try again.' })
  }
  return data ?? null
}

/** Loads a desk + its parent office in one round trip. */
export async function getDeskWithOffice(client: any, deskId: string): Promise<DeskWithOffice | null> {
  const { data, error } = await client
    .from('desks')
    .select('*, office:offices(id, name, org_id, assigned_user)')
    .eq('id', deskId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, message: 'We could not load this desk. Please try again.' })
  }
  return (data as DeskWithOffice) ?? null
}

/**
 * Resolves a scanned desk QR string (`flowvision://desk?id=<uuid>`) to the
 * desk + its office. Throws user-facing errors for every failure mode so
 * callers (dropoff, desk-transfer) don't need to duplicate this logic.
 */
export async function getDeskByQr(client: any, rawQr: string): Promise<DeskWithOffice> {
  const deskId = extractDeskId(rawQr)
  if (!deskId) {
    throw createError({ statusCode: 400, message: 'We could not read this desk QR code. Please try scanning it again.' })
  }

  const desk = await getDeskWithOffice(client, deskId)
  if (!desk) {
    throw createError({ statusCode: 404, message: 'This desk could not be found.', data: { code: 'DESK_NOT_FOUND' } })
  }

  return desk
}

/** True if `actor` (an office employee/sub-user/client admin) may manage this desk (create/edit/assign staff). */
export function canManageDesk(actor: ActorContext & { officeIds?: string[] }, desk: { org_id: string; office_id: string }): boolean {
  if (String(desk.org_id) !== String(actor.orgId)) return false
  if (actor.userRole === 'client') return true
  if (actor.userRole === 'employee' || actor.userRole === 'employee_sub_user') {
    return (actor.officeIds ?? []).includes(String(desk.office_id))
  }
  return false
}

/**
 * True if `userId` is authorized to operate FROM this desk (i.e. initiate a
 * desk-to-desk transfer of whatever document is currently there). Only the
 * desk's own assigned staff member may do this — the "staff currently
 * handling the document" from the business rule.
 */
export function isDeskHandler(userId: string, desk: { assigned_user_id: string | null }): boolean {
  return !!desk.assigned_user_id && String(desk.assigned_user_id) === String(userId)
}

export interface ValidatedDeskTransfer {
  fromDesk: DeskWithOffice
  toDesk: DeskWithOffice
}

/**
 * Validates every rule for section 11 of the desk-transfer spec:
 *   - same organisation
 *   - destination desk active
 *   - destination desk in the SAME office as the source desk (no cross-office
 *     movement via this path — that must go through the Liaison/route process)
 *   - destination desk has an assigned staff member
 */
export async function validateDeskTransfer(
  client: any,
  orgId: string,
  fromDeskId: string,
  toDeskQr: string,
): Promise<ValidatedDeskTransfer> {
  const fromDesk = await getDeskWithOffice(client, fromDeskId)
  if (!fromDesk) {
    throw createError({ statusCode: 404, message: 'This desk could not be found.', data: { code: 'DESK_NOT_FOUND' } })
  }

  const toDesk = await getDeskByQr(client, toDeskQr)

  if (String(toDesk.org_id) !== String(orgId)) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to transfer documents to this desk.',
      data: { code: 'SECURITY_ORG_MISMATCH' },
    })
  }

  if (!toDesk.is_active) {
    throw createError({
      statusCode: 422,
      message: 'This desk is currently inactive.',
      data: { code: 'DESK_INACTIVE' },
    })
  }

  if (String(toDesk.office_id) !== String(fromDesk.office_id)) {
    throw createError({
      statusCode: 403,
      message: 'Documents can only be transferred between desks within the same office.',
      data: { code: 'CROSS_OFFICE_DESK_TRANSFER' },
    })
  }

  if (!toDesk.assigned_user_id) {
    throw createError({
      statusCode: 422,
      message: 'This desk does not have an assigned staff member.',
      data: { code: 'DESK_NO_ASSIGNEE' },
    })
  }

  if (String(toDesk.id) === String(fromDesk.id)) {
    throw createError({
      statusCode: 422,
      message: 'This document is already at that desk.',
      data: { code: 'INVALID_DESK_TRANSFER' },
    })
  }

  return { fromDesk, toDesk }
}
