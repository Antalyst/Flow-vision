import { serverSupabaseClient } from '#supabase/server'
import {
  ISSUE_ALLOWED_ROLES,
  assertDocumentOrgAccess,
} from '~~/server/utils/documentIssues'

/**
 * GET /api/documents/issues/list
 *
 * Returns open (and optionally recent resolved) issues for a document.
 *
 * Query:
 *   document_id  UUID  required
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const query  = getQuery(event)

  const documentId = String(query.document_id ?? '').trim()
  if (!documentId) {
    throw createError({ statusCode: 400, message: 'document_id is required.' })
  }

  const { actor, document } = await assertDocumentOrgAccess(event, client, documentId)

  const { data: issues, error } = await client
    .from('document_issues')
    .select('id, document_id, org_id, reported_by_office_id, title, status, created_at')
    .eq('document_id', documentId)
    .eq('org_id', actor.orgId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const openIssue = (issues ?? []).find((i) => i.status === 'OPEN') ?? null

  return {
    success: true,
    org_id:  actor.orgId,
    document: {
      id:              document.id,
      title:           document.title,
      tracking_status: document.tracking_status,
    },
    openIssue,
    history: issues ?? [],
  }
})
