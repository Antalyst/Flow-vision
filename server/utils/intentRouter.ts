// server/utils/intentRouter.ts
//
// Lightweight gateway that decides whether a prompt is general conversation (NLP)
// or an explicit structured data request (NLQ). This sits in FRONT of the TTQT /
// document-builder chain so casual prompts ("hi", "thanks") never trigger a data dump.

export type QueryIntent = 'conversation' | 'data_query' | 'document_revision'

export interface IntentMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function classifyIntent(
  userPrompt: string,
  history: IntentMessage[] = [],
  hasActiveDocument = false
): Promise<QueryIntent> {
  const systemInstruction = `
    You are the Intent Router for FlowVision, a municipal document tracking platform.
    Classify the user's LATEST message into exactly one intent.

    Return ONLY raw JSON (no markdown fences):
    { "intent": "conversation" | "data_query" | "document_revision" }

    Context: an active generated document ${
      hasActiveDocument ? 'EXISTS' : 'does NOT exist'
    } in this conversation.

    Rules:
    - "data_query": the user explicitly wants to FETCH, FILTER, VIEW, LIST, SEARCH,
      SUMMARIZE, COUNT, or MANAGE specific documents, records, reports, offices, stages,
      or municipal data for the FIRST time, or asks for a NEW/DIFFERENT dataset
      (e.g. "show approved subsidy documents from 2024", "now list pending finance records").
    - "document_revision": ONLY valid when an active document EXISTS. The user is asking to
      EDIT, REFORMAT, RESTYLE, or ADJUST THE LAYOUT of the document already produced — without
      changing which records it is about (e.g. "make the layout more formal",
      "add a signature block to the bottom", "remove the description column",
      "turn this into a spreadsheet", "show as excel", "convert to grid layout",
      "raw columns view", "change the title", "make it shorter").
      If no active document exists, NEVER choose this.
    - "conversation": greetings, small talk, thanks, capability/identity questions,
      clarifications, or meta questions about a previous answer
      (e.g. "hi", "hello", "how are you", "what can you do", "explain the previous answer").
      When in doubt, choose "conversation".
  `

  const messages = [
    { role: 'system' as const, content: systemInstruction },
    ...history.slice(-4).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userPrompt },
  ]

  try {
    const completion = await useGroq().chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0,
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw)
    const intent = parsed?.intent

    if (intent === 'document_revision') {
      // A revision is only meaningful when there is a document to revise.
      return hasActiveDocument ? 'document_revision' : 'conversation'
    }
    if (intent === 'data_query') {
      return 'data_query'
    }
    return 'conversation'
  } catch (error) {
    console.error('[IntentRouter] classification failed, defaulting to conversation:', error)
    // Fail safe: never dump data the user did not clearly request.
    return 'conversation'
  }
}
