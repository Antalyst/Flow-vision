// Limits and user-facing messages for AI Knowledge Base uploads, shared by the
// Settings page (app/) and the upload API (server/) so they can't drift apart.

/** Largest file accepted at all. */
export const KNOWLEDGE_MAX_FILE_BYTES = 150 * 1024 * 1024

/**
 * Largest file sent in ONE request (the original /api/org/knowledge/upload
 * path). Vercel rejects request bodies over ~4.5 MB with HTTP 413 before the
 * app runs, so anything bigger must use the chunked PDF upload.
 */
export const KNOWLEDGE_SINGLE_REQUEST_MAX_BYTES = 4 * 1024 * 1024

/** Size of each chunk in a chunked upload — comfortably under Vercel's limit. */
export const KNOWLEDGE_CHUNK_BYTES = 3.5 * 1024 * 1024

/** Max characters of extracted text kept per file (same cap as server-side extraction). */
export const KNOWLEDGE_TEXT_CAP = 5_000_000

/** Max characters of extracted text sent per request (≤ ~2 MB of UTF-8). */
export const KNOWLEDGE_TEXT_BATCH_CHARS = 500_000

export const KNOWLEDGE_TOO_LARGE_MESSAGE =
  'The selected file exceeds the 150 MB upload limit. Please choose a smaller file.'

export const KNOWLEDGE_SCANNED_PDF_MESSAGE =
  'This PDF appears to contain scanned images rather than selectable text. ' +
  'OCR (reading text from images) is not supported yet, so it can\'t be added to the AI Knowledge Base.'

export const KNOWLEDGE_ENCRYPTED_PDF_MESSAGE =
  'This PDF is password-protected, so its text can\'t be read. Remove the password and upload it again.'

export const KNOWLEDGE_INVALID_PDF_MESSAGE =
  'This file is not a valid PDF or is damaged. Please check the file and try again.'

export function formatKnowledgeLimitMb(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}
