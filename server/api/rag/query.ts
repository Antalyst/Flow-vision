import { serverSupabaseClient } from '#supabase/server';
import { translateTextToQuery } from '~~/server/utils/ttqt';
import { generateDocumentTemplate } from '~~/server/utils/formatter';
import { extractTextFromFile } from '~~/server/utils/documentParser';
import {
  synthesizeDocumentPayload,
  reviseDocumentPayload,
  wantsSpreadsheetFormat,
} from '~~/server/utils/documentSynthesizer';
import type { DocumentPayload } from '~~/server/utils/documentSynthesizer';
import { classifyIntent } from '~~/server/utils/intentRouter';
import { generateConversationalReply } from '~~/server/utils/conversation';
import {
  resolveTenant,
  ensureSession,
  fetchRecentMessages,
  fetchLatestDocumentPayload,
  persistMessage,
} from '~~/server/utils/aiSession';

type AiScope = 'GLOBAL' | 'LOCAL'

interface RagQueryRequestBody {
  prompt: string;
  session_id?: string | null;
  /** Perspective scope set by the employee toggle. Defaults to GLOBAL. */
  scope?: AiScope;
  /**
   * UUIDs of the employee's assigned offices — required for LOCAL scope
   * filtering.  Server always re-validates org membership; this list only
   * narrows the document set, never expands it.
   */
  officeIds?: string[];
}

interface QueryFilters {
  years?: Array<number | string>;
  additionalConditions?: string | null;
}

interface TextToQueryOutput {
  documentType?: string | null;
  queryFilters?: QueryFilters;
  [key: string]: unknown;
}

interface SupabaseDocumentRow {
  id: string;
  org_id: string;
  title: string | null;
  description: string | null;
  created_at: string | null;
  mysql_storage_id: number | null;
  [key: string]: unknown;
}

interface MySQLDocumentStorageRow {
  file_blob: Buffer;
  file_name: string;
}

interface HydratedDocumentRow extends SupabaseDocumentRow {
  actualFileTextContent: string;
}

// Conversational (NLP) turns return a lightweight reply with no dataset.
interface RagConversationResponse {
  success: true;
  mode: 'conversation';
  session_id: string;
  reply: string;
}

// Iterative re-formatting of the active document (no DB re-query).
interface RagRevisionResponse {
  success: true;
  mode: 'document_revision';
  session_id: string;
  reply: string;
  documentPayload: DocumentPayload;
}

// Structured (NLQ) turns return the full data-builder payload.
interface RagDataResponse {
  success: true;
  mode: 'data_query';
  session_id: string;
  reply: string;
  meta: {
    userPrompt: string;
    interpretedFilters?: QueryFilters;
  };
  databaseResponse: {
    rowCount: number;
    rows: HydratedDocumentRow[];
  };
  genAiTemplateSpecification: Awaited<ReturnType<typeof generateDocumentTemplate>>;
  documentPayload: DocumentPayload;
}

type RagQueryResponse =
  | RagConversationResponse
  | RagRevisionResponse
  | RagDataResponse;

const HYDRATION_FALLBACK_TEXT = 'Physical document contents are unreadable or missing.';

const buildSearchWords = (ttqtOutput: TextToQueryOutput): string[] => {
  const documentType = typeof ttqtOutput.documentType === 'string' ? ttqtOutput.documentType : '';
  const additionalConditions =
    typeof ttqtOutput.queryFilters?.additionalConditions === 'string'
      ? ttqtOutput.queryFilters.additionalConditions
      : '';

  const searchableText = `${documentType} ${additionalConditions}`;

  return Array.from(
    new Set(
      searchableText
        .split(/\s+/)
        .map((word) => word.replace(/[,%()]/g, '').trim())
        .filter((word) => word.length > 3)
    )
  );
};

const buildDataReplySummary = (rowCount: number, documentType?: string | null): string => {
  const subject = documentType && documentType.trim() ? documentType.trim() : 'matching records';
  if (rowCount === 0) {
    return `I couldn't find any ${subject} for your organization. Try broadening the criteria or a different time frame.`;
  }
  return `I assembled ${rowCount} ${subject} into a structured dataset — open it in the canvas on the right to review or export.`;
};

