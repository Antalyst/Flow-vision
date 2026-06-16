import Groq from 'groq-sdk'

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
