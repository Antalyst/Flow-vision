/**
 * GET /api/org/knowledge/uploads/:uploadId
 *
 * Progress of a chunked upload — which chunks the server already has and how
 * many text batches were applied — so the browser can resume after a network
 * failure by sending only what's missing.
 */
import { loadKnowledgeUpload, requireKnowledgeAdmin, defineKnowledgeHandler } from '~~/server/utils/orgKnowledge'

export default defineKnowledgeHandler('uploads/[uploadId].get.ts', async (event) => {
  const { db, orgId, userId } = await requireKnowledgeAdmin(event)
  const upload = await loadKnowledgeUpload(db, getRouterParam(event, 'uploadId'), orgId, userId)

  const [rows] = await db.execute(
    'SELECT chunk_index FROM org_knowledge_file_chunks WHERE file_id = ? ORDER BY chunk_index',
    [upload.id],
  )

  return {
    success: true,
    upload_status: upload.upload_status,
    total_chunks: upload.total_chunks,
    chunk_size: upload.chunk_size,
    received_chunks: (rows as { chunk_index: number }[]).map((r) => r.chunk_index),
    text_batches: upload.text_batches,
  }
})
