# 🧠 FlowVision AI Intelligence System: Architecture & Operational Manual

This document provides a comprehensive, deep-dive explanation of the **FlowVision AI Intelligence System** as of its current state in **2026**. This manual ensures both development and architectural clarity by explaining exactly how raw data, multi-tenant boundaries, and real-time execution flow from user query to UI rendering.

---

## 🗺️ High-Level System Topology

The FlowVision AI system transitions from a static chatbot into a **dynamic, page-aware orchestrator** that makes real-time UI execution decisions while respecting security limits. It acts as the central intelligence engine for the platform, parsing colloquial queries and transforming them into exact data pipeline actions.

### Multi-Tenant & Security Boundaries
Security is enforced at the earliest point of execution in `/server/api/rag/query.ts`:
- **GLOBAL Scope:** Client accounts receive full-organization visibility.
- **LOCAL Scope:** Employee accounts are strictly hard-scoped to their assigned `office_id`. The system explicitly filters out any document or topology structural data that does not belong to or pass through their localized office branch.
- **Org Isolation:** Data is unconditionally scoped by `org_id` verified via secure session cookies, preventing cross-tenant data leakage at the query builder layer.

---

## ⚙️ The AI Execution Pipeline

When a user submits a query via the AI Chat Interface, the system executes a sophisticated pipeline to determine the best response mechanism.

### 1. Context Hydration
Before the LLM even sees the prompt, the backend intercepts the request and injects structural background data (the "Topology"):
- **Page-Awareness:** The system tracks exactly which screen the user is viewing (e.g., Dashboard, Document Terminal, Routing Designer) and prepends a `CRITICAL USER STATE` directive to prioritize native tools and features for that terminal.
- **Rolling Memory:** The last 5 turns of conversation and the currently active document payload are pulled from the session database to maintain conversational state.
- **Structural Topology Dataset:** The system queries `offices`, `stages`, and `stage_steps`. This JSON topology is injected into the LLM's system prompt, allowing the AI to understand exactly how the organization routes its work.

### 2. Intent Routing & Dynamic Decision Engine
The query is routed to the `classifyIntent` engine, which parses the hydrated prompt and assigns it one of several specialized execution branches:

#### 🟢 Branch S: System Topology (Dynamic Routing Lookup)
- **Trigger:** Queries regarding workflows, office routing, stages, or system configuration (e.g., *"Show me the payroll route"*, *"Which stages involve the Sydney office?"*).
- **Execution:** Bypasses document tables entirely. A dedicated Groq decision engine analyzes the injected structural topology dataset and decides whether to render a `canvas_topology` (an HTML table mapped visually in the right-hand canvas) or a `timeline_chat` (a conversational explanation).
- **Result:** Provides real-time visual mapping of organizational pathways.

#### 🔵 Branch B: Structured NLQ (Natural Language to Query)
- **Trigger:** Queries asking for data extraction, reporting, or broad document filtering (e.g., *"Show me all high priority contracts from last week"*).
- **Execution:** Uses `translateTextToQuery` to parse the conversational prompt into strict filter objects. Builds a dynamic Supabase query, fetches the raw metadata, and extracts the text blobs from the MySQL connector.
- **Result:** Pushes a structured dataset or spreadsheet matrix to the user's right-hand canvas.

#### 🟡 Branch B (Variant): Semantic Search
- **Trigger:** Colloquial requests for specific documents (e.g., *"Can you find the latest HR policy?"*).
- **Execution:** Bypasses heavy canvas formatting. Returns lightweight metadata objects directly into the chat timeline.
- **Result:** Renders clean, clickable document cards inline within the chat bubble.

#### 🟠 Branch R: Iterative Document Revision
- **Trigger:** Requests to edit, reformat, or alter a document currently active in the user's session (e.g., *"Format this into a table"*, *"Summarize this contract"*).
- **Execution:** Modifies the cached `activeDocument` payload in place without re-querying the database, preserving system resources and token limits.
- **Result:** Updates the canvas with the revised document.

#### 🟣 Branch A: Conversational NLP
- **Trigger:** General chat, platform support, or conversational follow-ups.
- **Execution:** Standard conversational response using the `llama-3.3-70b-versatile` Groq model.
- **Result:** A helpful, grounded text response adopting a "local helpdesk" persona.

---

## ⏱️ Predictive SLA Analytics (Dashboard Integrations)

The Intelligence Engine extends beyond the chat interface and directly powers the **Dashboard AI Executive Digest** (`/server/api/client/dashboard-ai.post.ts`).

- **Live Processing Velocity:** The system scans `document_tracking_events` and computes the exact time differences between sequential `ARRIVED_AT_OFFICE` and `IN_TRANSIT` status flags.
- **Matrix Grouping:** These durations are averaged and grouped by `category_id` and `office_id` to create a Predictive SLA Insights Matrix.
- **Executive Digest:** This matrix, alongside active metrics, is fed to the LLM upon dashboard load. The AI autonomously highlights specific operational bottlenecks (e.g., *"Legal Contracts in the Melbourne Office are currently running 12 hours behind standard SLA"*), providing immediate, actionable intelligence to managers.

---

## 🛠️ Model Configurations & Fallbacks

- The system primarily leverages **Groq's `llama-3.3-70b-versatile`** model for rapid intent routing, topology decisions, executive digests, and conversational responses to ensure blazing-fast execution speeds without hitting severe rate limits.
- The intelligence engine enforces strict ID/UUID redaction to ensure internal database keys are never exposed in natural language output.
- Emojis are purposefully leveraged for clean, scannable hierarchies (e.g., `### ⏱️ Predictive SLA Insights`) to guide the user's eye naturally.
