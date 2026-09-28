import Groq from 'groq-sdk'
import { extractTextFromFile } from '~~/server/utils/documentParser'

export interface DocumentAnalysis {
  title: string
  description: string
  status: 'SUCCESS' | 'FAILED' | 'EMPTY_CONTENT'
}

const FALLBACK_TEXT = {
  title: 'Untitled Document',
  description: 'The document contents could not be automatically analyzed. Please review and update the details manually.',
}

const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/json': '.json',
}

const resolveExtension = (mimeType: string): string => {
  return MIME_TO_EXTENSION[mimeType?.toLowerCase?.()] || '.txt'
}

const normalizeAnalysis = (raw: any): Omit<DocumentAnalysis, 'status'> => {
  const title = typeof raw?.title === 'string' && raw.title.trim()
    ? raw.title.trim()
    : FALLBACK_TEXT.title

  const description = typeof raw?.description === 'string' && raw.description.trim()
    ? raw.description.trim()
    : FALLBACK_TEXT.description

  return { title, description }
}

// Groq retired `llama-3.3-70b-versatile` for free/developer accounts on
// 2026-08-16 — every call was throwing (404) and getting silently caught
// below, which is why uploads were saving as "Untitled Document" with no
// visible error anywhere. If Groq retires this one too, the error logging
// in the catch blocks below will now actually surface it.
const GROQ_MODEL = 'openai/gpt-oss-120b'

/**
 * Analyze raw extracted document text and return a clean title + 2-sentence summary.
 * Kept for backward compatibility with existing callers.
 */
export const analyzeDocument = async (text: string): Promise<DocumentAnalysis> => {
  const trimmed = (text || '').trim()
  if (!trimmed) return { ...FALLBACK_TEXT, status: 'EMPTY_CONTENT' }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.2,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content:
            "You analyze documents. Return ONLY a JSON object with two string keys: 'title' and 'description'. " +
            "The 'title' is a concise, human-readable document title. " +
            "The 'description' is a precise summary of EXACTLY two sentences. " +
            "If the content is unreadable, encrypted, or empty, use 'Untitled Document' for title and explain that the content could not be read in the description.",
        },
        { role: 'user', content: `Document Content:\n${trimmed}` },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content || '{}'
    return { ...normalizeAnalysis(JSON.parse(content)), status: 'SUCCESS' }
  } catch (error: any) {
    console.error(
      '[aiAnalyzer] analyzeDocument failed:',
      error?.status ?? '', error?.message ?? error, error?.error ?? '',
    )
    return { ...FALLBACK_TEXT, status: 'FAILED' }
  }
}

/**
 * Extract text from a raw file buffer (by mime type) and run AI analysis.
 * Always resolves with a usable { title, description } payload, even on failure.
 */
export async function analyzeDocumentBuffer(
  fileBuffer: Buffer,
  mimeType: string
): Promise<DocumentAnalysis> {
  if (!fileBuffer || !fileBuffer.length) {
    return { ...FALLBACK_TEXT, status: 'EMPTY_CONTENT' }
  }

  try {
    const extractedText = await extractTextFromFile({
      filename: `document${resolveExtension(mimeType)}`,
      data: fileBuffer,
    })

    const context = extractedText?.trim() || ''
    if (!context) return { ...FALLBACK_TEXT, status: 'EMPTY_CONTENT' }

    return await analyzeDocument(context)
  } catch (error: any) {
    console.error('[aiAnalyzer] analyzeDocumentBuffer failed:', error?.message ?? error)
    return { ...FALLBACK_TEXT, status: 'FAILED' }
  }
}
