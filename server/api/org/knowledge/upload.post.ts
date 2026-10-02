/**
 * POST /api/org/knowledge/upload
 *
 * Client (org admin) uploads one PDF / .docx / .xlsx file into the org's AI
 * Knowledge Base. The file is stored as a blob (MySQL `org_knowledge_files`)
 * alongside its extracted text, which the AI chat assistant later reads to
 * ground answers about how the org works (see server/utils/orgKnowledge.ts).
 *
 * Single-request path for files up to 4 MB (Vercel rejects bodies over
 * ~4.5 MB). Larger PDFs, up to 150 MB, use the chunked upload under
 * /api/org/knowledge/uploads instead.
 */
import { extractFullTextFromFile } from '~~/server/utils/documentParser'
import {
  KNOWLEDGE_ALLOWED_EXTENSIONS,
  defineKnowledgeHandler,
  requireKnowledgeAdmin,
  toKnowledgeHttpError,
} from '~~/server/utils/orgKnowledge'
import {
  KNOWLEDGE_ENCRYPTED_PDF_MESSAGE,
  KNOWLEDGE_INVALID_PDF_MESSAGE,
  KNOWLEDGE_SCANNED_PDF_MESSAGE,
  KNOWLEDGE_SINGLE_REQUEST_MAX_BYTES,
} from '#shared/knowledgeUpload'

/** Allowance for multipart boundaries/headers on top of the file itself. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024

const SINGLE_REQUEST_TOO_LARGE =
  'Files uploaded in a single request must be 4 MB or smaller. PDFs up to 150 MB are uploaded in parts automatically; Word and Excel files must be 4 MB or smaller.'

export default defineKnowledgeHandler('single-request upload', async (event) => {
  // Knowledge base management is an org-admin (client) action only.
  const { db, orgId, userId } = await requireKnowledgeAdmin(event)

  // Refuse oversize bodies before buffering them.
  const declaredLength = Number(getRequestHeader(event, 'content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > KNOWLEDGE_SINGLE_REQUEST_MAX_BYTES + MULTIPART_OVERHEAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: SINGLE_REQUEST_TOO_LARGE, data: { code: 'FILE_TOO_LARGE' } })
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

  if (fileItem.data.length > KNOWLEDGE_SINGLE_REQUEST_MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: SINGLE_REQUEST_TOO_LARGE, data: { code: 'FILE_TOO_LARGE' } })
  }

  const mimeType = fileItem.type || 'application/octet-stream'
  const buffer = Buffer.from(fileItem.data)

  // Don't trust the extension or browser MIME type — check the real header.
  if (fileExt === 'pdf' && !buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw createError({ statusCode: 422, statusMessage: KNOWLEDGE_INVALID_PDF_MESSAGE, data: { code: 'INVALID_PDF' } })
  }

  // A file whose text can't be read is useless to the AI, so it's rejected
  // outright — nothing is stored, and no half-working entry appears in the list.
  const extraction = await extractFullTextFromFile({ filename: fileName, data: buffer })
  if (extraction.status !== 'ready') {
    const reason = String(extraction.error ?? '')
    let message = `The text in "${fileName}" could not be read, so it was not added to the AI Knowledge Base.`
    if (fileExt === 'pdf') {
      if (/password|encrypt/i.test(reason)) message = KNOWLEDGE_ENCRYPTED_PDF_MESSAGE
      else if (/no readable text/i.test(reason)) message = KNOWLEDGE_SCANNED_PDF_MESSAGE
      else message = KNOWLEDGE_INVALID_PDF_MESSAGE
    }
    console.warn('[Knowledge Upload] rejected unreadable file', { org_id: orgId, file_ext: fileExt, file_size: buffer.length, reason })
    throw createError({ statusCode: 422, statusMessage: message, data: { code: 'UNREADABLE_FILE' } })
  }

  // A retried upload (e.g. the response was lost) must not add a second copy.
  // Single-request files are always stored as one blob, and a blob row is
  // always a finished upload — this check works before and after the
  // chunked-upload migration.
  const [existing] = await db.execute(
    `SELECT id FROM org_knowledge_files
     WHERE org_id = ? AND file_name = ? AND file_size = ? AND file_blob IS NOT NULL
     LIMIT 1`,
    [orgId, fileName, buffer.length],
  )
  if ((existing as any[]).length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `"${fileName}" is already in your AI Knowledge Base. Delete the existing copy first if you want to replace it.`,
      data: { code: 'DUPLICATE_FILE' },
    })
  }

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
        extraction.text,
        extraction.status,
        null,
        userId,
        null,
      ]
    )

    const insertId = (result as any).insertId

    return {
      success: true,
      message: `"${fileName}" was uploaded and is ready for the AI to use.`,
      file: {
        id: insertId,
        file_name: fileName,
        file_ext: fileExt,
        mime_type: mimeType,
        file_size: buffer.length,
        extraction_status: extraction.status,
        extraction_error: null,
        created_at: new Date().toISOString(),
      },
    }
  } catch (error: any) {
    // The text was read fine — this is a storage failure, reported as such.
    throw toKnowledgeHttpError(error, 'save uploaded file')
  }
})
