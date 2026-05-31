// server/api/rag/query.ts
import fs from 'node:fs';
import path from 'node:path';

/**
 * Simulates your MySQL Database query using your local documents.json file
 */
function queryMockDatabase(filters: any) {
  try {
    const filePath = path.resolve(process.cwd(), 'server/data/documents.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const documents = JSON.parse(rawData);

    return documents.filter((doc: any) => {
      let matches = true;

      if (filters.officeId && doc.office_id !== filters.officeId) {
        matches = false;
      }

      if (filters.years && filters.years.length > 0) {
        const docYear = new Date(doc.created_at).getFullYear();
        if (!filters.years.includes(docYear)) {
          matches = false;
        }
      }

      if (filters.additionalConditions && filters.additionalConditions.toLowerCase().includes('approved')) {
        if (doc.status !== 'Approved') {
          matches = false;
        }
      }

      return matches;
    });
  } catch (error) {
    console.error('Database simulation fetch failed:', error);
    return [];
  }
}

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const body = await readBody(event);

  if (!body || !body.prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing "prompt" field in request body.',
    });
  }

  // Phase 1: Run TTQT to translate text into query parameters
  const ttqtOutput = await translateTextToQuery(body.prompt);

  // Phase 2: Pull the raw structural rows from MySQL (Simulated)
  const dbResults = queryMockDatabase(ttqtOutput.queryFilters);

  // Phase 3: Pass raw data + user intent to the Gen AI Template Formatter
  const visualTemplateBlueprint = await generateDocumentTemplate(body.prompt, dbResults);

  // FIX: Return the full loop including the Formatter template specification!
  return {
    success: true,
    meta: {
      userPrompt: body.prompt,
      interpretedFilters: ttqtOutput.queryFilters
    },
    databaseResponse: {
      rowCount: dbResults.length,
      rows: dbResults
    },
    // This is the missing piece you need to see in Postman:
    genAiTemplateSpecification: visualTemplateBlueprint
  };
});