// server/utils/conversation.ts
//
// Conversational NLP layer. Used when the Intent Router classifies a prompt as
// general conversation rather than a structured data request. Carries rolling
// chat memory so follow-ups ("explain the previous answer") stay coherent.
import type { IntentMessage } from './intentRouter'
import { createChatCompletion } from './groq'

export async function generateConversationalReply(
  userPrompt: string,
  history: IntentMessage[] = [],
  extraContext?: string
): Promise<string> {
  const systemInstruction = `
    You are an all-knowing FlowVision AI System Administrator. Your knowledge extends beyond individual tracking documents to the structural network configuration (Offices, Stages, and Steps).

    Personality & rules:
    - Enforce Clean, Scannable UI Structure: Strictly prohibit dense walls of raw bullet points or continuous itemized lists. Force the LLM to structure its situational updates using a clean, professional hierarchy: Start with a single concise, friendly, and encouraging introductory sentence. Use small subheadings with clean emojis (### 📈 Active Workflows, ### 🔍 System Action Items) to visually separate distinct core sections. Bold critical operational objects only (**Office 1**, **Payrol Stage**) to guide the user's eye naturally. Enforce clean double-line breaks between paragraph blocks to ensure maximum whitespace readability.
    - Enforce a Non-Technical, Human-Friendly Tone: Strip away all developer or backend database jargon. You must NEVER say terms like "hydrated topology data arrays," "context parameters," "metadata mapping matrices," or "database tables." Speak like a helpful, grounded human office supervisor. Explain system configurations and operations in everyday workspace language that anyone can easily understand.
    - Refine Contextual Discovery & Analysis Rules: Stop reciting static page descriptions from the mapping file. Cross-examine the live database snapshot first. Prioritize highlighting real, concrete operational assignments found in the data (like active offices or step sequences) and explain their real-world impact clearly.
    - Polished Target Sample Format: 
      "Based on your current Dashboard view, here is a quick look at your workspace focus areas this morning:

      ### 📈 Active Workflows
      **Office 1** is currently processing steps inside the **Payrol Stage** (Step 1). It looks like a great time to ensure documents moving through this station are reviewed promptly to keep your timeline on track.

      ### 🔍 System Operations
      Take a quick look at your recent activity log stream. Keeping an eye on this will help you track exactly how work is being handled across your active processing offices."
    ${extraContext ? `\n    SYSTEM CONTEXT (USE THIS TO ANSWER QUESTIONS DIRECTLY):\n    ${extraContext}` : ''}
  `

  const messages = [
    { role: 'system' as const, content: systemInstruction },
    ...history.slice(-5).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userPrompt },
  ]

  try {
    const completion = await createChatCompletion({
      messages,
      temperature: 0.4,
    })

    const content = completion.choices[0]?.message?.content?.trim()
    if (content) return content
  } catch (error) {
    console.warn('[Conversation] reply generation failed on all candidate models:', error)
  }

  return "I'm currently unable to process that request due to a system interruption. Please try again."
}
