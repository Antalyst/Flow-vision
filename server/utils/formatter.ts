// server/utils/formatter.ts
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateDocumentTemplate(userPrompt: string, dbRows: any[]) {
  const systemInstruction = `
    You are the Gen AI JSON Template Formatter for FlowVision.
    Your role is to act as a layout architect (Synthetic Intelligence). You sit between the raw database results and the final file generator.
    
    Your task is to analyze the user's original request alongside the raw database rows, and output a highly structured JSON layout blueprint.

    CRITICAL STRATEGY RULES:
    1. Visualize the User's Need Output: Decide whether this data belongs in a Grid/Table layout (Excel) or an Administrative Text/Narrative layout (Word).
    2. Data Must Be Concise: Provide clear rules for handling long descriptions, grouping related records, or highlighting important states (e.g., status = 'Approved').
    3. File Format Identification: Detect if the user needs an EXCEL (.xlsx) or WORD (.docx) style structure based on context. If it looks mathematical or heavy on rows, default to EXCEL.

    CRITICAL FORMATTING RULE:
    - Respond ONLY with a valid, raw JSON object matching the target schema.
    - Do not wrap the JSON in markdown code blocks like \`\`\`json.

    Target Output JSON Schema:
    {
      "targetFileFormat": "EXCEL | WORD",
      "documentMetadata": {
        "title": "A highly professional, context-aware title for the document",
        "brandingContext": "The organization or general context inferred from the request, or 'General System' if none is available",
        "generationDate": "2026-05-27"
      },
      "visualLayoutSpecification": {
        "structureType": "TABULAR_GRID | NARRATIVE_REPORT",
        "theme": "A short style guide instruction (e.g., 'Clean corporate blue, alternating row colors')",
        "sections": [
          {
            "sectionId": "string_identifier",
            "type": "title_card | metrics_row | grid | text_block",
            "contentInstructions": "Detailed explicit instruction for the AI Data Builder on what elements to place here."
          }
        ]
      },
      "dataBuilderDirectives": {
        "concisenessStrategy": "Instructions on how to keep the rows compact (e.g., truncate text, group by years)",
        "aggregationRules": {
          "calculateTotals": true,
          "targetCalculations": "Description of what rows or columns to count/aggregate (e.g., 'Total count of approved records')"
        }
      }
    }
  `;

  const databaseContextString = JSON.stringify(dbRows, null, 2);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        { 
          role: 'user', 
          content: `User Request: "${userPrompt}"\n\nFetched Database Rows:\n${databaseContextString}` 
        }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: "json_object" },
      temperature: 0.2, 
    });

    const rawResponse = chatCompletion.choices[0]?.message?.content || '{}';
    return JSON.parse(rawResponse);
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Template Formatting Failed: ${error.message}`,
    });
  }
}
