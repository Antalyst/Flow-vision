/**
 * GET /api/org/knowledge
 *
 * Lists the org's AI Knowledge Base files (Settings → AI Knowledge Base).
 * Client (org admin) only — matches upload/delete's access rule.
 */
import { resolveTenant } from '~~/server/utils/aiSession'

export default defineEventHandler(async (event) => {
  const db = event.context.db
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: 'Database connection is not available.' })
  }

  const { orgId, role } = await resolveTenant(event)
  if (role !== 'client') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only an organization admin can view the AI Knowledge Base.',
    })
  }

  const [rows] = await db.execute(
    `SELECT id, file_name, file_ext, mime_type, file_size, extraction_status, extraction_error, uploaded_by_name, created_at
     FROM org_knowledge_files
     WHERE org_id = ?
     ORDER BY created_at DESC`,
    [orgId]
  )

  return { success: true, data: rows }
})
