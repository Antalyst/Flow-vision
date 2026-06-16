import { d as defineEventHandler, C as assertMethod, e as readBody, c as createError, r as resolveTenant, D as ensureSession, E as fetchRecentMessages, F as fetchLatestDocumentPayload, G as persistMessage, H as classifyIntent, J as reviseDocumentPayload, K as wantsSpreadsheetFormat, L as generateConversationalReply, v as useMySQL, a as useServerSupabase, M as translateTextToQuery, A as extractTextFromFile, N as generateDocumentTemplate, O as synthesizeDocumentPayload } from '../../../_/nitro.mjs';
import 'node:crypto';
import 'mysql2/promise';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';

const HYDRATION_FALLBACK_TEXT = "Physical document contents are unreadable or missing.";
const buildSearchWords = (ttqtOutput) => {
  var _a;
  const documentType = typeof ttqtOutput.documentType === "string" ? ttqtOutput.documentType : "";
  const additionalConditions = typeof ((_a = ttqtOutput.queryFilters) == null ? void 0 : _a.additionalConditions) === "string" ? ttqtOutput.queryFilters.additionalConditions : "";
  const searchableText = `${documentType} ${additionalConditions}`;
  return Array.from(
    new Set(
      searchableText.split(/\s+/).map((word) => word.replace(/[,%()]/g, "").trim()).filter((word) => word.length > 3)
    )
  );
};
const buildDataReplySummary = (rowCount, documentType) => {
  const subject = documentType && documentType.trim() ? documentType.trim() : "matching records";
  if (rowCount === 0) {
    return `I couldn't find any ${subject} for your organization. Try broadening the criteria or a different time frame.`;
  }
  return `I assembled ${rowCount} ${subject} into a structured dataset \u2014 open it in the canvas on the right to review or export.`;
};
const query = defineEventHandler(async (event) => {
  var _a, _b;
  assertMethod(event, "POST");
  const body = await readBody(event);
  const prompt = (_a = body == null ? void 0 : body.prompt) == null ? void 0 : _a.trim();
  if (!prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing "prompt" field in request body.'
    });
  }
  const { orgId, userId } = await resolveTenant(event);
  const scope = body.scope === "LOCAL" ? "LOCAL" : "GLOBAL";
  const rawOfficeIds = Array.isArray(body.officeIds) ? body.officeIds.map(String).filter(Boolean) : [];
  const sessionId = await ensureSession(body.session_id, orgId, userId, prompt);
  const history = await fetchRecentMessages(sessionId);
  const memory = history.map((m) => ({ role: m.role, content: m.content }));
  const activeDocument = await fetchLatestDocumentPayload(sessionId);
  try {
    await persistMessage(sessionId, "user", prompt, event);
  } catch (error2) {
    console.error("Postgres Insertion Error Details:", error2);
  }
  const scopeContextBlock = scope === "LOCAL" ? rawOfficeIds.length > 0 ? `[SCOPE: OFFICE-LOCAL \u2014 This analysis is strictly restricted to documents registered under or currently resting inside the following office branch(es): ${rawOfficeIds.join(", ")}. ALL summaries, tables, audit trails, and insights MUST reflect ONLY these micro-office transactions. Do not surface records from other branches or organisation-wide statistics unless explicitly requested.]` : `[SCOPE: EMPLOYEE-PERSONAL \u2014 This analysis is restricted to documents directly registered by the authenticated employee only. Do not reference other users' documents, other offices, or organisation-wide records.]` : `[SCOPE: ORGANIZATION-GLOBAL \u2014 This analysis spans the ENTIRE organisation (org_id: ${orgId}). Provide macro-level synthesis across all document records, office branches, routing pipelines, and historical transactions. Aggregate counts, cross-office comparisons, and org-wide trends are appropriate.]`;
  const aiPrompt = `${scopeContextBlock}

User Request: ${prompt}`;
  const intent = await classifyIntent(aiPrompt, memory, Boolean(activeDocument));
  if (intent === "document_revision" && activeDocument) {
    const documentPayload2 = await reviseDocumentPayload(activeDocument, aiPrompt, memory);
    const reply2 = wantsSpreadsheetFormat(prompt) ? `Converted \u201C${documentPayload2.title}\u201D into a spreadsheet data matrix.` : `Updated \u201C${documentPayload2.title}\u201D with your requested changes.`;
    try {
      await persistMessage(sessionId, "assistant", reply2, event, { documentPayload: documentPayload2 });
    } catch (error2) {
      console.error("Postgres Insertion Error Details:", error2);
    }
    return {
      success: true,
      mode: "document_revision",
      session_id: sessionId,
      reply: reply2,
      documentPayload: documentPayload2
    };
  }
  if (intent === "conversation") {
    const reply2 = await generateConversationalReply(aiPrompt, memory);
    try {
      await persistMessage(sessionId, "assistant", reply2, event);
    } catch (error2) {
      console.error("Postgres Insertion Error Details:", error2);
    }
    return {
      success: true,
      mode: "conversation",
      session_id: sessionId,
      reply: reply2
    };
  }
  const mysqlDb = useMySQL();
  if (!mysqlDb) {
    throw createError({
      statusCode: 500,
      statusMessage: "MySQL database connector is not available on the request context."
    });
  }
  const client = useServerSupabase();
  const ttqtOutput = await translateTextToQuery(aiPrompt);
  let query = client.from("documents").select("*").eq("org_id", orgId);
  if (scope === "LOCAL") {
    if (rawOfficeIds.length > 0) {
      const officeList = rawOfficeIds.join(",");
      query = query.or(
        `user_id.eq.${userId},origin_office_id.in.(${officeList}),current_office_id.in.(${officeList}),office_id.in.(${officeList})`
      );
    } else {
      query = query.eq("user_id", userId);
    }
  }
  const searchWords = buildSearchWords(ttqtOutput);
  if (searchWords.length > 0) {
    const orQueryParts = searchWords.flatMap((word) => [
      `title.ilike.%${word}%`,
      `description.ilike.%${word}%`
    ]);
    query = query.or(orQueryParts.join(","));
  }
  const { data, error } = await query;
  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to retrieve document metadata: ${error.message}`
    });
  }
  const metadataRows = data != null ? data : [];
  const yearFilters = Array.isArray((_b = ttqtOutput.queryFilters) == null ? void 0 : _b.years) ? ttqtOutput.queryFilters.years.map((value) => parseInt(String(value), 10)).filter((value) => Number.isInteger(value)) : [];
  const filteredRows = yearFilters.length > 0 ? metadataRows.filter((row) => {
    if (!row.created_at) {
      return false;
    }
    const documentYear = parseInt(String(new Date(row.created_at).getFullYear()), 10);
    return yearFilters.includes(documentYear);
  }) : metadataRows;
  const recordsForHydration = filteredRows.slice(0, 5);
  const hydratedRows = await Promise.all(
    recordsForHydration.map(async (row) => {
      if (!row.mysql_storage_id) {
        return {
          ...row,
          actualFileTextContent: HYDRATION_FALLBACK_TEXT
        };
      }
      try {
        const [mysqlRows] = await mysqlDb.execute(
          "SELECT file_blob, file_name FROM document_storage WHERE id = ?",
          [row.mysql_storage_id]
        );
        const storageRows = mysqlRows;
        const storageRow = storageRows[0];
        if (!(storageRow == null ? void 0 : storageRow.file_blob) || !storageRow.file_name) {
          return {
            ...row,
            actualFileTextContent: HYDRATION_FALLBACK_TEXT
          };
        }
        const actualFileTextContent = await extractTextFromFile({
          filename: storageRow.file_name,
          data: storageRow.file_blob
        });
        return {
          ...row,
          actualFileTextContent
        };
      } catch (hydrationError) {
        console.error(
          `Failed to hydrate document ${row.id} from MySQL storage ID ${row.mysql_storage_id}:`,
          hydrationError
        );
        return {
          ...row,
          actualFileTextContent: HYDRATION_FALLBACK_TEXT
        };
      }
    })
  );
  const visualTemplateBlueprint = await generateDocumentTemplate(aiPrompt, hydratedRows);
  const documentPayload = await synthesizeDocumentPayload(
    aiPrompt,
    hydratedRows,
    visualTemplateBlueprint
  );
  const reply = buildDataReplySummary(hydratedRows.length, ttqtOutput.documentType);
  try {
    await persistMessage(sessionId, "assistant", reply, event, { documentPayload });
  } catch (error2) {
    console.error("Postgres Insertion Error Details:", error2);
  }
  return {
    success: true,
    mode: "data_query",
    session_id: sessionId,
    scope,
    reply,
    meta: {
      userPrompt: prompt,
      scope,
      interpretedFilters: ttqtOutput.queryFilters
    },
    databaseResponse: {
      rowCount: hydratedRows.length,
      rows: hydratedRows
    },
    genAiTemplateSpecification: visualTemplateBlueprint,
    documentPayload
  };
});

export { query as default };
//# sourceMappingURL=query.mjs.map
