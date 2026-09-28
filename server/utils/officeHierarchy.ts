/**
 * server/utils/officeHierarchy.ts
 *
 * Messenger/sub-user accounts are always registered under a BRANCH office
 * (`users.office_id`, `parent_office_id IS NULL` — e.g. "Treasurer"), never
 * under one of its desks (`offices` rows with `parent_office_id` set —
 * e.g. "Desk One", auto-created per staff member, see officeLabel.ts).
 *
 * A document's `current_office_id` can land on either a branch office or one
 * of its desks (a desk is where staff actually check documents in/out), so
 * anything that filters or validates "the messengers who belong to this
 * document's current office" must resolve desk → parent branch first, or a
 * document sitting at a desk would never match any real messenger row.
 */

/**
 * Walks `parent_office_id` up to the root branch office. Returns `officeId`
 * unchanged if it has no parent (already a branch) or can't be found.
 * Bounded to guard against a corrupt/cyclical parent chain.
 */
export async function resolveBranchOfficeId(
  client: any,
  officeId: string,
): Promise<string> {
  let current = officeId
  for (let hop = 0; hop < 10; hop++) {
    const { data } = await client
      .from('offices')
      .select('parent_office_id')
      .eq('id', current)
      .maybeSingle()

    const parentId = data?.parent_office_id ? String(data.parent_office_id) : null
    if (!parentId || parentId === current) return current
    current = parentId
  }
  return current
}
