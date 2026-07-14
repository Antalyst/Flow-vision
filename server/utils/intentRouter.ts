// server/utils/intentRouter.ts
//
// Lightweight gateway that decides whether a prompt is general conversation (NLP)
// or an explicit structured data request (NLQ). This sits in FRONT of the TTQT /
// document-builder chain so casual prompts ("hi", "thanks") never trigger a data dump.
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export type QueryIntent = 'conversation' | 'data_query' | 'document_revision' | 'semantic_search' | 'SYSTEM_TOPOLOGY'

export interface IntentClassification {
  intent: QueryIntent;
  target_entity?: string;
}

export interface IntentMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function classifyIntent(
  userPrompt: string,
  history: IntentMessage[] = [],
  hasActiveDocument = false
): Promise<IntentClassification> {
  const systemInstruction = `
    You are the Intent Router for FlowVision, a municipal document tracking platform.
    Classify the user's LATEST message into exactly one intent.

    Return ONLY raw JSON (no markdown fences):
    { 
      "intent": "conversation" | "data_query" | "document_revision" | "semantic_search" | "SYSTEM_TOPOLOGY",
      "target_entity": "extracted keyword if applicable" 
    }

    Context: an active generated document ${
      hasActiveDocument ? 'EXISTS' : 'does NOT exist'
    } in this conversation.

    Rules:
    - "SYSTEM_TOPOLOGY": the user is asking about system configuration, offices, workflows, stages, routing sequences, or performing reverse lookups (e.g., "show me all the offices of my organization", "how do I add a table", "list all stages where office X is present", "which workflows contain office Y?", "show me the payroll route"). Strip the prompt of any exact document search constraints or fake keywords like "office report", isolate ONLY the core entity keyword for "target_entity", and classify any system configuration, workflow, or routing question under this single umbrella. This intent queries the stages/stage_steps/offices schema tables — NOT the documents table.
    - "data_query": the user explicitly wants to FETCH, FILTER, VIEW, LIST, SEARCH,
      SUMMARIZE, COUNT, or MANAGE specific documents, records, reports,
      or municipal DOCUMENT data for the FIRST time, or asks for a NEW/DIFFERENT dataset
      (e.g. "show approved subsidy documents from 2024", "now list pending finance records").
    - "semantic_search": the user asks a colloquial question to find a specific document
      or a few specific documents (e.g. "Where is that delayed budget record from last Tuesday?",
      "Find the document that had a damage discrepancy earlier"). This intent bypasses the large
      tabular spreadsheet layout and instead returns document cards directly inside the conversation.
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
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0,
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw)
    const intent = parsed?.intent
    const target_entity = parsed?.target_entity

    const resolveIntent = (): QueryIntent => {
      if (intent === 'document_revision') {
        // A revision is only meaningful when there is a document to revise.
        return hasActiveDocument ? 'document_revision' : 'conversation'
      }
      if (intent === 'data_query') {
        return 'data_query'
      }
      if (intent === 'semantic_search') {
        return 'semantic_search'
      }
      if (intent === 'SYSTEM_TOPOLOGY') {
        return 'SYSTEM_TOPOLOGY'
      }
      return 'conversation'
    }

    return {
      intent: resolveIntent(),
      target_entity
    }
  } catch (error) {
    console.error('[IntentRouter] classification failed, defaulting to conversation:', error)
    // Fail safe: never dump data the user did not clearly request.
    return { intent: 'conversation' }
  }
}
