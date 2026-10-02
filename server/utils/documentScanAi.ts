/**
 * server/utils/documentScanAi.ts
 *
 * Groq Vision TITLE SUGGESTION for physically-scanned documents (camera capture
 * pipeline). The scanner is a document-creation feature and the AI's only job
 * in it is to propose a concise title from the scanned content. It never sets
 * category, offices, route, priority, owner, status, liaison or any other
 * metadata — the user fills those in and confirms registration themselves.
 * Reuses the project's existing lazy Groq client (`useGroq`) — this is NOT a
 * second AI provider, just a vision-capable model call against the same Groq
 * account used everywhere else in FlowVision.
 *
 * The text-only model used by `aiAnalyzer.ts` (`llama-3.3-70b-versatile`) cannot
 * read images, so a vision-capable model is required here. Groq vision models
 * are addressed via env override (GROQ_VISION_MODEL) with in-repo fallbacks,
 * mirroring the candidate-model retry pattern already used in `rag/query.ts`.
 */

import { useGroq } from '~~/server/utils/groq'

export type ScanMode = 'FIRST_PAGE' | 'FULL_DOCUMENT'

/** The AI's whole output for a scan: a suggested title (stored in document_ai_analysis.title). */
export interface ScanTitleSuggestion {
  model: string
  title: string | null
  confidence: number // 0-100: how legible/clear the title source was
  raw_response: Record<string, unknown>
}

/** Longest title the AI may propose (the form's title field allows 200). */
export const MAX_SUGGESTED_TITLE_LENGTH = 150

const MAX_PAGES_SENT_TO_AI = 6

// Groq vision models degrade/rotate faster than text models — try the configured
// one first, then the known-good fallbacks, exactly like rag/query.ts already does
// for its text models.
function candidateVisionModels(): string[] {
  return Array.from(
    new Set(
      [
        process.env.GROQ_VISION_MODEL,
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'meta-llama/llama-4-maverick-17b-128e-instruct',
      ].filter((m): m is string => !!m),
    ),
  )
}

function toDataUrl(image: { data: Buffer; mimeType: string }): string {
  const mime = image.mimeType?.startsWith('image/') ? image.mimeType : 'image/jpeg'
  return `data:${mime};base64,${image.data.toString('base64')}`
}

const SYSTEM_PROMPT = `You are helping an office worker register a PHYSICAL paper document they
photographed. Your ONLY task is to suggest a short, meaningful TITLE for it.

RULES:
- Base the title only on text that is visibly legible in the image(s).
- Prefer the document's own heading or subject line; otherwise summarise what
  the document is in a few words (e.g. "Request for Leave of Absence – J. Cruz").
- At most 12 words. No quotes, no trailing period.
- If nothing legible identifies the document, return null — never invent one.
- Do NOT output any other field: no category, office, recipient, route,
  priority, date, status or summary.

Return ONLY a JSON object: { "title": string|null, "confidence": number }   // confidence 0-100`

/** Keeps only the title (and confidence); anything else the model returns is dropped. */
export function normalizeTitleSuggestion(raw: any, model: string): ScanTitleSuggestion {
  let title = typeof raw?.title === 'string' ? raw.title.replace(/\s+/g, ' ').trim() : ''
  title = title.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').replace(/\.$/, '').trim()
  if (title.length > MAX_SUGGESTED_TITLE_LENGTH) title = title.slice(0, MAX_SUGGESTED_TITLE_LENGTH).trim()

  const confidenceRaw = Number(raw?.confidence)
  const confidence = Number.isFinite(confidenceRaw) ? Math.min(100, Math.max(0, confidenceRaw)) : 0

  return {
    model,
    title: title || null,
    confidence,
    raw_response: { title: title || null, confidence },
  }
}

/**
 * Sends 1..N captured page photos to a Groq vision model and returns a suggested
 * title (never invented). Throws on total failure (all candidate models exhausted)
 * so the caller can mark the scan session FAILED and let the user retry or
 * continue manually — the caller must NOT discard the captured images on error.
 */
export async function suggestScannedDocumentTitle(
  images: { data: Buffer; mimeType: string }[],
  scanMode: ScanMode,
): Promise<ScanTitleSuggestion> {
  if (!images.length) {
    throw createError({ statusCode: 400, message: 'No scanned pages were provided for AI analysis.' })
  }

  // Defensive cap: regardless of what the caller sends, FIRST_PAGE analysis must
  // never look at more than the one page it claims to have scanned.
  const usedPages = scanMode === 'FIRST_PAGE' ? images.slice(0, 1) : images.slice(0, MAX_PAGES_SENT_TO_AI)
  const groq = useGroq()

  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text:
        scanMode === 'FIRST_PAGE'
          ? 'Only the FIRST PAGE of this physical document was scanned. Suggest its title from this one image.'
          : `${usedPages.length} page(s) of this physical document were scanned, in order. Suggest its title from these pages.`,
    },
    ...usedPages.map((img) => ({ type: 'image_url', image_url: { url: toDataUrl(img) } })),
  ]

  let lastError: unknown = null
  for (const model of candidateVisionModels()) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature: 0.1,
        max_tokens: 200,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent as any },
        ],
        response_format: { type: 'json_object' },
      })

      const content = completion.choices[0]?.message?.content || '{}'
      const parsed = JSON.parse(content)
      return normalizeTitleSuggestion(parsed, model)
    } catch (error) {
      lastError = error
      console.warn(`[documentScanAi] Vision analysis with model "${model}" failed:`, error)
    }
  }

  throw createError({
    statusCode: 502,
    message: 'The AI could not suggest a title. The scan has been preserved — retry, or type the title yourself.',
    data: { code: 'SCAN_AI_FAILED', cause: lastError instanceof Error ? lastError.message : String(lastError) },
  })
}
