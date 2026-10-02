/**
 * GET /api/org/knowledge/:id/download
 *
 * Streams a completed AI Knowledge Base file back to an org admin — the same
 * people who can list and delete these files. Works for both storage modes:
 *   - 'chunked': chunks are read one at a time, in chunk_index order
 *   - 'blob'   : the single LONGBLOB is read in slices via SUBSTRING
 * so at most one ~3.5 MB piece is in memory at a time. Nothing about the
 * internal storage (chunk rows, ids) is exposed — only the file bytes.
 */
import { Readable } from 'node:stream'
import { KNOWLEDGE_CHUNK_BYTES } from '#shared/knowledgeUpload'
import { requireKnowledgeAdmin, defineKnowledgeHandler } from '~~/server/utils/orgKnowledge'

interface DownloadRow {
  id: number
  file_name: string
  mime_type: string | null
  file_size: number | null
  storage_mode: string
  total_chunks: number | null
  blob_length: number | null
}

function contentDisposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

export default defineKnowledgeHandler('[id]/download.get.ts', async (event) => {
  const { db, orgId } = await requireKnowledgeAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file id.' })
  }

  // org_id in the WHERE clause is the tenant guard: another org's id is a 404.
  const [rows] = await db.execute(
    `SELECT id, file_name, mime_type, file_size, storage_mode, total_chunks,
            CASE WHEN storage_mode = 'blob' THEN LENGTH(file_blob) END AS blob_length
      FROM org_knowledge_files
      WHERE id = ? AND org_id = ? AND upload_status = 'completed'
      LIMIT 1`,
    [id, orgId],
  )
  const found = (rows as DownloadRow[])[0]
  if (!found) {
    throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  }
  const file: DownloadRow = found

  const isChunked = file.storage_mode === 'chunked'
  const size = isChunked ? Number(file.file_size ?? 0) : Number(file.blob_length ?? 0)

  async function* pieces() {
    if (isChunked) {
      for (let i = 0; i < Number(file.total_chunks ?? 0); i++) {
        const [chunkRows] = await db.execute(
          'SELECT chunk_data FROM org_knowledge_file_chunks WHERE file_id = ? AND chunk_index = ?',
          [file.id, i],
        )
        const chunk = (chunkRows as { chunk_data: Buffer }[])[0]
        // A missing chunk means the stored file is damaged — abort the stream
        // rather than silently sending a truncated PDF.
        if (!chunk) throw new Error(`Knowledge file ${file.id} is missing chunk ${i}`)
        yield Buffer.from(chunk.chunk_data)
      }
      return
    }
    for (let offset = 0; offset < size; offset += KNOWLEDGE_CHUNK_BYTES) {
      const [sliceRows] = await db.execute(
        'SELECT SUBSTRING(file_blob, ?, ?) AS piece FROM org_knowledge_files WHERE id = ?',
        [offset + 1, KNOWLEDGE_CHUNK_BYTES, file.id],
      )
      yield Buffer.from((sliceRows as { piece: Buffer }[])[0]!.piece)
    }
  }

  setResponseHeaders(event, {
    'Content-Type': file.mime_type || 'application/octet-stream',
    'Content-Length': String(size),
    'Content-Disposition': contentDisposition(file.file_name),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })

  const stream = Readable.from(pieces())
  stream.on('error', (error) => {
    console.error('[Knowledge Download] stream failed', { file_id: file.id, org_id: orgId, error: error.message })
  })
  return sendStream(event, stream)
})
