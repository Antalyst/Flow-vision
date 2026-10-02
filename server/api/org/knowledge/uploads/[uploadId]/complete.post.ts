/**
 * POST /api/org/knowledge/uploads/:uploadId/complete
 *
 * Finalizes a chunked PDF upload. All checks run in MySQL — the file is never
 * loaded into this function:
 *   - every chunk 0..total_chunks-1 is present and sizes add up to file_size
 *   - the file ends with a PDF trailer (%%EOF) — the first chunk's %PDF-
 *     header was already checked on upload
 *   - all extracted-text batches arrived and the text isn't empty
 * Only then does the file flip to upload_status='completed' and become visible
 * to the knowledge list and the AI.
 *
 * Body: { text_batches: number }  (how many text batches the browser sent)
 *
 * Idempotent: finalizing an already-completed upload returns the same result.
 * Missing chunks/text → 409 (the browser can resend them and retry).
 * Corrupt file / no text → 422 and the upload is deleted (nothing half-done
 * stays behind).
 */
import { KNOWLEDGE_SCANNED_PDF_MESSAGE, KNOWLEDGE_INVALID_PDF_MESSAGE } from '#shared/knowledgeUpload'
import {
  deleteUnfinishedKnowledgeUpload,
  loadKnowledgeUpload,
  requireKnowledgeAdmin,
  defineKnowledgeHandler,
} from '~~/server/utils/orgKnowledge'

const PDF_TRAILER = Buffer.from('%%EOF')
/** A valid PDF's %%EOF marker sits in its last few bytes; allow trailing padding. */
const TRAILER_WINDOW = 2048

export default defineKnowledgeHandler('uploads/[uploadId]/complete.post.ts', async (event) => {
  const { db, orgId, userId } = await requireKnowledgeAdmin(event)
  const upload = await loadKnowledgeUpload(db, getRouterParam(event, 'uploadId'), orgId, userId)
  const body = await readBody(event)
  const expectedTextBatches = Number(body?.text_batches)

  const fileSummary = () => ({
    id: upload.id,
    file_name: upload.file_name,
    file_ext: 'pdf',
    mime_type: 'application/pdf',
    file_size: upload.file_size,
    page_count: upload.page_count,
    extraction_status: 'ready',
  })

  if (upload.upload_status === 'completed') {
    return { success: true, message: `"${upload.file_name}" was uploaded and is ready for the AI to use.`, file: fileSummary() }
  }
  if (upload.upload_status !== 'uploading') {
    throw createError({ statusCode: 409, statusMessage: 'This upload can no longer be completed.', data: { code: 'UPLOAD_NOT_OPEN' } })
  }

  const log = (stage: string, extra: Record<string, unknown> = {}) =>
    console.warn('[Knowledge Upload] finalize rejected', {
      upload_id: upload.upload_id, org_id: orgId, file_size: upload.file_size, stage, ...extra,
    })

  // 1. Every chunk present, sizes add up.
  const [chunkRows] = await db.execute(
    `SELECT chunk_index FROM org_knowledge_file_chunks WHERE file_id = ? ORDER BY chunk_index`,
    [upload.id],
  )
  const received = new Set((chunkRows as { chunk_index: number }[]).map((r) => r.chunk_index))
  const missing: number[] = []
  for (let i = 0; i < upload.total_chunks; i++) if (!received.has(i)) missing.push(i)
  if (missing.length) {
    log('missing_chunks', { missing_count: missing.length })
    throw createError({
      statusCode: 409,
      statusMessage: 'Some parts of the file have not arrived yet. Please retry the upload.',
      data: { code: 'MISSING_CHUNKS', missing },
    })
  }

  const [sumRows] = await db.execute(
    `SELECT COALESCE(SUM(chunk_size), 0) AS total FROM org_knowledge_file_chunks WHERE file_id = ?`,
    [upload.id],
  )
  if (Number((sumRows as any[])[0]?.total ?? 0) !== upload.file_size) {
    log('size_mismatch')
    await deleteUnfinishedKnowledgeUpload(db, upload.id)
    throw createError({ statusCode: 422, statusMessage: KNOWLEDGE_INVALID_PDF_MESSAGE, data: { code: 'INVALID_PDF' } })
  }

  // 2. PDF trailer in the file's last bytes (may span the last two chunks).
  const [tailRows] = await db.execute(
    `SELECT chunk_index, SUBSTRING(chunk_data, GREATEST(1, chunk_size - ? + 1)) AS tail
     FROM org_knowledge_file_chunks
     WHERE file_id = ? AND chunk_index >= ?
     ORDER BY chunk_index`,
    [TRAILER_WINDOW, upload.id, Math.max(0, upload.total_chunks - 2)],
  )
  const tail = Buffer.concat((tailRows as { tail: Buffer }[]).map((r) => Buffer.from(r.tail)))
  if (!tail.subarray(-TRAILER_WINDOW).includes(PDF_TRAILER)) {
    log('missing_pdf_trailer')
    await deleteUnfinishedKnowledgeUpload(db, upload.id)
    throw createError({ statusCode: 422, statusMessage: KNOWLEDGE_INVALID_PDF_MESSAGE, data: { code: 'INVALID_PDF' } })
  }

  // 3. All text batches arrived, and there is real text.
  if (!Number.isInteger(expectedTextBatches) || expectedTextBatches < 1 || upload.text_batches !== expectedTextBatches) {
    log('missing_text', { text_batches: upload.text_batches, expected: expectedTextBatches })
    throw createError({
      statusCode: 409,
      statusMessage: 'Some of the extracted text has not arrived yet. Please retry the upload.',
      data: { code: 'MISSING_TEXT', text_batches: upload.text_batches },
    })
  }
  const [textRows] = await db.execute(
    `SELECT CHAR_LENGTH(TRIM(COALESCE(extracted_text, ''))) AS len FROM org_knowledge_files WHERE id = ?`,
    [upload.id],
  )
  if (Number((textRows as any[])[0]?.len ?? 0) === 0) {
    log('no_text')
    await deleteUnfinishedKnowledgeUpload(db, upload.id)
    throw createError({ statusCode: 422, statusMessage: KNOWLEDGE_SCANNED_PDF_MESSAGE, data: { code: 'NO_TEXT' } })
  }

  // 4. Publish. The status guard makes a concurrent double-finalize harmless.
  await db.execute(
    `UPDATE org_knowledge_files
     SET upload_status = 'completed', extraction_status = 'ready', extraction_error = NULL
     WHERE id = ? AND upload_status = 'uploading'`,
    [upload.id],
  )

  console.info('[Knowledge Upload] completed', {
    upload_id: upload.upload_id, org_id: orgId, file_id: upload.id, file_size: upload.file_size,
    total_chunks: upload.total_chunks, page_count: upload.page_count,
  })

  return {
    success: true,
    message: `"${upload.file_name}" was uploaded and is ready for the AI to use.`,
    file: fileSummary(),
  }
})
