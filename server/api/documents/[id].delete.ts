import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { useMySQL } from '~~/server/utils/mysql'
import { logActivitySafe } from '~~/server/utils/activityLog'

/**
 * DELETE /api/documents/:id
 *
 * Lets the creator (or an office/org admin) remove a document entry that was
 * uploaded by mistake — e.g. the wrong file. Deliberately restricted to
 * documents still in the 'CREATED' state: once a document has been picked
 * up, it's a physical hard copy in someone's hands and deleting the record
 * would orphan a real-world object. Suspend/flag it instead past that point.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = await serverSupabaseClient(event)

  const userId = sessionUserId(event)
  const userRole = sessionRole(event)
  if (!userId || !userRole) {
    throw createError({ statusCode: 401, message: 'Authentication required.' })
  }

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing document ID' })

  const { data: actorRow } = await client.from('users').select('org_id, role').eq('user_id', userId).maybeSingle()
  if (!actorRow?.org_id) {
    throw createError({ statusCode: 403, message: 'Could not resolve your account. Please log in again.' })
  }

  const admin = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  const { data: doc, error: docErr } = await admin
    .from('documents')
    .select('id, org_id, user_id, title, tracking_status, mysql_storage_id')
    .eq('id', id)
    .maybeSingle()

  if (docErr) throw createError({ statusCode: 500, message: docErr.message })
  if (!doc) throw createError({ statusCode: 404, message: 'Document not found.' })
  if (String(doc.org_id) !== String(actorRow.org_id)) {
    throw createError({ statusCode: 403, message: 'Forbidden.' })
  }

  const isCreator = String(doc.user_id) === String(userId)
  const isOrgAdmin = ['client', 'employee'].includes(String(actorRow.role))
  if (!isCreator && !isOrgAdmin) {
    throw createError({ statusCode: 403, message: 'You can only delete documents you created.' })
  }

  if (doc.tracking_status !== 'CREATED') {
    throw createError({
      statusCode: 409,
      message: 'Only documents still pending pickup can be deleted. This one is already in motion — flag it instead if something is wrong.',
    })
  }

  // Clean up dependent rows first (no ON DELETE CASCADE in the schema).
  const { data: issues } = await admin.from('document_issues').select('id').eq('document_id', id)
  const issueIds = (issues ?? []).map((i) => i.id)
  if (issueIds.length) {
    await admin.from('document_messages').delete().in('issue_id', issueIds)
    await admin.from('document_issues').delete().in('id', issueIds)
  }
  await admin.from('document_tracking_events').delete().eq('document_id', id)
  await admin.from('document_ai_analysis').delete().eq('document_id', id)
  await admin.from('notifications').delete().eq('document_id', id)
  await admin.from('email_notifications').delete().eq('document_id', id)
  // activity_logs is an audit trail — keep the rows, just drop the now-dangling reference.
  await admin.from('activity_logs').update({ document_id: null }).eq('document_id', id)

  const { error: deleteErr } = await admin.from('documents').delete().eq('id', id)
  if (deleteErr) {
    throw createError({ statusCode: 500, message: deleteErr.message || 'Failed to delete document' })
  }

  if (doc.mysql_storage_id) {
    try {
      const pool = await useMySQL()
      if (pool) await pool.query('DELETE FROM document_storage WHERE id = ?', [doc.mysql_storage_id])
    } catch (err) {
      console.error('[documents/delete] Non-fatal: MySQL blob cleanup failed:', err)
    }
  }

  await logActivitySafe({
    orgId: String(actorRow.org_id),
    userId,
    actionType: 'system',
    details: `Deleted pending document "${doc.title}" before pickup.`,
    message: `Deleted document "${doc.title}"`,
  }, client)

  return { success: true, message: `"${doc.title}" has been deleted.` }
})
