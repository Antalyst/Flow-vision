# FlowVision AI Workspace Upgrades: Architecture & Implementation Guide

This document outlines the specific changes made to upgrade the FlowVision Intelligence Workspace (`/client/ai` and `/employee/ai`) with active context hydration, inline semantic search, and enriched timeline thinking stages.

## 1. What Was Done

We upgraded the AI backend and frontend to be more context-aware and to handle colloquial "semantic search" queries without forcing a full spreadsheet generation.

*   **Context Hydration Prompt Overlay:** The backend now intercepts the user's role (Client vs. Employee) and dynamically queries the database for the structural routing topology (`offices`, `stages`, `stage_steps`). It injects this JSON data directly into the LLM's system prompt. For employees, this is strictly filtered to their assigned sub-offices, and the LLM is instructed to adopt a "local helpdesk persona".
*   **Semantic Document Discovery:** A new intent, `semantic_search`, was introduced. When a user asks a colloquial question to find a specific document, the backend bypasses the heavy spreadsheet layout logic. Instead, it returns the raw document metadata objects to the frontend.
*   **Topology Lookup (Route/Stage/Workflow queries):** A new intent, `topology_lookup`, was introduced. When a user asks about routes, stages, steps, pipelines, or workflow configurations, the backend now bypasses the `documents` table entirely and queries `stages`, `stage_steps`, and `offices` instead. It renders a step-by-step operational routing timeline in the right-hand canvas.
*   **Live Transherence (Thinking Stages):** The frontend UI was updated to show context-specific loading messages (e.g., "Applying global routing topology map analysis...", "Mapping routing pipeline topology structures...") to reflect the new backend logic. The frontend now natively renders the returned semantic search documents as clean, clickable cards inside the chat timeline bubble.

---

## 2. Specific Files Updated

### A. `server/api/rag/query.ts`
*   **What changed:** 
    *   Added a topology data fetch block right before the LLM prompt is assembled. It queries `offices`, `stages`, and `stage_steps` using the Supabase service role client.
    *   Modified `scopeContextBlock` to include the stringified topology JSON and persona instructions.
    *   Added a new execution branch for `intent === 'semantic_search'` that skips `generateDocumentTemplate` and `synthesizeDocumentPayload`. It instead returns `mode: 'semantic_search'` and `inlineDocuments: hydratedRows`.
    *   **NEW:** Added `Branch T` for `intent === 'topology_lookup'`. When triggered, it completely bypasses the `documents` table query. Instead, it re-uses the already-fetched topology data (or fetches fresh if empty), builds an office lookup map for human-readable names, and deterministically renders a structured HTML document with `<h3>` stage headers, ordered step tables (`Step | Office | Action`), and an executive summary. This document is passed as a `documentPayload` to the right-side canvas.
*   **How to deal with it:** If you add new routing tables (e.g., `stage_rules`), you can query them in the topology fetch block (around line 203) and append them to the `topologyData` JSON object. Then update Branch T to render them in the HTML output.

### B. `server/utils/intentRouter.ts`
*   **What changed:**
    *   Added `'semantic_search'` and `'topology_lookup'` to the `QueryIntent` type union.
    *   Updated the `systemInstruction` rules to instruct the Llama-3 model to output `semantic_search` for colloquial document-finding queries, and `topology_lookup` when the user asks about routes, stages, steps, workflows, pipelines, or office routing configurations.
    *   Updated the `classifyIntent` function to return the `'semantic_search'` or `'topology_lookup'` strings when parsed.
*   **How to deal with it:** If you notice the AI is miscategorizing route/stage queries as `data_query` (which hits the documents table and returns empty), edit the `topology_lookup` rule description or add more few-shot examples in the `systemInstruction`. The rule is defined around lines 34–39 in the file.

### C. `app/components/ai/AiCanvasWorkspace.vue`
*   **What changed:**
    *   Updated the `thinkingStages` computed property to include the new loading strings ("Applying global routing topology map analysis...", "Executing semantic query over internal tracking ledger histories...", etc.).
    *   Updated the `ChatMessage` interface to accept `inlineDocuments?: Record<string, any>[] | null`.
    *   Added a new Vue `<template>` block inside the Assistant chat bubble to iterate over `msg.inlineDocuments`. If populated, it renders them as a list of clickable, styled document cards.
    *   Updated the `$fetch('/api/ai/messages')` and `$fetch('/api/rag/query')` payload destructuring to properly map the incoming `inlineDocuments` data to the `chatHistory` array.
*   **How to deal with it:** If you want to change what happens when a user clicks on an inline document card, you can bind an `@click` event to the `<button>` element wrapping the inline document in the template (currently, it just serves as a visual link/card, but you can route it to a document detail page or open it in the canvas).

---

## 3. How to Test and Deal With the Features

1.  **Testing the Context Hydration:**
    *   Log in as an **Employee** and go to the AI Workspace.
    *   Ask: *"What stages affect my office?"* or *"What should I do if an item is missing?"*
    *   The AI will use its "local helpdesk persona" and accurately list only the stages bound to the employee's assigned office nodes.
2.  **Testing Semantic Search:**
    *   In the AI Workspace, ask a casual question like: *"Can you find the document that had a damage discrepancy earlier today?"*
    *   Observe the "Thinking Stages" ticker change to "Executing semantic query over internal tracking ledger histories...".
    *   The AI should reply with a short conversational message, and immediately below it, you will see styled document cards inline within the chat bubble, rather than the right-side Canvas opening up with an Excel-like grid.
3.  **Testing Topology Lookup (Routes/Stages/Workflows):**
    *   Ask: *"Show me all the routes"*, *"What stages does Treasury have?"*, or *"How is our routing configured?"*
    *   The intent router will classify this as `topology_lookup`, completely bypassing the `documents` table.
    *   The right-side Canvas will open with a structured **"Routing Pipeline Topology Map"** document showing each stage as a header, with an ordered table of steps listing the Step number, Office name, and Action/Description.
    *   **Previously this failed** with "No records matched" because it only queried the documents table.
4.  **Testing Standard Data Queries:**
    *   Ask: *"Generate a report of all approved documents this year."*
    *   The intent router will classify this as `data_query`, and the heavy right-side Canvas will open with the synthesized HTML/Spreadsheet matrix as it did previously.
