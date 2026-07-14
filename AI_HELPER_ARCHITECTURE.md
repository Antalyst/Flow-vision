# FlowVision AI Workspace Architecture: Core Helper & Discovery Matrix
## Direct Conversational Skills vs. Canvas Rendering Layouts

This specification defines the functional scope of the FlowVision Intelligence Workspace (/client/ai and /employee/ai). It explicitly maps how the workspace routes natural language inputs to ensure conversational assistant requests stay localized within the left timeline, while heavy reports and matrices render inside the right canvas.

---

## 1. Split-Pane UI Architectural Mapping

The workspace enforces a clear separation of interface concerns to prevent context switching:

### A. The Left-Pane Conversational Timeline
- **Purpose:** Acts as the primary interactive space for user prompts, thinking status animations, and native conversational chat turns.
- **AI Helper Skills Integration:** All instructional queries, system setups, configuration questions, and colloquial semantic document cards are handled entirely within this timeline bubble stream. No right-canvas document injection is permitted for conversational interactions.

### B. The Right-Pane Sliding Canvas
- **Purpose:** Handles dense, multi-row report synthesis, spreadsheet matrix exports, and high-fidelity structural data visualizations.
- **Explicit Trigger Bounds:** The canvas updates *only* when the system successfully executes a formal `data_query` (generating downloadable spreadsheet grids) or a deterministic `topology_lookup` (rendering structured process mapping templates).

---

## 2. Dynamic Intent Routing Architecture

The core routing suite (`server/utils/intentRouter.ts`) evaluates natural language queries by categorizing them into four distinct structural intents:

### 2.1 `SYSTEM_ASSISTANT_HELP` (New Conversational Layer)
- **Trigger Phrasing Examples:** "Show me all the offices of my organization", "How do I create a new table?", "Explain how messengers update document tracking".
- **Execution Workflow:** Bypasses all text-to-SQL conversions, regex file-name captures, and canvas overrides. The AI reads the organization's cached background context and speaks directly to the user within a markdown chat bubble in the left timeline.
- **Output Design:** Bulleted breakdowns, step-by-step guides, or direct text descriptions.

### 2.2 `semantic_search` (Timeline Context Lookup)
- **Trigger Phrasing Examples:** "Find the record for the municipal budget matching a discrepancy", "Where is that document from yesterday?"
- **Execution Workflow:** Resolves entity parameters through the `documents` table, extracts target matching rows, and pushes the data back to the interface.
- **Output Design:** Formatted inline clickable document cards nested inside the left conversation stream.

### 2.3 `topology_lookup` (Right Canvas Process Mapping)
- **Trigger Phrasing Examples:** "Show me the routing steps for the Treasury division", "Explain the payroll workflow stages".
- **Execution Workflow:** Utilizes fuzzy matching (Levenshtein distance) over `public.stages` and `public.stage_steps` to isolate valid system pipelines.
- **Output Design:** Renders an interactive structured HTML roadmap timeline directly on the right-side canvas.

### 2.4 `data_query` (Right Canvas Matrix Generation)
- **Trigger Phrasing Examples:** "Generate an operational report of all approved files this quarter."
- **Execution Workflow:** Processes large record sets across tracking logs and event entries.
- **Output Design:** Renders a high-contrast tabular spreadsheet engine with one-click `.xlsx` / `.docx` exports.

---

## 3. Conversational Scope Isolation (Tenant Security)

The AI workspace respects the identical multi-tenant data boundaries enforced by the primary schema layers:
- **Client Workspace Scope:** Automatically expands the AI helper's access context to the entire organizational topology (`org_id`), enabling general assistance spanning all branches.
- **Employee/Sub-User Workspace Scope:** Sandboxes helper interactions strictly to the operating terminal node parameters. The AI adopts a "local desk assistant persona," ensuring guidance remains locked to their specific office or sub-office table desk.

---

Verify that all systems observe these structural boundaries to maintain clean, context-aware interface responses across the FlowVision application.
