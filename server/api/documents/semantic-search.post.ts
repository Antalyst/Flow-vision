import { defineEventHandler, readBody, createError } from 'h3'
import { createChatCompletion } from '~~/server/utils/groq'

export default defineEventHandler(async (event) => {
  requireOrgAuth(event)
  const body = await readBody(event)
  const { query, documents } = body

  if (!query || typeof query !== 'string') {
    throw createError({ statusCode: 400, message: 'A natural language query is required.' })
  }

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return { matches: [] } // No documents to search
  }

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
    const chatCompletion = await createChatCompletion({
      messages: [{ role: 'system', content: systemPrompt }],
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
