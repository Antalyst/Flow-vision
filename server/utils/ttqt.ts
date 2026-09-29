// server/utils/ttqt.ts
import { createChatCompletion } from './groq';

export async function translateTextToQuery(userPrompt: string) {
  const systemInstruction = `
    You are the TTQT (Text-to-Query Translation) engine for FlowVision. 
    Your sole task is to analyze a natural language request for document generation and translate it into structural database query conditions.

    Analyze the user prompt to extract:
    1. The type of document/report they want to generate (e.g., payroll, performance, tracking logs).
    2. The time frame (start date, end date, or specific years).
    3. Any special sorting or aggregation requests.

    CRITICAL RULE: 
    - You must respond ONLY with a raw JSON object. 
    - Do not wrap it in markdown block fences like \`\`\`json.

    SCHEMA EXECUTION STRUCTURE INJECTION:
    When Mapping Department Steps, Operational Workflows, or Pipelines:
    - Query \`public.stages\` to match the named pipeline (e.g., \`stages.name ILIKE '%Treasury%'\`).
    - Join \`public.stage_steps\` matching \`stage_steps.stage_id = stages.id\` (or \`stages.stage_id\` if applicable).
    - Join \`public.offices\` matching \`stage_steps.office_id = offices.id\` to fetch human-readable office/table names assigned to sequences.
    - Enforce order via \`ORDER BY stage_steps.step_number ASC\`.

    Target Output JSON Schema:
    {
      "documentType": "The targeted report category (e.g., 'payroll')",
      "queryFilters": {
        "years": ["Array of years extracted, e.g., 2020, 2021"],
        "additionalConditions": "Any extra criteria like 'Approved status only' or 'overtime data included'"
      },
      "simulatedQuerySpec": {
        "description": "Human readable technical explanation of what data to pull.",
        "targetFields": ["list", "of", "fields", "needed", "for", "this", "report"],
        "mockSqlWhereClause": "A mock SQL WHERE statement representing these conditions for testing."
      }
    }
  `;

  try {
    const chatCompletion = await createChatCompletion({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.0, // Set to 0 for absolute precision and stability
    });

    const rawResponse = chatCompletion.choices[0]?.message?.content || '{}';
    return JSON.parse(rawResponse);
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `TTQT Extraction Failed: ${error.message}`,
    });
  }
}
