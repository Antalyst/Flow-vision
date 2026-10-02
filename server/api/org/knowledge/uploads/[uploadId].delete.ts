/**
 * DELETE /api/org/knowledge/uploads/:uploadId
 *
 * Cancels an unfinished chunked upload and deletes everything stored for it
 * (chunks cascade). A completed file is never deleted here — use
 * DELETE /api/org/knowledge/:id for that.
 */
import {
  deleteUnfinishedKnowledgeUpload,
  loadKnowledgeUpload,
  requireKnowledgeAdmin,
  defineKnowledgeHandler,
} from '~~/server/utils/orgKnowledge'

export default defineKnowledgeHandler('uploads/[uploadId].delete.ts', async (event) => {
  const { db, orgId, userId } = await requireKnowledgeAdmin(event)
  const upload = await loadKnowledgeUpload(db, getRouterParam(event, 'uploadId'), orgId, userId)

  if (upload.upload_status === 'completed') {
    throw createError({
      statusCode: 409,
      statusMessage: 'This upload already finished and can no longer be cancelled.',
      data: { code: 'UPLOAD_ALREADY_COMPLETED' },
    })
  }

  await deleteUnfinishedKnowledgeUpload(db, upload.id)
  console.info('[Knowledge Upload] cancelled', { upload_id: upload.upload_id, org_id: orgId })

  return { success: true }
})
