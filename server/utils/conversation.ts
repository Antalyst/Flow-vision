// server/utils/conversation.ts
//
// Conversational NLP layer. Used when the Intent Router classifies a prompt as
// general conversation rather than a structured data request. Carries rolling
// chat memory so follow-ups ("explain the previous answer") stay coherent.
import type { IntentMessage } from './intentRouter'

export async function generateConversationalReply(
  userPrompt: string,
  history: IntentMessage[] = []
): Promise<string> {
  const systemInstruction = `
    You are FlowVision Intelligence, a friendly and professional AI assistant embedded in a
    municipal document tracking and workflow platform.

    Personality & rules:
    - Be warm, concise, and helpful. Use natural language, not robotic templates.
    - You help users track, search, and report on documents, offices, and workflow stages.
    - When a user greets you or makes small talk, respond conversationally and briefly
      mention how you can help (e.g. "I can pull up documents, summarize records, or build reports").
    - If they ask about a previous answer, use the conversation history to clarify.
    - NEVER invent specific document data, record IDs, counts, or statuses. If they want real
      records, invite them to ask for what to fetch or filter — the data engine will handle it.
    - Keep replies to a few short sentences unless the user asks for detail.
  `

  const messages = [
    { role: 'system' as const, content: systemInstruction },
    ...history.slice(-5).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userPrompt },
  ]

  try {
    const completion = await useGroq().chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
    })

    return (
      completion.choices[0]?.message?.content?.trim() ||
      "I'm here to help. You can ask me to fetch, filter, or summarize your documents and records."
    )
  } catch (error) {
    console.error('[Conversation] reply generation failed:', error)
    return "I'm here to help. You can ask me to fetch, filter, or summarize your documents and records anytime."
  }
}
