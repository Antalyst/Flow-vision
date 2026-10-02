/**
 * PUT /api/org/knowledge/uploads/:uploadId/chunks/:index
 *
 * Stores one chunk of a chunked PDF upload. Body is the raw chunk bytes
 * (Content-Type: application/octet-stream, ≤ 3.5 MB — under Vercel's ~4.5 MB
 * request limit). Header `X-Chunk-SHA256` carries the browser-computed hash.
 *
 * Chunks are stored permanently, in order, in org_knowledge_file_chunks; the
 * file is never reassembled in a serverless function. Re-sending a chunk
 * (retry after a network error) simply replaces it, so retries are safe.
 */
import { createHash } from 'node:crypto'
import { loadKnowledgeUpload, requireKnowledgeAdmin, defineKnowledgeHandler } from '~~/server/utils/orgKnowledge'

const PDF_MAGIC = Buffer.from('%PDF-')

export default defineKnowledgeHandler('uploads/[uploadId]/chunks/[index].put.ts', async (event) => {
  const { db, orgId, userId } = await requireKnowledgeAdmin(event)
  const upload = await loadKnowledgeUpload(db, getRouterParam(event, 'uploadId'), orgId, userId)

  if (upload.upload_status !== 'uploading') {
    throw createError({
      statusCode: 409,
      statusMessage: 'This upload is already finished and can no longer receive data.',
      data: { code: 'UPLOAD_NOT_OPEN' },
    })
  }

  const index = Number(getRouterParam(event, 'index'))
  if (!Number.isInteger(index) || index < 0 || index >= upload.total_chunks) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid chunk index.', data: { code: 'INVALID_CHUNK' } })
  }

  const isLast = index === upload.total_chunks - 1
  const expectedSize = isLast
    ? upload.file_size - upload.chunk_size * (upload.total_chunks - 1)
    : upload.chunk_size

  const declaredLength = Number(getRequestHeader(event, 'content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > upload.chunk_size) {
    throw createError({ statusCode: 413, statusMessage: 'Chunk is larger than allowed.', data: { code: 'CHUNK_TOO_LARGE' } })
  }

  const data = await readRawBody(event, false)
  if (!data || data.length !== expectedSize) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Chunk size does not match the expected size. The upload may have been interrupted — please retry.',
      data: { code: 'CHUNK_SIZE_MISMATCH', expected: expectedSize, received: data?.length ?? 0 },
    })
  }

  const declaredHash = String(getRequestHeader(event, 'x-chunk-sha256') ?? '').toLowerCase()
  const actualHash = createHash('sha256').update(data).digest('hex')
  if (!/^[0-9a-f]{64}$/.test(declaredHash) || declaredHash !== actualHash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Chunk data was corrupted in transit. Please retry.',
      data: { code: 'CHUNK_HASH_MISMATCH' },
    })
  }

  if (index === 0 && !data.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'This file is not a valid PDF.',
      data: { code: 'INVALID_PDF' },
    })
  }

  try {
    await db.execute(
      `INSERT INTO org_knowledge_file_chunks (file_id, chunk_index, chunk_data, chunk_size, sha256)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE chunk_data = VALUES(chunk_data), chunk_size = VALUES(chunk_size), sha256 = VALUES(sha256)`,
      [upload.id, index, data, data.length, actualHash],
    )
    // Keeps the session "alive" for the stale-upload cleanup.
    await db.execute('UPDATE org_knowledge_files SET updated_at = NOW() WHERE id = ?', [upload.id])
  } catch (error) {
    console.error('[Knowledge Upload] chunk store failed', {
      upload_id: upload.upload_id,
      org_id: orgId,
      chunk_index: index,
      stage: 'chunk',
      error: (error as Error)?.message,
    })
    throw createError({
      statusCode: 503,
      statusMessage: 'The server could not save part of the file. Please retry.',
      data: { code: 'STORAGE_FAILED' },
    })
  }

  return { success: true, chunk_index: index }
})
