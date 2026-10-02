// server/utils/orgKnowledge.ts
//
// Org-level AI Knowledge Base: lets a client (org admin) upload PDF/.docx/.xlsx
// files from Settings describing how their organization works. The AI chat
// assistant (server/api/rag/query.ts) grounds its "conversation" answers in
// this content — same idea as the rest of the app's keyword-based document
// search (see buildSearchWords in rag/query.ts), not vector/embedding search.
import type { Pool } from 'mysql2/promise'
import type { H3Event } from 'h3'
import { KNOWLEDGE_MAX_FILE_BYTES } from '#shared/knowledgeUpload'
import { resolveTenant } from '~~/server/utils/aiSession'

export const KNOWLEDGE_ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx'] as const
export type KnowledgeAllowedExtension = (typeof KNOWLEDGE_ALLOWED_EXTENSIONS)[number]

// 150 MB overall. Files over ~4 MB can't travel in one request on Vercel
// (HTTP 413 above ~4.5 MB), so large PDFs use the chunked upload under
// server/api/org/knowledge/uploads/ — see shared/knowledgeUpload.ts.
export const MAX_KNOWLEDGE_FILE_BYTES = KNOWLEDGE_MAX_FILE_BYTES

/** In-progress chunked uploads untouched for this long are deleted. */
const STALE_UPLOAD_HOURS = 24
/** Max simultaneous in-progress chunked uploads per organization. */
export const MAX_ACTIVE_UPLOADS_PER_ORG = 3

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// ── Storage errors ──────────────────────────────────────────────────────
// A raw MySQL error thrown out of a handler becomes a bare "500 Server Error"
// with nothing useful for the admin. These map it to a safe message (no SQL,
// host or credentials) and log the real code on the server.

/** MySQL "unknown column" / "no such table": the knowledge migration hasn't been run. */
const MYSQL_SCHEMA_ERRORS = new Set(['ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE'])
/** The MySQL server can't be reached or refused the login. */
const MYSQL_CONNECTION_ERRORS = new Set([
  'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'EHOSTUNREACH',
  'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_CON_COUNT_ERROR', 'ER_DBACCESS_DENIED_ERROR',
])

export const KNOWLEDGE_SCHEMA_OUTDATED_MESSAGE =
  'The AI Knowledge Base storage needs a database update before files can be listed or uploaded. Ask your system administrator to run the AI Knowledge Base migration.'

export function isKnowledgeSchemaError(error: any): boolean {
  return MYSQL_SCHEMA_ERRORS.has(String(error?.code ?? ''))
}

/** Turns any non-HTTP error from the knowledge storage into a safe HTTP error. */
export function toKnowledgeHttpError(error: any, context: string) {
  if (error?.statusCode) return error // already a deliberate createError()
  const code = String(error?.code ?? '')
  console.error(`[orgKnowledge] ${context} failed`, { code, errno: error?.errno, message: error?.sqlMessage ?? error?.message })
  if (MYSQL_SCHEMA_ERRORS.has(code)) {
    console.error('[orgKnowledge] The MySQL database the app is connected to is missing the AI Knowledge Base columns/tables. Run migrations/mysql/2026-09-30_org_knowledge_chunked_uploads.sql on that database (check MYSQL_HOST / MYSQL_DATABASE in the environment to be sure it is the intended one).')
    return createError({ statusCode: 503, statusMessage: KNOWLEDGE_SCHEMA_OUTDATED_MESSAGE, data: { code: 'KNOWLEDGE_SCHEMA_OUTDATED' } })
  }
  if (MYSQL_CONNECTION_ERRORS.has(code)) {
    return createError({
      statusCode: 503,
      statusMessage: 'The file storage server could not be reached. Please try again in a moment.',
      data: { code: 'KNOWLEDGE_STORAGE_UNAVAILABLE' },
    })
  }
  return createError({
    statusCode: 500,
    statusMessage: 'The AI Knowledge Base storage returned an error. Please try again.',
    data: { code: 'KNOWLEDGE_STORAGE_ERROR' },
  })
}

/** defineEventHandler for knowledge endpoints: storage errors never leak out as a bare 500. */
export function defineKnowledgeHandler<T>(context: string, handler: (event: H3Event) => Promise<T>) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      throw toKnowledgeHttpError(error, context)
    }
  })
}

/** Resolves the caller and enforces the knowledge-base rule: org admins (client role) only. */
export async function requireKnowledgeAdmin(event: H3Event) {
  const db = event.context.db as Pool | undefined
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: 'Database connection is not available.' })
  }
  const { orgId, userId, role } = await resolveTenant(event)
  if (role !== 'client') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only an organization admin can manage the AI Knowledge Base.',
    })
  }
  return { db, orgId, userId }
}

export interface KnowledgeUploadRow {
  id: number
  org_id: string
  file_name: string
  file_size: number
  upload_status: string
  upload_id: string
  total_chunks: number
  chunk_size: number
  page_count: number | null
  text_batches: number
  uploaded_by: string | null
}

/**
 * Loads a chunked upload session. Scoped by upload id AND org AND uploader, so
 * a guessed or leaked upload id is useless to anyone else — the caller gets
 * the same 404 whether the session doesn't exist or isn't theirs.
 */
