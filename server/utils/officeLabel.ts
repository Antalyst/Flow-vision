/**
 * server/utils/officeLabel.ts
 *
 * Combines an office's own name with the document creator's personal desk
 * name, when they have one — e.g. "Treasurer Office · Joeval's Desk" instead
 * of just "Treasurer Office".
 *
 * A staff (employee_sub_user) account's own `users.office_id` already points
 * at the real parent office directly (see server/api/staff/my-office.get.ts),
 * so a staff-created document's origin_office_id is that same real office —
 * NOT their personal desk. Their desk is a SEPARATE `offices` row
 * (parent_office_id = that same office, assigned_user = them), auto-created
 * at account creation (server/api/employee/users/index.post.ts) and shown
 * under Office QR Codes. Combining the two therefore requires a reverse
 * lookup by creator (assigned_user + parent_office_id), not a walk up the
 * origin office's own parent_office_id — the origin office IS the parent.
 */

export interface OfficeDisplayLabel {
  office_name: string | null
  desk_name: string | null
  /** "{office}" alone, or "{office} · {desk}" when the creator has a desk under it. */
  label: string
}

export async function resolveOfficeDisplayLabel(
  client: any,
  officeId: string | number | null | undefined,
  creatorUserId: string | number | null | undefined,
): Promise<OfficeDisplayLabel> {
  let officeName: string | null = null
  if (officeId) {
    try {
      const { data } = await client.from('offices').select('name').eq('id', officeId).maybeSingle()
      officeName = data?.name ?? null
    } catch {
      // Best-effort — a label lookup failure should never break the caller.
    }
  }

  let deskName: string | null = null
  if (officeId && creatorUserId) {
    try {
      const { data } = await client
        .from('offices')
        .select('name')
        .eq('assigned_user', creatorUserId)
        .eq('parent_office_id', officeId)
        .maybeSingle()
      deskName = data?.name ?? null
    } catch {
      // Best-effort — same as above.
    }
  }

  const label =
    officeName && deskName && officeName !== deskName
      ? `${officeName} · ${deskName}`
      : (officeName ?? deskName ?? 'Unknown office')

  return { office_name: officeName, desk_name: deskName, label }
}
