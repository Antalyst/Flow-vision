# FlowVision AI Capabilities

This document outlines the Artificial Intelligence capabilities deeply integrated into the FlowVision municipal document tracking platform. The system uses a combination of Natural Language Processing (NLP), Natural Language Querying (NLQ), Predictive Analytics, and Generative AI (powered by Groq / LLaMA) to automate and augment workflows.

---

## 1. Intelligent Document Content Analysis
When a document (PDF, Word, TXT, etc.) is uploaded, the system automatically analyzes its content to extract meaningful metadata.
- **How it works:** The raw file buffer is parsed into text (`documentParser.ts`) and fed into the AI Analyzer (`aiAnalyzer.ts`). The LLM model is instructed to read the text and return a concise, human-readable title and a precise, exactly 2-sentence summary.
- **Value:** Users don't need to manually type out descriptions or titles; the system immediately understands and categorizes the document's content.

## 2. Smart Intent Routing Engine
FlowVision features a chat interface that is governed by an intelligent gateway (`intentRouter.ts`). It ensures that casual conversations don't trigger heavy database queries, and complex queries are routed to the correct engine.
- **How it works:** Every user prompt is classified into one of the following intents:
  - **`SYSTEM_TOPOLOGY`**: Questions about system configuration, offices, workflows, routing sequences, or reverse lookups (e.g., "Which workflows contain the Finance office?").
  - **`data_query`**: Requests to fetch, list, filter, or summarize municipal document datasets (e.g., "Show me approved subsidy documents from 2024").
  - **`semantic_search`**: Colloquial questions to find one or two specific documents (e.g., "Where is that delayed budget record from last Tuesday?").
  - **`document_summary`**: Explicit requests to deeply read and summarize a specific document (e.g., "Summarize the Endorsement Letter").
  - **`document_revision`**: Requests to restyle or reformat a currently viewed AI-generated report (e.g., "Make this a spreadsheet" or "Add a signature block").
  - **`conversation`**: General small talk, greetings, or clarifications.

## 3. Contextual Semantic Search (RAG)
Instead of relying purely on exact keyword matches, FlowVision can find documents based on the *meaning* of what the user is asking (`semantic-search.post.ts`).
- **How it works:** The user's natural language query is compared against a condensed list of available documents. The AI intelligently selects the documents that genuinely match the intent and provides a 1-sentence explanation of *why* it matches (e.g., "This is the Q3 financial report uploaded by John.").

## 4. NLQ Architecture & Data Synthesis
FlowVision can dynamically generate customized reports, spreadsheets, and narrative documents from raw data (`aiDataBuilder.ts`).
- **How it works:** The system sits between the database hydration layer and the Gen AI Template Formatter. It deterministically fuses raw database rows with an AI-generated layout blueprint. 
- **Capabilities:**
  - Automatically infers column data types (dates, text, status, numbers).
  - Generates KPIs (Key Performance Indicators) such as total records, status breakdowns, and yearly breakdowns.
  - Can construct either a **Tabular Grid** (like a spreadsheet) or a **Narrative Report** (text-heavy summary blocks).
  - Drives both the interactive frontend canvas view and export formats (Word/Excel).

## 5. Predictive Workload Modeling
The system anticipates bottlenecks and future workload spikes for employees and offices (`predictive-workload.get.ts`).
- **How it works:** The predictive engine analyzes historical document flow in 2-hour intervals over the past 8 hours. By calculating the "momentum" of recent document creation and combining it with the count of documents currently `IN_TRANSIT`, the system calculates a predicted trajectory of incoming workload for the next 2, 4, and 6 hours.
- **Value:** Managers and employees can proactively prepare for incoming document spikes before they physically arrive at the office.

## 6. Secure Conversational Memory
The AI retains context across multiple turns of conversation while strictly maintaining data security and multi-tenant isolation (`aiSession.ts`).
- **How it works:** The system maintains a rolling memory window (typically 5 turns) so the AI remembers what was just discussed. It enforces strict ownership checks (hard-scoped to `org_id` and `user_id`) to ensure users can never query or interact with data outside of their organization's scope.
