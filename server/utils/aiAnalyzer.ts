import Groq from 'groq-sdk'

export const analyzeDocument = async (text: string) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    messages: [
      { 
        role: "system", 
        content: "Return ONLY a JSON object with 'title' and 'description'. Use 'Unknown' if you cannot find a title." 
      },
      { role: "user", content: `Document Content: ${text}` }
    ],
    response_format: { type: "json_object" }
  })
  return JSON.parse(completion.choices[0]?.message?.content || '{}')
}