import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'

function getServiceSupabase() {
  const config = useRuntimeConfig()
  return createClient(
    String(config.public.supabaseUrl),
    String(config.supabaseServiceKey),
  )
}

/**
 * POST /api/tracking/check-sla-breaches
 *
 * "Check on page load" SLA breach detection (Option A from
 * docs/tracking-ux-improvement-plan.md Part 7) — there is no scheduled-job
 * infrastructure in this repo, so this runs opportunistically whenever a
 * client/employee opens My Tracking or the Dashboard. Idempotent: a document
 * is only ever notified once per breach (tracked via notifications.metadata.type).
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const userRole = (getCookie(event, 'user_role') ?? '').toLowerCase()

  if (!['client', 'employee', 'employee_sub_user'].includes(userRole)) {
    throw createError({ statusCode: 403, message: 'Not authorized.' })
  }

  const actor = await resolveActorContext(event, client)
  const db = getServiceSupabase()
  const nowIso = new Date().toISOString()

  const { data: overdueDocs, error } = await db
    .from('documents')
    .select('id, title, user_id, creator_role, current_office_id, target_completion_date, tracking_status')
    .eq('org_id', actor.orgId)
    .not('target_completion_date', 'is', null)
    .lt('target_completion_date', nowIso)
    .neq('tracking_status', 'COMPLETED')
    .limit(100)

  if (error) throw createError({ statusCode: 500, message: error.message })

  const docs = overdueDocs ?? []
  if (!docs.length) return { success: true, breachesNotified: 0 }

  const docIds = docs.map((d) => d.id)
  const { data: existing } = await db
    .from('notifications')
    .select('document_id')
    .eq('org_id', actor.orgId)
    .in('document_id', docIds)
    .contains('metadata', { type: 'SLA_BREACH' })

  const alreadyNotified = new Set((existing ?? []).map((n) => String(n.document_id)))
  const toNotify = docs.filter((d) => !alreadyNotified.has(String(d.id)))

  if (!toNotify.length) return { success: true, breachesNotified: 0 }

  const { data: orgRow } = await db.from('org').select('user_id').eq('org_id', actor.orgId).single()
  const adminUserId = orgRow?.user_id ? String(orgRow.user_id) : null

  const rows: Record<string, unknown>[] = []
  for (const doc of toNotify) {
    const title = doc.title || 'Untitled document'
    const isEmployeeCreator = doc.creator_role === 'employee' || doc.creator_role === 'employee_sub_user'

    if (doc.user_id) {
      rows.push({
        org_id: actor.orgId,
        document_id: doc.id,
        user_id: doc.user_id,
        target_role: isEmployeeCreator ? 'employee' : 'client',
        office_id: isEmployeeCreator ? doc.current_office_id : null,
        title: 'Document Overdue',
        message: `"${title}" has gone past its expected completion time.`,
        is_read: false,
        is_claimed: false,
        metadata: { type: 'SLA_BREACH', role: 'owner' },
      })
    }

    if (adminUserId && adminUserId !== String(doc.user_id)) {
      rows.push({
        org_id: actor.orgId,
        document_id: doc.id,
        user_id: adminUserId,
        target_role: 'client',
        title: 'Document Overdue',
        message: `"${title}" has breached its expected completion time.`,
        is_read: false,
        is_claimed: false,
        metadata: { type: 'SLA_BREACH', role: 'admin' },
      })
    }

    if (doc.current_office_id) {
      rows.push({
        org_id: actor.orgId,
        document_id: doc.id,
        user_id: null,
        target_role: 'employee',
        office_id: doc.current_office_id,
        title: 'Document Overdue',
        message: `"${title}" waiting at your desk is now overdue — please act.`,
        is_read: false,
        is_claimed: false,
        metadata: { type: 'SLA_BREACH', role: 'office' },
      })
    }
  }

  if (rows.length) {
    const { error: insertErr } = await db.from('notifications').insert(rows)
    if (insertErr) throw createError({ statusCode: 500, message: insertErr.message })
  }

  return { success: true, breachesNotified: toNotify.length }
})
