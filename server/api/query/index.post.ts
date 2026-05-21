import Groq from "groq-sdk";
import documents from "../../data/documents.json"; 

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default defineEventHandler(async (event) => {
  const { prompt } = await readBody(event);

const systemMessage = `
You are an Expert Data Analyst for FlowVision.

Context Data:
${JSON.stringify(documents)}

Rules:
1. ALWAYS return valid JSON only.
2. NEVER return markdown.
3. NEVER use code blocks.
4. Filter the data based on the user's request.
5. Generate structured reports.
6. Include:
   - title
   - summary
   - documents
   - status_breakdown
7. Dates should be human readable.

JSON format example:

{
  "title": "Nutrition Report",
  "summary": "Report summary here",
  "documents": [
    {
      "id": 21,
      "name": "Barangay Feeding Program",
      "created_at": "March 2022",
      "status": "Approved"
    }
  ],
  "status_breakdown": {
    "Approved": 2,
    "Pending": 1
  }
}
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile", 
      temperature: 0.2, 
    });

    return {
      success: true,
      data: completion.choices[0].message.content
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});