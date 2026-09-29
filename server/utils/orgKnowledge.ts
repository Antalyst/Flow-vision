// server/utils/orgKnowledge.ts
//
// Org-level AI Knowledge Base: lets a client (org admin) upload PDF/.docx/.xlsx
// files from Settings describing how their organization works. The AI chat
// assistant (server/api/rag/query.ts) grounds its "conversation" answers in
// this content — same idea as the rest of the app's keyword-based document
// search (see buildSearchWords in rag/query.ts), not vector/embedding search.
import type { Pool } from 'mysql2/promise'

export const KNOWLEDGE_ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx'] as const
export type KnowledgeAllowedExtension = (typeof KNOWLEDGE_ALLOWED_EXTENSIONS)[number]

// The live DB's max_allowed_packet is 1GB. Verified end-to-end (upload,
// extraction, storage) up to 127MB / 920 pages — the remote DB host's write
// throughput is the real bottleneck (~3.5 min for 127MB), not a hard size
// limit, so large files just take longer rather than failing. 150MB gives
// headroom above the largest real file tested.
export const MAX_KNOWLEDGE_FILE_BYTES = 150 * 1024 * 1024

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
       WHERE org_id = ? AND extraction_status = 'ready' AND extracted_text IS NOT NULL
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