export default defineEventHandler(async (event): Promise<RagQueryResponse> => {
  assertMethod(event, 'POST');

  const body = await readBody<RagQueryRequestBody>(event);
  const prompt = body?.prompt?.trim();

  if (!prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing "prompt" field in request body.',
    });
  }

  // 1. Resolve multi-tenant context from trusted session cookies (fails closed).
  const { orgId, userId } = await resolveTenant(event);

  // 1b. Read scope context from the request body.
  //     org_id is always from the session (trusted); officeIds are client-supplied
  //     but can only *narrow* the dataset — never expand it beyond the org.
  const scope: AiScope = body.scope === 'LOCAL' ? 'LOCAL' : 'GLOBAL';
  const rawOfficeIds: string[] = Array.isArray(body.officeIds)
    ? body.officeIds.map(String).filter(Boolean)
    : [];

  // 2. Validate or provision the active chat session.
  const sessionId = await ensureSession(body.session_id, orgId, userId, prompt);

  // 3. Hydrate rolling conversational memory (last 5 turns).
  const history = await fetchRecentMessages(sessionId);
  const memory = history.map((m) => ({ role: m.role, content: m.content }));

  // 3b. Resolve the "active document" — the latest document the user has been
  //     working on — so a follow-up critique can revise it in place.
  const activeDocument = await fetchLatestDocumentPayload(sessionId);

  // 4. Write-through the inbound user prompt (awaited; errors surfaced, not silent).
  try {
    await persistMessage(sessionId, 'user', prompt);
  } catch (error) {
    console.error('Postgres Insertion Error Details:', error);
  }

  // 5. Build a scope-context block that is prepended to every LLM call.
  //    This informs the model about the data boundaries without changing the
  //    user's persisted prompt text.
  //
  //    GLOBAL → full org synthesis across all records.
  //    LOCAL  → restricted to the employee's assigned office branch(es).
  const scopeContextBlock: string =
    scope === 'LOCAL'
      ? rawOfficeIds.length > 0
        ? `[SCOPE: OFFICE-LOCAL — This analysis is strictly restricted to documents ` +
          `registered under or currently resting inside the following office branch(es): ` +
          `${rawOfficeIds.join(', ')}. ` +
          `ALL summaries, tables, audit trails, and insights MUST reflect ONLY these ` +
          `micro-office transactions. Do not surface records from other branches or ` +
          `organisation-wide statistics unless explicitly requested.]`
        : `[SCOPE: EMPLOYEE-PERSONAL — This analysis is restricted to documents directly ` +
          `registered by the authenticated employee only. Do not reference other users' ` +
          `documents, other offices, or organisation-wide records.]`
      : `[SCOPE: ORGANIZATION-GLOBAL — This analysis spans the ENTIRE organisation ` +
        `(org_id: ${orgId}). Provide macro-level synthesis across all document records, ` +
        `office branches, routing pipelines, and historical transactions. ` +
        `Aggregate counts, cross-office comparisons, and org-wide trends are appropriate.]`;

  // The AI-facing prompt includes the scope directive; the persisted user turn
  // stores only the clean user text so the chat log stays readable.
  const aiPrompt = `${scopeContextBlock}\n\nUser Request: ${prompt}`;

  // 5b. Classify intent — conversation, document revision, or new data request.
  const intent = await classifyIntent(aiPrompt, memory, Boolean(activeDocument));

  // ── Branch R: iterative document revision (no DB re-query) ────────────────
  if (intent === 'document_revision' && activeDocument) {
    const documentPayload = await reviseDocumentPayload(activeDocument, aiPrompt, memory);
    const reply = wantsSpreadsheetFormat(prompt)
      ? `Converted “${documentPayload.title}” into a spreadsheet data matrix.`
      : `Updated “${documentPayload.title}” with your requested changes.`;

    try {
      await persistMessage(sessionId, 'assistant', reply, { documentPayload });
    } catch (error) {
      console.error('Postgres Insertion Error Details:', error);
    }

    return {
      success: true,
      mode: 'document_revision',
      session_id: sessionId,
      reply,
      documentPayload,
    };
  }

  // ── Branch A: conversational NLP ──────────────────────────────────────────
  if (intent === 'conversation') {
    const reply = await generateConversationalReply(aiPrompt, memory);

    try {
      await persistMessage(sessionId, 'assistant', reply);
    } catch (error) {
      console.error('Postgres Insertion Error Details:', error);
    }

    return {
      success: true,
      mode: 'conversation',
      session_id: sessionId,
      reply,
    };
  }

  // ── Branch B: structured NLQ data-builder pipeline ────────────────────────
  const mysqlDb = event.context.db;
  if (!mysqlDb) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MySQL database connector is not available on the request context.',
    });
  }

  const supabase = await serverSupabaseClient(event);
  const ttqtOutput = (await translateTextToQuery(aiPrompt)) as TextToQueryOutput;

  // The org filter is mandatory and unconditional — no cross-tenant reads.
  let query = supabase.from('documents').select('*').eq('org_id', orgId);

  // ── Apply scope filter ──────────────────────────────────────────────────
  // LOCAL: narrow the result set to documents that live in the employee's
  //        office branches (origin, current, or legacy office_id column).
  // GLOBAL: no additional filter — full org view.
  if (scope === 'LOCAL') {
    if (rawOfficeIds.length > 0) {
      const officeList = rawOfficeIds.join(',');
      query = query.or(
        `user_id.eq.${userId},` +
        `origin_office_id.in.(${officeList}),` +
        `current_office_id.in.(${officeList}),` +
        `office_id.in.(${officeList})`,
      );
    } else {
      // No offices assigned — restrict to employee's own uploads only
      query = query.eq('user_id', userId);
    }
  }

  const searchWords = buildSearchWords(ttqtOutput);

  if (searchWords.length > 0) {
    const orQueryParts = searchWords.flatMap((word) => [
      `title.ilike.%${word}%`,
      `description.ilike.%${word}%`,
    ]);

    query = query.or(orQueryParts.join(','));
  }

  const { data, error } = await query;

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to retrieve document metadata: ${error.message}`,
    });
  }

  const metadataRows = (data ?? []) as SupabaseDocumentRow[];
  const yearFilters = Array.isArray(ttqtOutput.queryFilters?.years)
    ? ttqtOutput.queryFilters.years
        .map((value) => parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value))
    : [];

  const filteredRows =
    yearFilters.length > 0
      ? metadataRows.filter((row) => {
          if (!row.created_at) {
            return false;
          }

          const documentYear = parseInt(String(new Date(row.created_at).getFullYear()), 10);
          return yearFilters.includes(documentYear);
        })
      : metadataRows;

  const recordsForHydration = filteredRows.slice(0, 5);

  const hydratedRows = await Promise.all(
    recordsForHydration.map(async (row): Promise<HydratedDocumentRow> => {
      if (!row.mysql_storage_id) {
        return {
          ...row,
          actualFileTextContent: HYDRATION_FALLBACK_TEXT,
        };
      }

      try {
        const [mysqlRows] = await mysqlDb.execute(
          'SELECT file_blob, file_name FROM document_storage WHERE id = ?',
          [row.mysql_storage_id]
        );

        const storageRows = mysqlRows as MySQLDocumentStorageRow[];
        const storageRow = storageRows[0];

        if (!storageRow?.file_blob || !storageRow.file_name) {
          return {
            ...row,
            actualFileTextContent: HYDRATION_FALLBACK_TEXT,
          };
        }

        const actualFileTextContent = await extractTextFromFile({
          filename: storageRow.file_name,
          data: storageRow.file_blob,
        });

        return {
          ...row,
          actualFileTextContent,
        };
      } catch (hydrationError) {
        console.error(
          `Failed to hydrate document ${row.id} from MySQL storage ID ${row.mysql_storage_id}:`,
          hydrationError
        );

        return {
          ...row,
          actualFileTextContent: HYDRATION_FALLBACK_TEXT,
        };
      }
    })
  );

  // Pass the scope-enriched prompt so the LLM knows whether to frame the output
  // as a micro-office audit or an org-wide executive synthesis.
  const visualTemplateBlueprint = await generateDocumentTemplate(aiPrompt, hydratedRows);

  const documentPayload = await synthesizeDocumentPayload(
    aiPrompt,
    hydratedRows,
    visualTemplateBlueprint
  );

  const reply = buildDataReplySummary(hydratedRows.length, ttqtOutput.documentType);

  // Persist the assistant turn. metadata is written in the unified blueprint shape
  // { documentPayload: { title, htmlContent } } so a refresh rehydrates the canvas.
  // Each turn is a discrete row insert — existing messages/sessions are untouched.
  try {
    await persistMessage(sessionId, 'assistant', reply, { documentPayload });
  } catch (error) {
    console.error('Postgres Insertion Error Details:', error);
  }

  return {
    success: true,
    mode: 'data_query',
    session_id: sessionId,
    scope,
    reply,
    meta: {
      userPrompt: prompt,
      scope,
      interpretedFilters: ttqtOutput.queryFilters,
    },
    databaseResponse: {
      rowCount: hydratedRows.length,
      rows: hydratedRows,
    },
    genAiTemplateSpecification: visualTemplateBlueprint,
    documentPayload,
  };
});
