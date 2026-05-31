// server/utils/rag.ts
import Groq from 'groq-sdk';
import fs from 'node:fs';
import path from 'node:path';
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, 
});

function getLocalDocumentsContext(): string {
  try {
    const filePath = path.resolve(process.cwd(), 'server/data/documents.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return rawData;
  } catch (error) {
    console.error('Failed to read documents database file:', error);
    return '[]';
  }
}


export async function processNLQRequest(userPrompt: string) {
  const documentsContext = getLocalDocumentsContext();

  const systemInstruction = `
    You are an advanced NLQ (Natural Language to Query) translation and data architecture assistant.
    Your job is to look at the user's natural language request, cross-reference it with the available document metadata schema, and generate structured output.
    
    Here is the available dataset context (JSON array of tracking records):
    ${documentsContext}

    CRITICAL RULES:
    1. Read-only context. You must only answer queries based on the available structural data.
    2. You must output a valid JSON object matching the exact structure requested below. Do not wrap the JSON in markdown code blocks like \`\`\`json.

    Expected JSON Schema Output:
    {
      "translatedQuery": {
        "description": "A technical human-readable description of what fields/conditions are being targeted.",
        "simulatedSqlFilter": "An optimized mock SQL WHERE clause filtering the JSON fields based on the prompt (e.g., status = 'Approved' AND office_id = 'OFF-A')."
      },
      "matchedDocuments": [
        // An array of items from the context that match the user's request criteria
      ],
      "aiSummary": "A concise, professional synthesis of the matching documents found, or a breakdown of the results."
    }
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      // Force Groq to return a valid JSON object
      response_format: { type: "json_object" },
      temperature: 0.2, // Low temperature keeps it predictable and precise
    });

    const rawResponse = chatCompletion.choices[0]?.message?.content || '{}';
    return JSON.parse(rawResponse);
    
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Groq RAG Processing Failed: ${error.message}`,
    });
  }
}