export async function loadKnowledgeUpload(
  db: Pool,
  uploadId: string | undefined,
  orgId: string,
  userId: string,
): Promise<KnowledgeUploadRow> {
  if (!uploadId || !UUID_RE.test(uploadId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid upload id.' })
  }
  const [rows] = await db.execute(
    `SELECT id, org_id, file_name, file_size, upload_status, upload_id, total_chunks, chunk_size,
            page_count, text_batches, uploaded_by
     FROM org_knowledge_files
     WHERE upload_id = ? AND org_id = ? AND uploaded_by = ? AND storage_mode = 'chunked'
     LIMIT 1`,
    [uploadId, orgId, userId],
  )
  const row = (rows as KnowledgeUploadRow[])[0]
  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This upload session no longer exists. It may have expired or been cancelled — please upload the file again.',
      data: { code: 'UPLOAD_SESSION_NOT_FOUND' },
    })
  }
  return row
}

/** Deletes one unfinished upload (chunks cascade). Never touches a completed file. */
export async function deleteUnfinishedKnowledgeUpload(db: Pool, fileId: number) {
  await db.execute(
    `DELETE FROM org_knowledge_files WHERE id = ? AND upload_status <> 'completed'`,
    [fileId],
  )
}

/**
 * Removes this org's abandoned uploads (browser closed mid-upload, network
 * gone for good). There's no cron/queue in this project, so this runs lazily
 * whenever the org lists files or starts a new upload. Completed files are
 * never matched.
 */
export async function cleanupStaleKnowledgeUploads(db: Pool, orgId: string) {
  try {
    await db.execute(
      `DELETE FROM org_knowledge_files
       WHERE org_id = ? AND upload_status <> 'completed'
         AND COALESCE(updated_at, created_at) < (NOW() - INTERVAL ${STALE_UPLOAD_HOURS} HOUR)`,
      [orgId],
    )
  } catch (error) {
    console.warn('[orgKnowledge] Stale upload cleanup failed (non-fatal):', error)
  }
}

export interface OrgKnowledgeFileRow {
  id: number
  file_name: string
  file_ext: string
  mime_type: string | null
  file_size: number | null
  extraction_status: string
  extraction_error: string | null
  uploaded_by_name: string | null
  created_at: string
}

const CHUNK_SIZE = 1400
const CONTEXT_CHAR_BUDGET = 6000
const MAX_CHUNKS = 8

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'has', 'had',
  'was', 'were', 'what', 'how', 'when', 'where', 'why', 'who', 'with', 'from',
  'that', 'this', 'have', 'our', 'your', 'their', 'about', 'does', 'doing',
  'will', 'would', 'could', 'should', 'there', 'here', 'they', 'them', 'then',
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']{3,}/g) ?? []).filter((w) => !STOPWORDS.has(w))
}

interface TextChunk {
  fileName: string
  text: string
}

function chunkDocument(fileName: string, text: string): TextChunk[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const chunks: TextChunk[] = []
  let buffer = ''

  const flush = () => {
    if (buffer.trim()) chunks.push({ fileName, text: buffer.trim() })
    buffer = ''
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > CHUNK_SIZE) {
      flush()
      for (let i = 0; i < paragraph.length; i += CHUNK_SIZE) {
        chunks.push({ fileName, text: paragraph.slice(i, i + CHUNK_SIZE).trim() })
      }
      continue
    }
    if (buffer.length + paragraph.length + 1 > CHUNK_SIZE) flush()
    buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph
  }
  flush()

  return chunks
}

function scoreChunk(chunkTextLower: string, keywords: string[]): number {
  let score = 0
  for (const kw of keywords) {
    if (!chunkTextLower.includes(kw)) continue
    score += 1
    const extra = chunkTextLower.split(kw).length - 2 // occurrences beyond the first
    if (extra > 0) score += Math.min(extra, 3) * 0.25
  }
  return score
}

/**
 * Fetch org-scoped knowledge content relevant to `promptText`, formatted as a
 * single string ready to hand to the LLM as extra grounding context. Returns
 * null when the org has no usable knowledge files (never throws — a lookup
 * failure here should never break the chat turn).
 */
export async function getOrgKnowledgeContext(
  db: Pool | undefined | null,
  orgId: string,
  promptText: string
): Promise<string | null> {
  if (!db || !orgId) return null

  try {
    const [rows] = await db.execute(
      `SELECT file_name, extracted_text FROM org_knowledge_files
       WHERE org_id = ? AND upload_status = 'completed'
         AND extraction_status = 'ready' AND extracted_text IS NOT NULL
       ORDER BY created_at DESC`,
      [orgId]
    )

    const docs = rows as { file_name: string; extracted_text: string }[]
    if (!docs.length) return null

    const allChunks = docs.flatMap((d) => chunkDocument(d.file_name, d.extracted_text || ''))
    if (!allChunks.length) return null

    const keywords = Array.from(new Set(tokenize(promptText)))

    let selected: TextChunk[]
    if (keywords.length > 0) {
      const scored = allChunks
        .map((chunk) => ({ chunk, score: scoreChunk(chunk.text.toLowerCase(), keywords) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)

      selected = scored.slice(0, MAX_CHUNKS).map((s) => s.chunk)
    } else {
      selected = []
    }

    // Fallback: no keyword overlap (or no keywords at all, e.g. "tell me about
    // our organization") — ground with the opening of each document instead
    // of returning nothing.
    if (selected.length === 0) {
      const seen = new Set<string>()
      selected = allChunks.filter((c) => {
        if (seen.has(c.fileName)) return false
        seen.add(c.fileName)
        return true
      })
    }

    let budget = CONTEXT_CHAR_BUDGET
    const parts: string[] = []
    for (const chunk of selected) {
      if (budget <= 0) break
      const block = `### From "${chunk.fileName}"\n${chunk.text}`
      parts.push(block.slice(0, budget))
      budget -= block.length
    }

    return parts.length > 0 ? parts.join('\n\n') : null
  } catch (error) {
    console.warn('[orgKnowledge] Context lookup failed (non-fatal):', error)
    return null
  }
}
