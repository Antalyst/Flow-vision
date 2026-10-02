/**
 * GET /api/org/knowledge
 *
 * Lists the org's AI Knowledge Base files (Settings → AI Knowledge Base).
 * Client (org admin) only — matches upload/delete's access rule.
 */
import {
  cleanupStaleKnowledgeUploads,
  defineKnowledgeHandler,
  isKnowledgeSchemaError,
  requireKnowledgeAdmin,
} from '~~/server/utils/orgKnowledge'

export default defineKnowledgeHandler('list knowledge files', async (event) => {
  const { db, orgId } = await requireKnowledgeAdmin(event)

  await cleanupStaleKnowledgeUploads(db, orgId)

  try {
    // Only finished files — a chunked upload still in progress is never listed.
    const [rows] = await db.execute(
      `SELECT id, file_name, file_ext, mime_type, file_size, page_count, extraction_status, extraction_error, uploaded_by_name, created_at
       FROM org_knowledge_files
       WHERE org_id = ? AND upload_status = 'completed'
       ORDER BY created_at DESC`,
      [orgId]
    )
    return { success: true, data: rows ?? [] }
  } catch (error) {
    if (!isKnowledgeSchemaError(error)) throw error
  }

  // The chunked-upload migration (migrations/mysql/2026-09-30_...) hasn't been
  // run: upload_status/page_count don't exist yet, and every row is a finished
  // single-blob upload. List them the original way so existing files stay visible.
  console.warn('[orgKnowledge] upload_status column missing — listing with the pre-migration query. Run migrations/mysql/2026-09-30_org_knowledge_chunked_uploads.sql.')
  const [rows] = await db.execute(
    `SELECT id, file_name, file_ext, mime_type, file_size, NULL AS page_count, extraction_status, extraction_error, uploaded_by_name, created_at
     FROM org_knowledge_files
     WHERE org_id = ?
     ORDER BY created_at DESC`,
    [orgId]
  )
  return { success: true, data: rows ?? [], schema_outdated: true }
})
