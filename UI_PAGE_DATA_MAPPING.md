---

# FlowVision UI Page Data & Capability Mapping Matrix

This document outlines the exact data properties, tables, and interaction boundaries exposed on each frontend page. This matrix allows the AI Helper to maintain total page-context awareness.

---

## 1. Dashboard View (/client/dashboard or /employee/dashboard or /messenger/dashboard)
- **Primary Data Displayed:**
  - Total active tracking files count.
  - Quick action status metric cards (Pending, In-Transit, Approved).
  - Recent activity logs table stream.
- **Available Database Intersections:** `public.documents`, `public.tracking_logs`
- **AI Helper Integration Potential:** The AI can summarize recent activity spikes, flag documents that have been stuck in an office for over 48 hours, or provide quick calculations of overall weekly workflow efficiency.

---

## 2. Document Tracking Terminal (/client/documents or /employee/documents)
- **Primary Data Displayed:**
  - Complete data grid of organizational files.
  - Active search bar queries and status dropdown filters.
  - Detail pane showing tracking metadata (e.g., barcode, current holder, creation date).
- **Available Database Intersections:** `public.documents`, `public.offices`
- **AI Helper Integration Potential:** The AI can act as an advanced natural language filter (e.g., "Find all payroll documents uploaded by Office 1 that are missing signatures"), or write automatic summary briefs of massive layout grids.

---

## 3. Workflow Routing Designer (/client/stages, /client/settings/topology or /employee/stages)
- **Primary Data Displayed:**
  - List of active routing stages and pipeline tracks.
  - Ordered step arrays linked to specific processing office stations.
- **Available Database Intersections:** `public.stages`, `public.stage_steps`, `public.offices`
- **AI Helper Integration Potential:** The AI can perform structural sanity checks (e.g., "Warning: Office 2 is assigned to Step 3, but it has no assigned employees right now"), or suggest optimal alternative routing bottlenecks based on system load.

---

## 4. Current Working Terminal (/client/current-working or /employee/working)
- **Primary Data Displayed:**
  - Documents currently assigned to the user's specific office queue.
  - Action buttons to advance documents to the next workflow stage.
- **Available Database Intersections:** `public.documents`, `public.tracking_logs`, `public.offices`
- **AI Helper Integration Potential:** The AI can highlight documents approaching SLA limits within the user's current queue, or suggest the most critical document to work on next.

---

## 5. Smart Scanner Terminal (/client/scan or /employee/scan or /messenger/scan)
- **Primary Data Displayed:**
  - QR/Barcode scanner interface.
  - Rapid document validation and ingestion forms.
- **Available Database Intersections:** `public.documents`, `public.tracking_logs`
- **AI Helper Integration Potential:** The AI can perform immediate outlier detection on scanned items, such as warning the user if a scanned barcode doesn't match expected staging sequences.

---

## 6. Organization Management (/client/office, /client/user-management, /employee/offices, /employee/users)
- **Primary Data Displayed:**
  - Organization roster, active user directories, and hierarchy assignments.
  - Office branch creation and settings.
- **Available Database Intersections:** `public.users`, `public.offices`, `public.roles`
- **AI Helper Integration Potential:** The AI can analyze workload distribution among employees and recommend reassigning personnel to overloaded offices.

---

## 7. Delivery Management (/messenger/deliveries or /messenger/delivery)
- **Primary Data Displayed:**
  - Physical transit routes, active delivery tasks, and courier assignments.
  - Drop-off validations and custody transfers.
- **Available Database Intersections:** `public.deliveries`, `public.tracking_logs`, `public.offices`
- **AI Helper Integration Potential:** The AI can optimize delivery paths between offices or estimate delays based on historical messenger transit times.

---

## 8. Communication Center (/client/messages or /employee/messages)
- **Primary Data Displayed:**
  - Direct messaging threads between employees and clients.
  - Internal conversation logs.
- **Available Database Intersections:** `public.conversations`, `public.direct_messages`
- **AI Helper Integration Potential:** The AI can draft quick replies, summarize long message threads, or automatically detect when a conversation requires opening a document tracking ticket.

---

## 9. Insights and Reports (/client/reports, /client/workload-analytics, /client/sla-compliance, /employee/reports)
- **Primary Data Displayed:**
  - Analytical charts, SLA compliance scores, and historical productivity trends.
- **Available Database Intersections:** `public.documents`, `public.tracking_logs`, `public.offices`
- **AI Helper Integration Potential:** The AI can generate natural language executive summaries of the reports, spotting long-term trends in office efficiency.

---

## 10. AI Intelligence Workspace (/client/ai or /employee/ai)
- **Primary Data Displayed:**
  - Split-pane timeline chat and dynamic canvas rendering.
  - Conversational multi-turn history.
- **Available Database Intersections:** `public.chat_sessions`, `public.chat_messages`, all major public tables.
- **AI Helper Integration Potential:** The central nervous system of the app. Can pull data from any module and synthesize it directly into the right-hand canvas based on natural language queries.

---

## 11. Public Landing Pages (/index, /about, /features, /pricing, /contact, /tracking)
- **Primary Data Displayed:**
  - Marketing copy, feature overviews, public tracking widgets.
- **Available Database Intersections:** `public.documents` (limited public tracking views).
- **AI Helper Integration Potential:** Limited to public support chatbots or answering FAQs based on marketing materials.

---

## 12. Authentication Pages (/login, /register, /callback)
- **Primary Data Displayed:**
  - Login forms, OAuth callbacks, registration pipelines.
- **Available Database Intersections:** `public.users`
- **AI Helper Integration Potential:** None strictly needed, though could guide users through complex signup validation errors.
