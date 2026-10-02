/**
 * GET /api/tracking/release-requests
 *
 * Pending release requests for every office the signed-in user heads
 * (offices.assigned_user) — the office head's approval queue.
 */
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { lifecycleDb } from '~~/server/utils/documentRoute'

export default defineEventHandler(async (event) => {
  const actor = await resolveActorContext(event, await serverSupabaseClient(event))
  const db = lifecycleDb()

  const { data: offices } = await db
    .from('offices')
    .select('id, name')
    .eq('org_id', actor.orgId)
    .eq('assigned_user', actor.userId)
  const officeIds = (offices ?? []).map((o: any) => String(o.id))
  if (officeIds.length === 0) return { success: true, is_head: false, data: [] }

  const { data: requests } = await db
    .from('document_release_requests')
    .select('id, document_id, office_id, step_number, requested_by, requested_at, remarks')
    .in('office_id', officeIds)
    .eq('status', 'PENDING')
    .order('requested_at', { ascending: true })

  const rows = requests ?? []
  const docIds = [...new Set(rows.map((r: any) => String(r.document_id)))]
  const userIds = [...new Set(rows.map((r: any) => r.requested_by).filter(Boolean).map(String))]
  const [{ data: docs }, { data: users }] = await Promise.all([
    docIds.length ? db.from('documents').select('id, title, qr_code_data, priority').in('id', docIds) : Promise.resolve({ data: [] }),
    userIds.length ? db.from('users').select('user_id, full_name').in('user_id', userIds) : Promise.resolve({ data: [] }),
  ])
  const docById = new Map((docs ?? []).map((d: any) => [String(d.id), d]))
  const nameById = new Map((users ?? []).map((u: any) => [String(u.user_id), u.full_name]))
  const officeById = new Map((offices ?? []).map((o: any) => [String(o.id), o.name]))

  return {
    success: true,
    is_head: true,
    data: rows.map((r: any) => ({
      id: r.id,
      document_id: r.document_id,
      document_title: docById.get(String(r.document_id))?.title ?? 'Document',
      priority: docById.get(String(r.document_id))?.priority ?? null,
      office_id: r.office_id,
      office_name: officeById.get(String(r.office_id)) ?? null,
      requested_by: r.requested_by,
      requested_by_name: nameById.get(String(r.requested_by)) ?? null,
      requested_at: r.requested_at,
      remarks: r.remarks,
    })),
  }
})
