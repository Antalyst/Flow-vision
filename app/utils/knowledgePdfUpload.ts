// Chunked PDF upload for the AI Knowledge Base (files over 4 MB, up to 150 MB).
//
// Vercel rejects request bodies over ~4.5 MB (HTTP 413), so a large PDF is:
//   1. opened and read page-by-page in THIS browser with pdf.js (loaded only
//      when needed) — rejects password-protected, damaged and image-only PDFs
//      before anything is sent
//   2. sent as 3.5 MB chunks, each with a SHA-256 the server re-checks
//   3. followed by its extracted text, in ordered batches
//   4. finalized — only then does it appear in the knowledge list / reach the AI
// A failed network step keeps the server-side session so "Retry" resumes by
// sending only what's missing.
import {
  KNOWLEDGE_ENCRYPTED_PDF_MESSAGE,
  KNOWLEDGE_INVALID_PDF_MESSAGE,
  KNOWLEDGE_SCANNED_PDF_MESSAGE,
  KNOWLEDGE_TEXT_BATCH_CHARS,
  KNOWLEDGE_TEXT_CAP,
} from '#shared/knowledgeUpload'

export type KnowledgeUploadStage =
  | 'reading'
  | 'uploading'
  | 'saving'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface KnowledgeUploadProgress {
  stage: KnowledgeUploadStage
  pagesRead: number
  pageCount: number
  bytesSent: number
  totalBytes: number
}

export class KnowledgeUploadError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly code?: string) {
    super(message)
    this.name = 'KnowledgeUploadError'
  }
}

/** Server-side state of one upload; kept between attempts so Retry can resume. */
export interface KnowledgePdfUploadJob {
  file: File
  uploadId: string | null
  text: string | null
  pageCount: number
}

export function createKnowledgePdfUploadJob(file: File): KnowledgePdfUploadJob {
  return { file, uploadId: null, text: null, pageCount: 0 }
}

// Plain-string wrapper around $fetch: Nuxt's typed-route inference on these
// dynamic URLs exceeds the TypeScript compiler's depth limit.
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}
const request = $fetch as unknown as <T = unknown>(url: string, options?: RequestOptions) => Promise<T>

/** Fewer non-whitespace characters than this across the whole PDF = no usable text. */
const MIN_USEFUL_CHARS = 20
const RETRY_DELAYS_MS = [1000, 3000, 6000]
const NOT_RETRYABLE_CODES = new Set(['KNOWLEDGE_SCHEMA_OUTDATED', 'DUPLICATE_FILE'])
const ABORTED = 'The upload was cancelled.'

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new KnowledgeUploadError(ABORTED, false, 'CANCELLED')
}

async function sleep(ms: number, signal: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new KnowledgeUploadError(ABORTED, false, 'CANCELLED'))
    }, { once: true })
  })
}

async function sha256Hex(data: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Turns an ofetch error into a KnowledgeUploadError with the server's real message. */
function toUploadError(err: any, signal: AbortSignal): KnowledgeUploadError {
  if (err instanceof KnowledgeUploadError) return err
  if (signal.aborted) return new KnowledgeUploadError(ABORTED, false, 'CANCELLED')
  const status: number | undefined = err?.statusCode ?? err?.response?.status
  const code: string | undefined = err?.data?.data?.code
  const serverMessage: string | undefined = err?.data?.statusMessage || err?.data?.message
  if (!status) {
    return new KnowledgeUploadError('Network connection lost. Check your connection and press Retry to continue the upload.', true, 'NETWORK')
  }
  if (status === 413 && !serverMessage) {
    return new KnowledgeUploadError('The server rejected the request as too large.', false, 'PAYLOAD_TOO_LARGE')
  }
  // Retrying can't fix a missing migration or a duplicate file — fail at once
  // instead of repeating the request.
  const retryable = !NOT_RETRYABLE_CODES.has(code ?? '') &&
    (status >= 500 || status === 408 || status === 429 || status === 409)
  return new KnowledgeUploadError(serverMessage || `Upload failed (HTTP ${status}).`, retryable, code)
}

async function withRetry<T>(fn: () => Promise<T>, signal: AbortSignal): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    throwIfAborted(signal)
    try {
      return await fn()
    } catch (err) {
      const error = toUploadError(err, signal)
      if (!error.retryable || error.code === 'MISSING_CHUNKS' || attempt >= RETRY_DELAYS_MS.length) throw error
      await sleep(RETRY_DELAYS_MS[attempt]!, signal)
    }
  }
}

