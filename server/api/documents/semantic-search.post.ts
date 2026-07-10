import { defineEventHandler, readBody, createError } from 'h3'
import Groq from 'groq-sdk'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { query, documents } = body

  if (!query || typeof query !== 'string') {
    throw createError({ statusCode: 400, message: 'A natural language query is required.' })
  }

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return { matches: [] } // No documents to search
  }

  const groqApiKey = process.env.GROQ_API_KEY
  if (!groqApiKey) {
    throw createError({ statusCode: 500, message: 'GROQ_API_KEY is not configured.' })
  }

  const groq = new Groq({ apiKey: groqApiKey })

  // Prepare a condensed version of documents to save tokens
  const contextDocs = documents.map(doc => ({
    id: doc.id,
    title: doc.title,
    description: doc.description,
    uploader: doc.uploader_name || 'Unknown',
    date: doc.created_at,
    status: doc.status
  }))

  const systemPrompt = `You are the core intelligence of a Contextual Document Discovery engine.
Your job is to match the user's natural language intent against a provided list of documents.

AVAILABLE DOCUMENTS (JSON format):
${JSON.stringify(contextDocs)}

USER'S INTENT:
"${query}"

INSTRUCTIONS:
1. Understand the underlying context and meaning of the user's intent.
2. Select ONLY the documents that genuinely match the intent.
3. For each matched document, write a very brief 1-sentence explanation of WHY it matches (e.g. "This is the Q3 financial report uploaded by John.").
4. Return ONLY a valid JSON object containing a "matches" key.

OUTPUT FORMAT:
{
  "matches": [
    { "id": "document_id_here", "explanation": "Explanation here" }
  ]
}

If no documents match, return { "matches": [] }
`

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const content = chatCompletion.choices[0]?.message?.content || '{"matches": []}'
    let result = { matches: [] }
    
    try {
      const parsed = JSON.parse(content)
      if (parsed.matches && Array.isArray(parsed.matches)) {
        result.matches = parsed.matches
      }
    } catch (e) {
      console.error('Failed to parse Groq response:', content)
    }

    return result

  } catch (error: any) {
    console.error('Groq API Error:', error)
    throw createError({ statusCode: 500, message: 'Semantic engine failed to process the request.' })
  }
})
