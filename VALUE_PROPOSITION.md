# FlowVision — Value Proposition

**FlowVision: AI-Powered Document Monitoring Framework**
Bago City College · BS Information Systems Capstone
Alojado, A.V. · Gastador, R.A.S. · Salibio, J.A. · Delima, M.J.D.

---

## The Problem

The City Mayor's Office of Bago City and its departments process a high daily volume of
memoranda, requests, reports, permits, and inter-departmental communications almost entirely
by hand — logbooks, routing slips, personalized stamps, and physical filing cabinets. As
transaction volume grows, that manual process breaks down in five specific ways:

1. **Slow retrieval** — locating a document means physically searching filing cabinets and
   folders.
2. **No routing transparency** — once a document leaves a desk, no one can see where it is
   until the next office logs it.
3. **Misplacement and duplication** — documents get lost, duplicated, or left unmonitored
   between offices, breaking workflow continuity.
4. **No real-time status** — bottlenecks and workload imbalances across departments go
   unnoticed until they've already caused delays.
5. **Inconsistent record-keeping** — with no centralized digital store, historical records are
   hard to find and easy to lose.

These aren't hypothetical — they're the day-to-day operating conditions documented for the
City Mayor's Office and its 24 constituent departments (City Administrator, Sangguniang
Panlungsod, Accounting, CPDO, CHRMO, GSO, CHO, CEO, CENRO, CSWDO, CTO, BAC, and others).

## The Solution

FlowVision replaces that paper trail with a **fully built, deployed system**: a web platform
for office staff, a mobile Android app for couriers ("liaisons"), and a public tracking link
for citizens — spanning **92 live API endpoints** across tracking, document management,
organizations, messaging, AI, and reporting.

| Manual process today | FlowVision replaces it with |
|---|---|
| Logbook entry + personalized stamp | QR-coded digital registration at intake |
| Physically walking a document between offices | Chain-of-custody tracking: pickup, checkpoint, drop-off scans |
| Calling around to ask "where is it?" | Live status + push notifications on every status change |
| Manually re-reading a document to summarize it | AI-generated document summaries |
| Searching filing cabinets by memory | Plain-language (semantic) document search |
| Reacting to a backlog after it happens | Predictive workload forecasting that flags peak periods in advance |
| Ad-hoc, undocumented access to sensitive files | Role-based access control with confidentiality tiers (Public / Internal / Confidential / Classified) |

### The four-step flow

1. **Register & Stamp** — a document is digitized and QR-coded the moment it enters the system.
2. **Dispatch & Claim** — a courier claims the delivery; atomic locking prevents two people
   from claiming the same job.
3. **Instant Alert** — every status change (received, in transit, delayed) pushes a
   notification to the office, the courier, and the recipient.
4. **Arrive & Clear** — the checkpoint closes and the full transaction history stays
   searchable, in plain language, going forward.

## Who FlowVision Is Built For

- **Local Government Units (LGUs)** — a modern, secure platform that cuts delays, adds
  transparency, and protects sensitive information, improving public service delivery.
- **Government employees and administrators** — less manual tracking overhead, real-time
  visibility into their own workload, and clear accountability.
- **IT administrators / future system developers** — a reference implementation for
  AI-assisted, predictive-analytics-driven document management in a government setting.
- **Citizens** — a public link to track the status of a submitted document without having to
  call or visit an office.

## What's Verified in the Codebase (not just proposed)

| Claim | Where it's implemented |
|---|---|
| 92 live API endpoints | `server/api/**` (tracking, documents, org, employee, messages, reports, AI) |
| Web platform + Android app + public citizen link | Nuxt web app, Capacitor `android/` build, `server/api/public/org-validation-status.get.ts` |
| QR-based registration & chain-of-custody tracking | `server/api/tracking/{pickup,dropoff,checkpoint-pickup,checkpoint-done,advance,custody,timeline}.ts` |
| AI-generated summaries | `server/utils/groq.ts`, `server/api/client/dashboard-ai.post.ts` |
| Plain-language / semantic document search | `server/api/documents/semantic-search.post.ts`, `server/api/rag/query.ts` |
| Predictive workload forecasting | `server/api/employee/predictive-workload.get.ts` |
| Real-time status notifications | `server/api/notifications/*`, `server/api/documents/issues/*` |
| Role-based access (Super Admin / Admin / Dept. Head / Staff / Liaison) | `server/api/users/*`, `server/api/employee/*`, `app/pages/messenger/deliveries.vue` |

## What's Documented but Not Yet in the Codebase

To keep this honest: the thesis documentation also describes **OCR-based text extraction**
from scanned documents and **full Data Flow / ERD / Use Case diagrams** as design artifacts.
These are part of the system design but weren't independently verified against the current
codebase in this pass — flag for follow-up if they need to be confirmed before citing them in
a pitch.

## The Bottom Line

FlowVision is the only option in this space built specifically for LGU document workflows: it
combines proven document-tracking fundamentals (QR-based routing, real-time status) — the kind
already used by university and municipal systems in prior research — with intelligence those
systems lack: AI summarization, semantic search, and predictive workload forecasting, all
under role-based confidentiality controls appropriate for government records.

---
*Sources: FlowVision-AI-powered-Document-Monitoring-Framework(updated).docx (Chapters I, IV, V)
and the FlowVision codebase as of this document's generation.*