/** Reads every page's text with pdf.js, in page order. */
async function extractPdfText(
  file: File,
  signal: AbortSignal,
  onPage: (pagesRead: number, pageCount: number) => void,
): Promise<{ text: string; pageCount: number }> {
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  if (String.fromCharCode(...header) !== '%PDF-') {
    throw new KnowledgeUploadError(KNOWLEDGE_INVALID_PDF_MESSAGE, false, 'INVALID_PDF')
  }

  const pdfjs = await import('pdfjs-dist')
  const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  throwIfAborted(signal)

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false })
  const onAbort = () => { void task.destroy() }
  signal.addEventListener('abort', onAbort, { once: true })

  let doc: Awaited<typeof task.promise> | null = null
  try {
    try {
      doc = await task.promise
    } catch (err: any) {
      throwIfAborted(signal)
      if (err?.name === 'PasswordException') {
        throw new KnowledgeUploadError(KNOWLEDGE_ENCRYPTED_PDF_MESSAGE, false, 'ENCRYPTED_PDF')
      }
      throw new KnowledgeUploadError(KNOWLEDGE_INVALID_PDF_MESSAGE, false, 'INVALID_PDF')
    }

    const pageCount = doc.numPages
    const pages: string[] = []
    let length = 0
    for (let p = 1; p <= pageCount; p++) {
      throwIfAborted(signal)
      // Past the text cap there's no point reading further pages.
      if (length < KNOWLEDGE_TEXT_CAP) {
        const page = await doc.getPage(p)
        const content = await page.getTextContent()
        let pageText = ''
        for (const item of content.items) {
          if ('str' in item) {
            pageText += item.str
            if (item.hasEOL) pageText += '\n'
          }
        }
        page.cleanup()
        pages.push(pageText)
        length += pageText.length + 2
      }
      onPage(p, pageCount)
    }

    // Same normalization as server-side extraction (documentParser.ts).
    const text = pages
      .join('\n\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, KNOWLEDGE_TEXT_CAP)

    if (text.replace(/\s/g, '').length < MIN_USEFUL_CHARS) {
      throw new KnowledgeUploadError(KNOWLEDGE_SCANNED_PDF_MESSAGE, false, 'NO_TEXT')
    }
    return { text, pageCount }
  } catch (err) {
    if (err instanceof KnowledgeUploadError) throw err
    throwIfAborted(signal)
    throw new KnowledgeUploadError(KNOWLEDGE_INVALID_PDF_MESSAGE, false, 'INVALID_PDF')
  } finally {
    signal.removeEventListener('abort', onAbort)
    if (doc) void doc.destroy()
  }
}

/** Splits text into ordered batches without cutting a UTF-16 surrogate pair in half. */
function splitTextBatches(text: string): string[] {
  const batches: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + KNOWLEDGE_TEXT_BATCH_CHARS, text.length)
    const code = text.charCodeAt(end - 1)
    if (end < text.length && code >= 0xd800 && code <= 0xdbff) end -= 1
    batches.push(text.slice(start, end))
    start = end
  }
  return batches
}

/** Best-effort removal of an unfinished upload (cancel / unrecoverable failure). */
export async function discardKnowledgePdfUpload(job: KnowledgePdfUploadJob) {
  const uploadId = job.uploadId
  job.uploadId = null
  if (!uploadId) return
  try {
    await request(`/api/org/knowledge/uploads/${uploadId}`, { method: 'DELETE' })
  } catch {
    // Anything left behind is removed by the server's 24-hour stale-upload cleanup.
  }
}

/**
 * Runs (or resumes) a chunked PDF upload. Resolves with the server's success
 * message once the file is fully stored AND finalized. Throws
 * KnowledgeUploadError; if `retryable`, calling this again with the same job
 * resumes where it stopped.
 */
