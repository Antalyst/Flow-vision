import { randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Matches the OFF-XXXXXX convention already used by /api/office (index.post.ts). */
export const generateOfficeCode = (): string => 'OFF-' + randomBytes(3).toString('hex').toUpperCase()

export function computeAgeFields(birthDateStr: string): { age: number; birthYear: number } | null {
  const bDay = new Date(birthDateStr)
  if (Number.isNaN(bDay.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - bDay.getFullYear()
  if (today < new Date(today.getFullYear(), bDay.getMonth(), bDay.getDate())) age--

  return { age, birthYear: bDay.getFullYear() }
}

/**
 * Resolves an office for employee create/edit/import: validates an existing
 * office_id belongs to the org, or finds-or-creates one by name (case-insensitive)
 * so re-using the same office name never creates a duplicate office row.
 */
export async function resolveOrCreateOffice(
  admin: SupabaseClient,
  input: { orgId: string; officeId?: string | null; officeName?: string | null; createdBy: string },
): Promise<{ id: string; name: string; created: boolean }> {
  if (input.officeId) {
    const { data: officeRow } = await admin
      .from('offices')
      .select('id, name, org_id')
      .eq('id', input.officeId)
      .maybeSingle()

    if (!officeRow || String(officeRow.org_id) !== String(input.orgId)) {
      throw createError({ statusCode: 403, message: 'Selected office does not belong to your organization' })
    }
    return { id: officeRow.id, name: officeRow.name, created: false }
  }

  const name = (input.officeName ?? '').trim()
  if (!name) {
    throw createError({ statusCode: 400, message: 'Select an existing office or provide a new office name' })
  }

  const { data: existingOffices } = await admin.from('offices').select('id, name').eq('org_id', input.orgId)
  const match = (existingOffices ?? []).find((o) => String(o.name).trim().toLowerCase() === name.toLowerCase())
  if (match) return { id: match.id, name: match.name, created: false }

  const { data: newOffice, error } = await admin
    .from('offices')
    .insert({ name, org_id: input.orgId, code: generateOfficeCode(), created_by: input.createdBy })
    .select('id, name')
    .single()

  if (error || !newOffice) {
    throw createError({ statusCode: 500, message: error?.message || 'Failed to create office' })
  }

  return { id: newOffice.id, name: newOffice.name, created: true }
}

/**
 * Backfills an office's assigned_user with the employee just linked to it,
 * but ONLY when the office doesn't already have one — covers both a
 * brand-new office (created this request) and a pre-existing office that
 * was never assigned an owner (e.g. seeded manually, or left over from
 * before this auto-assignment existed). The `assigned_user IS NULL` guard
 * in the query itself means an office someone already owns is never
 * reassigned just because a second employee joins it.
 */
export async function linkOfficeOwnerIfNew(
  admin: SupabaseClient,
  office: { id: string; created: boolean },
  userId: string,
): Promise<void> {
  const { error } = await admin
    .from('offices')
    .update({ assigned_user: userId })
    .eq('id', office.id)
    .is('assigned_user', null)

  if (error) {
    console.error('[employeeProvisioning] Failed to link office owner:', error.message, { officeId: office.id, userId })
  }
}

/**
 * The single office an 'employee' ("Office") account owns (offices.assigned_user
 * = their own user_id). Used to scope staff visibility/edit/delete to the
 * employee's own office — an employee never sees or manages another office's staff.
 */
export async function resolveOwnedOfficeId(
  admin: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('offices')
    .select('id')
    .eq('org_id', orgId)
    .eq('assigned_user', userId)
    .maybeSingle()

  return data?.id ?? null
}
