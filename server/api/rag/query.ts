import { serverSupabaseClient } from '#supabase/server';
import Groq from 'groq-sdk';
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

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function fuzzyMatchRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const dist = levenshteinDistance(a, b);
  return ((maxLen - dist) / maxLen) * 100;
}

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
  current_page_context?: string;
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

// Semantic Search returns inline documents inside the chat bubble without full data-builder layout.
interface RagSemanticSearchResponse {
  success: true;
  mode: 'semantic_search';
  session_id: string;
  reply: string;
  inlineDocuments: HydratedDocumentRow[];
}

// Topology Lookup returns structural pipeline data rendered as a step-by-step flow document.
interface RagTopologyResponse {
  success: true;
  mode: 'INTENT_INTERNAL_TOPOLOGY';
  session_id: string;
  reply: string;
  documentPayload: DocumentPayload;
}

type RagQueryResponse =
  | RagConversationResponse
  | RagRevisionResponse
  | RagDataResponse
  | RagSemanticSearchResponse
  | RagTopologyResponse;

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
  const { orgId, userId, role } = await resolveTenant(event);

  // 1b. Read scope context from the request body.
  //     org_id is always from the session (trusted); officeIds are client-supplied
  //     but can only *narrow* the dataset — never expand it beyond the org.
  let scope: AiScope = body.scope === 'LOCAL' ? 'LOCAL' : 'GLOBAL';
  let rawOfficeIds: string[] = Array.isArray(body.officeIds)
    ? body.officeIds.map(String).filter(Boolean)
    : [];

  // SECURITY ENFORCEMENT: Employees are strictly hard-scoped to their assigned offices.
  // They cannot view GLOBAL data, and they cannot spoof officeIds via the request body.
  if (role === 'employee') {
    scope = 'LOCAL';
    const supabase = await serverSupabaseClient(event);
    const { data: employeeOffices } = await supabase
      .from('offices')
      .select('id')
      .eq('org_id', orgId)
      .eq('assigned_user', userId);
      
    rawOfficeIds = (employeeOffices ?? []).map(o => String(o.id));
  }

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

  const supabase = await serverSupabaseClient(event);
  
  // -- TOPOLOGY DATA FETCH --
  let topologyData = '';
  try {
    const usersRes = await supabase.from('users').select('user_id, full_name');
    const usersMap = new Map<string, string>();
    if (usersRes.data) {
      usersRes.data.forEach((u: any) => {
        usersMap.set(String(u.user_id), u.full_name);
      });
    }

    const enrichOffices = (offices: any[]) => {
      return offices.map((o: any) => ({
        ...o,
        employee_name: o.assigned_user ? usersMap.get(String(o.assigned_user)) || null : null
      }));
    };

    if (scope === 'GLOBAL') {
      const [officesRes, stagesRes, stepsRes] = await Promise.all([
        supabase.from('offices').select('*').eq('org_id', orgId),
        supabase.from('stages').select('*').eq('org_id', orgId),
        supabase.from('stage_steps').select('*').eq('org_id', orgId)
      ]);
      topologyData = JSON.stringify({
        offices: enrichOffices(officesRes.data || []),
        stages: stagesRes.data || [],
        stageSteps: stepsRes.data || []
      });
    } else {
      // LOCAL scope
      if (rawOfficeIds.length > 0) {
        const idList = rawOfficeIds.join(',');
        
        // Include the offices directly assigned, PLUS any child offices (parent_office_id).
        const officesRes = await supabase.from('offices')
          .select('*')
          .eq('org_id', orgId)
          .or(`id.in.(${idList}),parent_office_id.in.(${idList})`);
          
        const allLocalOfficeIds = (officesRes.data || []).map((o: any) => o.id);
        const localOfficeList = allLocalOfficeIds.join(',') || '00000000-0000-0000-0000-000000000000'; // fallback to prevent empty `.in()`

        const [stagesRes, stepsRes] = await Promise.all([
          // Catch stages owned by the office explicitly, or stages that have steps in these offices.
          supabase.from('stages').select('*').eq('org_id', orgId),
          supabase.from('stage_steps').select('*').eq('org_id', orgId).in('office_id', allLocalOfficeIds)
        ]);
        
        // Filter stages: must either belong to the local office_id directly, OR have routing steps passing through the local office.
        const touchedStageIds = new Set((stepsRes.data || []).map((s: any) => s.stage_id));
        const filteredStages = (stagesRes.data || []).filter((s: any) => 
          allLocalOfficeIds.includes(s.office_id) || touchedStageIds.has(s.id)
        );
        
        topologyData = JSON.stringify({
          offices: enrichOffices(officesRes.data || []),
          stages: filteredStages,
          stageSteps: stepsRes.data || []
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch topology data for context hydration:', error);
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
          `organisation-wide statistics unless explicitly requested.\n` +
          `ROLE: You are an internal local helpdesk persona answering operations questions.\n` +
          `STRUCTURAL TOPOLOGY DATASET: ${topologyData}]`
        : `[SCOPE: EMPLOYEE-PERSONAL — This analysis is restricted to documents directly ` +
          `registered by the authenticated employee only. Do not reference other users' ` +
          `documents, other offices, or organisation-wide records.\n` +
          `ROLE: You are an internal local helpdesk persona answering operations questions.]`
      : `[SCOPE: ORGANIZATION-GLOBAL — This analysis spans the ENTIRE organisation ` +
        `(org_id: ${orgId}). Provide macro-level synthesis across all document records, ` +
        `office branches, routing pipelines, and historical transactions. ` +
        `Aggregate counts, cross-office comparisons, and org-wide trends are appropriate.\n` +
        `STRUCTURAL TOPOLOGY DATASET: ${topologyData}]`;

  const PAGE_MAPPING: Record<string, { name: string, data: string }> = {
    'dashboard': { name: 'Dashboard View', data: 'Total active tracking files count, quick action status metrics, and recent activity logs' },
    'documents': { name: 'Document Tracking Terminal', data: 'Complete data grid of organizational files, search queries, and status filters' },
    'stages': { name: 'Workflow Routing Designer', data: 'Active routing stages, pipeline tracks, and ordered step arrays' },
    'topology': { name: 'Workflow Routing Designer', data: 'Active routing stages, pipeline tracks, and ordered step arrays' },
    'working': { name: 'Current Working Terminal', data: "Documents currently assigned to the user's specific office queue" },
    'scan': { name: 'Smart Scanner Terminal', data: 'QR/Barcode scanner interface and rapid document validation forms' },
    'office': { name: 'Organization Management', data: 'Organization roster, active user directories, hierarchy assignments, and office branches' },
    'user': { name: 'Organization Management', data: 'Organization roster, active user directories, hierarchy assignments, and office branches' },
    'deliver': { name: 'Delivery Management', data: 'Physical transit routes, active delivery tasks, drop-off validations, and custody transfers' },
    'message': { name: 'Communication Center', data: 'Direct messaging threads and internal conversation logs' },
    'report': { name: 'Insights and Reports', data: 'Analytical charts, SLA compliance scores, and historical productivity trends' },
    'analytic': { name: 'Insights and Reports', data: 'Analytical charts, SLA compliance scores, and historical productivity trends' },
    'sla': { name: 'Insights and Reports', data: 'Analytical charts, SLA compliance scores, and historical productivity trends' }
  };

  let pageContextInstruction = '';
  if (body.current_page_context) {
    for (const [key, info] of Object.entries(PAGE_MAPPING)) {
      if (body.current_page_context.includes(key)) {
        pageContextInstruction = `\nCRITICAL USER STATE: The user is currently looking directly at the [${info.name}] screen. This view displays [${info.data}]. Prioritize your assistance, recommendations, and action models around features native to this terminal view.\n`;
        break;
      }
    }
  }

  // The AI-facing prompt includes the scope directive; the persisted user turn
  // stores only the clean user text so the chat log stays readable.
  const aiPrompt = `${scopeContextBlock}\n${pageContextInstruction}\nUser Request: ${prompt}`;

  // 5b. Classify intent — conversation, document revision, or new data request.
  const { intent, target_entity } = await classifyIntent(aiPrompt, memory, Boolean(activeDocument));

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

  // ── Branch S: SYSTEM_TOPOLOGY (Unified Dynamic Decision AI Engine) ───────────
  if (intent === 'SYSTEM_TOPOLOGY') {
    // 1. Fetch Topology
    let topologyPayload: { offices: any[]; stages: any[]; stageSteps: any[] } = { offices: [], stages: [], stageSteps: [] };
    try {
      if (topologyData) {
        topologyPayload = JSON.parse(topologyData);
      } else {
        const [officesRes, stagesRes, stepsRes] = await Promise.all([
          supabase.from('offices').select('*').eq('org_id', orgId),
          supabase.from('stages').select('*').eq('org_id', orgId),
          supabase.from('stage_steps').select('*').eq('org_id', orgId),
        ]);
        topologyPayload = { offices: officesRes.data || [], stages: stagesRes.data || [], stageSteps: stepsRes.data || [] };
      }
    } catch (parseErr) {
      console.error('[TopologyLookup] failed to parse/fetch topology:', parseErr);
    }

    // 2. Call LLM for Decision
    const systemContext = `Here is the active system topology for the user's organization. Use it to answer their questions accurately:\n${topologyData}`;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const decisionPrompt = `
      You are the central core engine of the FlowVision Workspace. You are provided with a complete, privacy-compliant snapshot of the organization's structural nodes (Stages, Offices, Steps) in your system prompt. Analyze the user's question, inspect this data footprint, and dynamically decide how the system should display the output.
      
      Return EXACTLY this JSON schema:
      {
        "response_mode": "canvas_topology" | "timeline_chat",
        "target_stage_id": "string | null",
        "reply_text": "Markdown conversational text answer or brief canvas summary acknowledgment"
      }
      
      - If the user wants to see a visual layout map (e.g., "show me the payroll route"), set response_mode: "canvas_topology", identify the target stage ID from the topology data (if no specific stage, leave null to show all), and set target_stage_id. Set reply_text to a brief acknowledgment.
      - If the user is asking a conversational question or reverse-lookup (e.g., "list all stages where office 1 is present"), set response_mode: "timeline_chat", target_stage_id to null, and write your full markdown answer in reply_text.

      STRICT FORMATTING CONSTRAINTS FOR \`reply_text\`:
      1. STRICT ID/UUID REDACTION: You are strictly forbidden from printing raw database IDs, UUID strings, tracking hashes, or internal system keys in the reply_text.
      2. ENFORCE CLEAN, SCANNABLE UI STRUCTURE: Strictly prohibit dense walls of raw bullet points or continuous itemized lists. Force the LLM to structure its situational updates using a clean, professional hierarchy: Start with a single concise, friendly, and encouraging introductory sentence. Use small subheadings with clean emojis (### 📈 Active Workflows, ### 🔍 System Action Items) to visually separate distinct core sections. Bold critical operational objects only (**Office 1**, **Payrol Stage**) to guide the user's eye naturally. Enforce clean double-line breaks between paragraph blocks to ensure maximum whitespace readability.
      3. ENFORCE NON-TECHNICAL, HUMAN-FRIENDLY TONE: Strip away all developer or backend database jargon. You must NEVER say terms like "hydrated topology data arrays," "context parameters," "metadata mapping matrices," or "database tables." Speak like a helpful, grounded human office supervisor. Explain system configurations and operations in everyday workspace language that anyone can easily understand.
      4. REFINE CONTEXTUAL DISCOVERY: Stop reciting static page descriptions from the mapping file. Cross-examine the live database snapshot first. Prioritize highlighting real, concrete operational assignments found in the data (like active offices or step sequences) and explain their real-world impact clearly.
      5. POLISHED TARGET SAMPLE FORMAT:
         "Based on your current Dashboard view, here is a quick look at your workspace focus areas this morning:

         ### 📈 Active Workflows
         **Office 1** is currently processing steps inside the **Payrol Stage** (Step 1). It looks like a great time to ensure documents moving through this station are reviewed promptly to keep your timeline on track.

         ### 🔍 System Operations
         Take a quick look at your recent activity log stream. Keeping an eye on this will help you track exactly how work is being handled across your active processing offices."
    `;
    
    let decision;
    try {
      const decisionCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: decisionPrompt + '\n\n' + systemContext },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });
      const rawDecision = decisionCompletion.choices[0]?.message?.content || '{}';
      decision = JSON.parse(rawDecision);
    } catch (error) {
      console.error('[TopologyLookup] Decision engine failed:', error);
      decision = { response_mode: 'timeline_chat', target_stage_id: null, reply_text: "I encountered an error processing the topology." };
    }

    // 3. Handle 'timeline_chat'
    if (decision.response_mode === 'timeline_chat') {
      try { await persistMessage(sessionId, 'assistant', decision.reply_text); } catch(e){}
      return {
        success: true,
        mode: 'assistant_chat',
        session_id: sessionId,
        reply: decision.reply_text,
        documentPayload: null
      };
    }

    // 4. Handle 'canvas_topology'
    const officeMap = new Map<string, string>();
    for (const o of topologyPayload.offices) {
      officeMap.set(String(o.id).trim().toLowerCase(), o.name || o.office_name || `Office ${String(o.id).slice(0, 8)}`);
    }

    let targetStages = topologyPayload.stages;
    if (decision.target_stage_id) {
       targetStages = targetStages.filter(s => String(s.id) === String(decision.target_stage_id));
    }
    
    // Build a structured HTML document showing each stage and its ordered steps.
    const stagesHtml = targetStages.map((stage: any) => {
      const stageIdTarget = String(stage.id).trim().toLowerCase();
      const stageSteps = topologyPayload.stageSteps
        .filter((s: any) => String(s.stage_id).trim().toLowerCase() === stageIdTarget)
        .sort((a: any, b: any) => (a.step_number ?? 0) - (b.step_number ?? 0));

      const stepsMarkup = stageSteps.length > 0
        ? stageSteps.map((step: any, idx: number) => {
            const officeIdTarget = String(step.office_id).trim().toLowerCase();
            const officeName = officeMap.get(officeIdTarget) || 'Unassigned Office';
            return `<tr>
              <td>Step ${step.step_number ?? idx + 1}</td>
              <td>${officeName}</td>
              <td>${step.description || step.action || '—'}</td>
            </tr>`;
          }).join('')
        : '<tr><td colspan="3">No steps configured for this stage.</td></tr>';

      return `
        <h3>${stage.name || stage.stage_name || 'Unnamed Stage'}</h3>
        ${stage.description ? `<p>${stage.description}</p>` : ''}
        <table>
          <thead><tr><th>Step</th><th>Office</th><th>Action</th></tr></thead>
          <tbody>${stepsMarkup}</tbody>
        </table>
      `;
    }).join('');

    const topologyHtmlContent = `
      <h2>Routing Pipeline Overview</h2>
      <p>This report maps <strong>${targetStages.length}</strong> stage(s) and
         <strong>${topologyPayload.stageSteps.length}</strong> routing step(s) across
         <strong>${topologyPayload.offices.length}</strong> registered office(s)
         for your organization.</p>
      ${stagesHtml || '<p>No routing stages are currently configured.</p>'}
    `;

    const topologyTitle = 'ROUTING PIPELINE TOPOLOGY MAP';
    const topologyDocPayload: DocumentPayload = {
      title: topologyTitle,
      htmlContent: topologyHtmlContent,
    };

    try {
      await persistMessage(sessionId, 'assistant', decision.reply_text, { documentPayload: topologyDocPayload });
    } catch (error) {}

    return {
      success: true,
      mode: 'INTENT_INTERNAL_TOPOLOGY',
      session_id: sessionId,
      reply: decision.reply_text,
      documentPayload: topologyDocPayload,
    };
  }

  // ── Branch B: structured NLQ data-builder & semantic search pipelines ───────
  const ttqtOutput = await translateTextToQuery(aiPrompt, memory);
  const mysqlDb = event.context.db;
  if (!mysqlDb) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MySQL database connector is not available on the request context.',
    });
  }

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

  // ── Branch S: Semantic Search ───────────────────────────────────────────
  if (intent === 'semantic_search') {
    const semanticReply = hydratedRows.length > 0 
      ? `I found ${hydratedRows.length} document(s) that match your semantic query. Check the items below:`
      : `I couldn't find any documents matching that specific semantic query in your records.`;

    try {
      await persistMessage(sessionId, 'assistant', semanticReply, { inlineDocuments: hydratedRows });
    } catch (error) {
      console.error('Postgres Insertion Error Details:', error);
    }

    return {
      success: true,
      mode: 'semantic_search',
      session_id: sessionId,
      reply: semanticReply,
      inlineDocuments: hydratedRows,
    };
  }

  // ── Branch D: Data Builder ──────────────────────────────────────────────
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
