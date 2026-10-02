/**
 * POST /api/org/knowledge/uploads/:uploadId/text
 *
 * Appends one ordered batch of the PDF's extracted text. The text is read in
 * the admin's browser with pdf.js (the server never holds the whole PDF), so
 * it is stored as admin-provided knowledge content — the server cannot verify
 * it against the PDF bytes.
 *
 * Body: { batch_index: number, text: string }
 * Batches must arrive in order (0, 1, 2 …). Re-sending an already-applied
 * batch is a no-op, so a retry after a lost response never duplicates text.
 */
import { KNOWLEDGE_TEXT_BATCH_CHARS, KNOWLEDGE_TEXT_CAP } from '#shared/knowledgeUpload'
import { loadKnowledgeUpload, requireKnowledgeAdmin, defineKnowledgeHandler } from '~~/server/utils/orgKnowledge'

export default defineKnowledgeHandler('uploads/[uploadId]/text.post.ts', async (event) => {
  const { db, orgId, userId } = await requireKnowledgeAdmin(event)
  const upload = await loadKnowledgeUpload(db, getRouterParam(event, 'uploadId'), orgId, userId)

  if (upload.upload_status !== 'uploading') {
    throw createError({
      statusCode: 409,
      statusMessage: 'This upload is already finished and can no longer receive data.',
      data: { code: 'UPLOAD_NOT_OPEN' },
    })
  }

  const body = await readBody(event)
  const batchIndex = Number(body?.batch_index)
  const text = typeof body?.text === 'string' ? body.text : null

  if (!Number.isInteger(batchIndex) || batchIndex < 0 || text === null) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid text batch.' })
  }
  if (text.length > KNOWLEDGE_TEXT_BATCH_CHARS) {
    throw createError({ statusCode: 413, statusMessage: 'Text batch is too large.' })
  }

  // Already applied (the response to an earlier attempt was lost) — no-op.
  if (batchIndex < upload.text_batches) {
    return { success: true, text_batches: upload.text_batches }
  }
  if (batchIndex > upload.text_batches) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Text batches arrived out of order. Please retry.',
      data: { code: 'TEXT_BATCH_OUT_OF_ORDER', expected: upload.text_batches },
    })
  }

  const [lenRows] = await db.execute(
    'SELECT CHAR_LENGTH(COALESCE(extracted_text, \'\')) AS len FROM org_knowledge_files WHERE id = ?',
    [upload.id],
  )
  const currentLength = Number((lenRows as any[])[0]?.len ?? 0)
  if (currentLength + text.length > KNOWLEDGE_TEXT_CAP) {
    throw createError({ statusCode: 413, statusMessage: 'Extracted text exceeds the allowed size.' })
  }

  // The text_batches guard makes concurrent/duplicate appends impossible.
  const [result] = await db.execute(
    `UPDATE org_knowledge_files
     SET extracted_text = CONCAT(COALESCE(extracted_text, ''), ?), text_batches = text_batches + 1
     WHERE id = ? AND text_batches = ? AND upload_status = 'uploading'`,
    [text, upload.id, batchIndex],
  )
  if ((result as any).affectedRows === 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Text batches arrived out of order. Please retry.',
      data: { code: 'TEXT_BATCH_OUT_OF_ORDER' },
    })
  }

  return { success: true, text_batches: batchIndex + 1 }
})
