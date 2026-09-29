import Groq from 'groq-sdk'
import type { ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions'

let client: Groq | null = null

/**
 * Lazy Groq client — never instantiate at module top-level.
 * Eager `new Groq()` in shared nitro chunks crashes every Vercel route on cold start.
 */
export function useGroq(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'GROQ_API_KEY is not configured for this deployment.',
      })
    }
    client = new Groq({ apiKey })
  }
  return client
}

const RETRY_PASSES = 2
const RETRY_DELAY_MS = 1500

/**
 * Chat completion with automatic fallback across known-good Groq models.
 * Individual model ids get deprecated over time (e.g. llama-3.3-70b-versatile
 * was retired) — a hardcoded single model silently kills every caller once
 * that happens. Tries the configured/preferred model first, then falls
 * through a shortlist of currently-working models.
 *
 * Also retries the whole candidate list once after a short pause: bursts of
 * several rapid Groq calls have been observed to hit transient "Connection
 * error" / fetch failures (consistent with local outbound connection churn),
 * which a brief pause reliably clears.
 */
export async function createChatCompletion(
  params: Omit<ChatCompletionCreateParamsNonStreaming, 'model'> & { model?: string }
) {
  const groq = useGroq()
  const preferred = params.model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const candidateModels = Array.from(new Set([preferred, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']))

  let lastError: unknown
  for (let pass = 0; pass < RETRY_PASSES; pass++) {
    for (const model of candidateModels) {
      try {
        return await groq.chat.completions.create({ ...params, model })
      } catch (error) {
        lastError = error
        console.warn(`[groq] chat completion with model "${model}" failed:`, error instanceof Error ? error.message : error)
      }
    }
    if (pass < RETRY_PASSES - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }
  throw lastError
}
