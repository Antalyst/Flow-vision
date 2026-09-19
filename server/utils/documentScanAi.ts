/**
 * server/utils/documentScanAi.ts
 *
 * Groq Vision analysis for physically-scanned documents (camera capture pipeline).
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

/** Mirrors the columns of public.document_ai_analysis (minus id/document_id/scan_session_id/created_at). */
export interface ScanAiAnalysis {
  model: string
  document_type: string | null
  title: string | null
  sender: string | null
  recipient: string | null
  subject: string | null
  document_date: string | null // ISO date (YYYY-MM-DD) or null
  summary: string | null
  priority: 'High' | 'Medium' | 'Low' | null
  contains_signature: boolean
  contains_letterhead: boolean
  contains_stamp: boolean
  contains_seal: boolean
  confidence: number // 0-100
  raw_response: Record<string, unknown>
}

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

const SYSTEM_PROMPT = `You are a document intake assistant reading a photo of a PHYSICAL paper document
captured by an office worker's camera for a government records system.

STRICT RULES:
- Extract ONLY information that is visibly legible in the image(s) provided.
- NEVER invent, guess, or infer a name, date, office, document number, sender, or recipient
  that is not actually printed/written on the page.
- If a field cannot be determined from what is visible, its value MUST be null — do not
  fabricate a plausible-sounding value.
- Do NOT attempt to reproduce, describe the exact appearance of, or forge any signature, seal,
  stamp, or logo. Only report whether one is visually PRESENT (true/false) — never transcribe
  or recreate it.
- Preserve extracted text as accurately as possible; do not paraphrase names/numbers.
- "summary" must describe only what is visible in the supplied image(s) — never claim knowledge
  of pages that were not scanned.
- "confidence" (0-100) is your own honest confidence that the extracted fields are accurate and
  complete given image legibility, NOT a document-authenticity score.

Return ONLY a single JSON object with exactly these keys:
{
  "document_type": string|null,
  "title": string|null,
  "sender": string|null,
  "recipient": string|null,
  "subject": string|null,
  "document_date": string|null,   // ISO format YYYY-MM-DD if a date is visible, else null
  "summary": string|null,          // 1-3 sentences, based only on visible content
  "priority": "High"|"Medium"|"Low"|null,
  "contains_signature": boolean,
  "contains_letterhead": boolean,
  "contains_stamp": boolean,
  "contains_seal": boolean,
  "confidence": number              // 0-100
}`

function normalize(raw: any, model: string): ScanAiAnalysis {
  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null

  const priorityRaw = str(raw?.priority)
  const priority: ScanAiAnalysis['priority'] =
    priorityRaw === 'High' || priorityRaw === 'Medium' || priorityRaw === 'Low' ? priorityRaw : null

  let documentDate: string | null = str(raw?.document_date)
  if (documentDate && !/^\d{4}-\d{2}-\d{2}$/.test(documentDate)) {
    // Model returned a non-ISO date string — keep it out of a `date`-typed column
    // rather than risk a malformed insert; the raw text survives in raw_response.
    documentDate = null
  }

  const confidenceRaw = Number(raw?.confidence)
  const confidence = Number.isFinite(confidenceRaw) ? Math.min(100, Math.max(0, confidenceRaw)) : 0

  return {
    model,
    document_type: str(raw?.document_type),
    title: str(raw?.title),
    sender: str(raw?.sender),
    recipient: str(raw?.recipient),
    subject: str(raw?.subject),
    document_date: documentDate,
    summary: str(raw?.summary),
    priority,
    contains_signature: raw?.contains_signature === true,
    contains_letterhead: raw?.contains_letterhead === true,
    contains_stamp: raw?.contains_stamp === true,
    contains_seal: raw?.contains_seal === true,
    confidence,
    raw_response: (raw && typeof raw === 'object') ? raw : {},
  }
}

/**
 * Sends 1..N captured page photos to a Groq vision model and returns structured,
 * never-invented metadata. Throws on total failure (all candidate models exhausted)
 * so the caller can mark the scan session FAILED and let the user retry or
 * continue manually — the caller must NOT discard the captured images on error.
 */
export async function analyzeScannedDocument(
  images: { data: Buffer; mimeType: string }[],
  scanMode: ScanMode,
): Promise<ScanAiAnalysis> {
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
          ? 'Only the FIRST PAGE of this physical document was scanned. Base your analysis strictly on this one image.'
          : `${usedPages.length} page(s) of this physical document were scanned, in order. Base your analysis on exactly these pages.`,
    },
    ...usedPages.map((img) => ({ type: 'image_url', image_url: { url: toDataUrl(img) } })),
  ]

  let lastError: unknown = null
  for (const model of candidateVisionModels()) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature: 0.1,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent as any },
        ],
        response_format: { type: 'json_object' },
      })

      const content = completion.choices[0]?.message?.content || '{}'
      const parsed = JSON.parse(content)
      return normalize(parsed, model)
    } catch (error) {
      lastError = error
      console.warn(`[documentScanAi] Vision analysis with model "${model}" failed:`, error)
    }
  }

  throw createError({
    statusCode: 502,
    message: 'AI vision analysis failed for all configured models. The scan has been preserved — you can retry or continue manually.',
    data: { code: 'SCAN_AI_FAILED', cause: lastError instanceof Error ? lastError.message : String(lastError) },
  })
}
