/**
 * POST /api/org/knowledge/uploads
 *
 * Starts a chunked PDF upload for the AI Knowledge Base (files larger than the
 * single-request limit, up to 150 MB). Creates the file row in
 * upload_status='uploading' — it is invisible to the knowledge list and to the
 * AI until /complete succeeds — and returns an unguessable upload id plus the
 * chunk size the browser must use.
 *
 * Body: { file_name: string, file_size: number, page_count?: number }
 *
 * The browser has already opened the PDF with pdf.js and extracted its text
 * before calling this, so password-protected, damaged and image-only PDFs are
 * rejected without creating anything here.
 */
import { randomUUID } from 'node:crypto'
import {
  KNOWLEDGE_CHUNK_BYTES,
  KNOWLEDGE_MAX_FILE_BYTES,
  KNOWLEDGE_TOO_LARGE_MESSAGE,
} from '#shared/knowledgeUpload'
import {
  MAX_ACTIVE_UPLOADS_PER_ORG,
  cleanupStaleKnowledgeUploads,
  defineKnowledgeHandler,
  deleteUnfinishedKnowledgeUpload,
  requireKnowledgeAdmin,
} from '~~/server/utils/orgKnowledge'

export default defineKnowledgeHandler('start chunked upload', async (event) => {
  const { db, orgId, userId } = await requireKnowledgeAdmin(event)
  const body = await readBody(event)

  const fileName = String(body?.file_name ?? '').trim().slice(0, 255)
  const fileSize = Number(body?.file_size)
  const pageCount = body?.page_count == null ? null : Number(body.page_count)

  if (!fileName || !fileName.toLowerCase().endsWith('.pdf')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only PDF files can be uploaded this way.',
      data: { code: 'INVALID_FILE_TYPE' },
    })
  }
  if (!Number.isInteger(fileSize) || fileSize <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file size.' })
  }
  if (fileSize > KNOWLEDGE_MAX_FILE_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: KNOWLEDGE_TOO_LARGE_MESSAGE,
      data: { code: 'FILE_TOO_LARGE', max_bytes: KNOWLEDGE_MAX_FILE_BYTES },
    })
  }
  if (pageCount !== null && (!Number.isInteger(pageCount) || pageCount < 1)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid page count.' })
  }

  await cleanupStaleKnowledgeUploads(db, orgId)

  // Retrying after a failure must not create a second copy: the same file
  // already finished → refuse; an unfinished earlier attempt of it by this
  // admin (e.g. the page was reloaded mid-upload) → replace it.
  const [sameFile] = await db.execute(
    `SELECT id, upload_status, uploaded_by FROM org_knowledge_files
     WHERE org_id = ? AND file_name = ? AND file_size = ?`,
    [orgId, fileName, fileSize],
  )
  const sameRows = sameFile as { id: number; upload_status: string; uploaded_by: string | null }[]
  if (sameRows.some((r) => r.upload_status === 'completed')) {
    throw createError({
      statusCode: 409,
      statusMessage: `"${fileName}" is already in your AI Knowledge Base. Delete the existing copy first if you want to replace it.`,
      data: { code: 'DUPLICATE_FILE' },
    })
  }
  for (const r of sameRows) {
    if (String(r.uploaded_by) === userId) await deleteUnfinishedKnowledgeUpload(db, r.id)
  }

  const [activeRows] = await db.execute(
    `SELECT COUNT(*) AS active FROM org_knowledge_files WHERE org_id = ? AND upload_status = 'uploading'`,
    [orgId],
  )
  if (Number((activeRows as any[])[0]?.active ?? 0) >= MAX_ACTIVE_UPLOADS_PER_ORG) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many uploads are in progress for your organization. Wait for them to finish, then try again.',
      data: { code: 'TOO_MANY_ACTIVE_UPLOADS' },
    })
  }

  const uploadId = randomUUID()
  const totalChunks = Math.ceil(fileSize / KNOWLEDGE_CHUNK_BYTES)

  const [result] = await db.execute(
    `INSERT INTO org_knowledge_files
      (org_id, file_name, file_ext, mime_type, file_size, file_blob, storage_mode, upload_status,
       upload_id, total_chunks, chunk_size, page_count, text_batches,
       extracted_text, extraction_status, extraction_error, uploaded_by, uploaded_by_name)
     VALUES (?, ?, 'pdf', 'application/pdf', ?, NULL, 'chunked', 'uploading',
             ?, ?, ?, ?, 0,
             NULL, 'pending', NULL, ?, NULL)`,
    [orgId, fileName, fileSize, uploadId, totalChunks, KNOWLEDGE_CHUNK_BYTES, pageCount, userId],
  )

  console.info('[Knowledge Upload] session started', {
    upload_id: uploadId,
    org_id: orgId,
    file_id: (result as any).insertId,
    file_size: fileSize,
    total_chunks: totalChunks,
  })

  return {
    success: true,
    upload_id: uploadId,
    chunk_size: KNOWLEDGE_CHUNK_BYTES,
    total_chunks: totalChunks,
  }
})