export async function runKnowledgePdfUpload(
  job: KnowledgePdfUploadJob,
  options: { signal: AbortSignal; onProgress: (progress: KnowledgeUploadProgress) => void },
): Promise<string> {
  const { signal, onProgress } = options
  const totalBytes = job.file.size
  const progress: KnowledgeUploadProgress = {
    stage: 'reading', pagesRead: 0, pageCount: job.pageCount, bytesSent: 0, totalBytes,
  }
  const emit = (patch: Partial<KnowledgeUploadProgress>) => {
    Object.assign(progress, patch)
    onProgress({ ...progress })
  }

  try {
    // 1. Read the text first: unreadable PDFs are rejected before any upload.
    if (job.text === null) {
      emit({ stage: 'reading' })
      const { text, pageCount } = await extractPdfText(job.file, signal, (pagesRead, count) => {
        emit({ pagesRead, pageCount: count })
      })
      job.text = text
      job.pageCount = pageCount
    }
    emit({ stage: 'uploading', pagesRead: job.pageCount, pageCount: job.pageCount })

    // 2. Open (or reuse) the server-side upload session.
    if (!job.uploadId) {
      const started = await withRetry(() => request<{ upload_id: string }>('/api/org/knowledge/uploads', {
        method: 'POST',
        body: { file_name: job.file.name, file_size: job.file.size, page_count: job.pageCount },
        signal,
      }), signal)
      job.uploadId = started.upload_id
    }
    const base = `/api/org/knowledge/uploads/${job.uploadId}`

    // 3. Resume: ask what the server already has.
    const status = await withRetry(() => request<{
      upload_status: string
      total_chunks: number
      chunk_size: number
      received_chunks: number[]
      text_batches: number
    }>(base, { signal }), signal)

    const received = new Set(status.received_chunks)
    const chunkSize = status.chunk_size
    const lastChunkSize = totalBytes - chunkSize * (status.total_chunks - 1)
    let bytesSent = status.received_chunks.reduce(
      (sum, i) => sum + (i === status.total_chunks - 1 ? lastChunkSize : chunkSize), 0,
    )
    emit({ bytesSent })

    // 4. Chunks, one at a time (the database, not the network, is the bottleneck).
    for (let i = 0; i < status.total_chunks; i++) {
      if (received.has(i)) continue
      const data = await job.file.slice(i * chunkSize, Math.min((i + 1) * chunkSize, totalBytes)).arrayBuffer()
      const hash = await sha256Hex(data)
      await withRetry(() => request(`${base}/chunks/${i}`, {
        method: 'PUT',
        body: data,
        headers: { 'Content-Type': 'application/octet-stream', 'X-Chunk-SHA256': hash },
        signal,
      }), signal)
      bytesSent += data.byteLength
      emit({ bytesSent })
    }

    // 5. Extracted text, in order (batches already applied are skipped).
    emit({ stage: 'saving' })
    const batches = splitTextBatches(job.text)
    for (let b = status.text_batches; b < batches.length; b++) {
      await withRetry(() => request(`${base}/text`, {
        method: 'POST',
        body: { batch_index: b, text: batches[b] },
        signal,
      }), signal)
    }

    // 6. Finalize — the server verifies everything before publishing the file.
    emit({ stage: 'finalizing' })
    const done = await withRetry(() => request<{ message: string }>(`${base}/complete`, {
      method: 'POST',
      body: { text_batches: batches.length },
      signal,
    }), signal)

    job.uploadId = null
    emit({ stage: 'completed' })
    return done.message
  } catch (err) {
    const error = toUploadError(err, signal)
    // Not recoverable by retrying (or server already deleted it): drop the
    // session so nothing incomplete lingers, and start fresh next time.
    if (!error.retryable) {
      if (error.code === 'UPLOAD_SESSION_NOT_FOUND' || error.code === 'INVALID_PDF' || error.code === 'NO_TEXT') {
        job.uploadId = null
      }
      await discardKnowledgePdfUpload(job)
    }
    throw error
  }
}
