/**
 * POST /api/org/knowledge/upload
 *
 * Client (org admin) uploads one PDF / .docx / .xlsx file into the org's AI
 * Knowledge Base. The file is stored as a blob (MySQL `org_knowledge_files`)
 * alongside its extracted text, which the AI chat assistant later reads to
 * ground answers about how the org works (see server/utils/orgKnowledge.ts).
 */
import { resolveTenant } from '~~/server/utils/aiSession'
import { extractFullTextFromFile } from '~~/server/utils/documentParser'
import { KNOWLEDGE_ALLOWED_EXTENSIONS, MAX_KNOWLEDGE_FILE_BYTES } from '~~/server/utils/orgKnowledge'

export default defineEventHandler(async (event) => {
  const db = event.context.db
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: 'Database connection is not available.' })
  }

  // Knowledge base management is an org-admin (client) action only.
  const { orgId, userId, role } = await resolveTenant(event)
  if (role !== 'client') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only an organization admin can manage the AI Knowledge Base.',
    })
  }

  const formData = await readMultipartFormData(event)
  const fileItem = formData?.find((f) => f.name === 'file' && f.filename)

  if (!fileItem?.data) {
    throw createError({ statusCode: 400, statusMessage: 'Please choose a file to upload.' })
  }

  const fileName = fileItem.filename || 'unnamed'
  const fileExt = fileName.split('.').pop()?.toLowerCase() || ''

  if (!(KNOWLEDGE_ALLOWED_EXTENSIONS as readonly string[]).includes(fileExt)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'INVALID_FILE_TYPE: Only PDF (.pdf), Word (.docx), and Excel (.xlsx) files are supported.',
    })
  }

  if (fileItem.data.length > MAX_KNOWLEDGE_FILE_BYTES) {
    const maxMb = Math.round(MAX_KNOWLEDGE_FILE_BYTES / (1024 * 1024))
    throw createError({ statusCode: 400, statusMessage: `File is too large. The limit is ${maxMb}MB.` })
  }

  const mimeType = fileItem.type || 'application/octet-stream'
  const buffer = Buffer.from(fileItem.data)

  // Extraction failures never block the upload — the file is still stored,
  // just flagged so it's excluded from AI grounding until re-uploaded.
  const extraction = await extractFullTextFromFile({ filename: fileName, data: buffer })

  try {
    const [result] = await db.execute(
      `INSERT INTO org_knowledge_files
        (org_id, file_name, file_ext, mime_type, file_size, file_blob, extracted_text, extraction_status, extraction_error, uploaded_by, uploaded_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orgId,
        fileName,
        fileExt,
        mimeType,
        buffer.length,
        buffer,
        extraction.status === 'ready' ? extraction.text : null,
        extraction.status,
        extraction.error ?? null,
        userId,
        null,
      ]
    )

    const insertId = (result as any).insertId

    return {
      success: true,
      message: extraction.status === 'ready'
        ? `"${fileName}" was uploaded and is ready for the AI to use.`
        : `"${fileName}" was uploaded, but its text could not be read (${extraction.error ?? 'unknown error'}). It won't be used by the AI yet.`,
      file: {
        id: insertId,
        file_name: fileName,
        file_ext: fileExt,
        mime_type: mimeType,
        file_size: buffer.length,
        extraction_status: extraction.status,
        extraction_error: extraction.error ?? null,
        created_at: new Date().toISOString(),
      },
    }
  } catch (error: any) {
    console.error('[Knowledge Upload] Insert failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'We could not save this file. Please try again.',
    })
  }
})
