/**
 * DELETE /api/org/knowledge/:id
 *
 * Removes one file from the org's AI Knowledge Base. Client (org admin) only.
 * The org_id match in the WHERE clause is the tenant guard — even a guessed
 * numeric id can never delete another organization's file.
 */
import { resolveTenant } from '~~/server/utils/aiSession'
import { defineKnowledgeHandler } from '~~/server/utils/orgKnowledge'

export default defineKnowledgeHandler('delete knowledge file', async (event) => {
  const db = event.context.db
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: 'Database connection is not available.' })
  }

  const { orgId, role } = await resolveTenant(event)
  if (role !== 'client') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only an organization admin can manage the AI Knowledge Base.',
    })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file id.' })
  }

  // Chunks (chunked PDFs) are removed by the ON DELETE CASCADE foreign key.
  const [result] = await db.execute(
    'DELETE FROM org_knowledge_files WHERE id = ? AND org_id = ?',
    [id, orgId]
  )

  if ((result as any).affectedRows === 0) {
    throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  }

  return { success: true }
})
