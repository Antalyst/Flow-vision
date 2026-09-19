# FlowVision — Full System Feature Catalog

This is a working inventory of everything built in the FlowVision codebase, organized by portal
and by backend system. It's meant as raw material for identifying the value proposition
yourself — not a pitch. Every feature below is tagged:

- ✅ **Live** — real logic, real database queries, verified in code
- 🧪 **Heuristic** — real and working, but rule-based/arithmetic rather than "AI" in the ML sense
- 🎭 **Mock/demo** — UI exists but runs on hardcoded data or simulated responses, not wired to the backend yet

Four portals share one codebase, gated by role at `app/middleware/auth.global.ts`:

| Role | Zone | Who |
|---|---|---|
| `client` | `/client/*` | Org admin / office dispatch desk |
| `employee`, `employee_sub_user` | `/employee/*` | Department head & staff |
| `messenger` | `/messenger/*` | Courier / liaison |
| *(none — public)* | `/public-users/*`, `/tracking` | Citizens |

Plus a public marketing site: `/`, `/features`, `/pricing`, `/about`, `/contact`.

---

## 1. Client Portal (`/client/*`) — Org Admin / Dispatch

The command center for an organization. 20 pages, backed by ~35 API endpoints.

| Feature | Status | Where |
|---|---|---|
| Executive dashboard — KPIs (doc count, active count, avg processing hours, SLA %), 7-day trend sparklines, 7-day traffic forecast (linear regression) | ✅ | `dashboardAnalytics.ts`, `client/dashboard.get.ts`, `dashboard/index.vue` |
| Per-office congestion/dwell-time stats, workstation busy/idle/in-transit counts, top offices by velocity | ✅ | `dashboardAnalytics.ts`, `OfficeVelocityMatrix.vue`, `WorkstationLoadDonut.vue` |
| AI executive digest — narrative summary over SLA insight data (avg hours per doc-category × office) | ✅ (Groq LLM) | `client/dashboard-ai.post.ts`, `AiExecutiveDigest.vue` |
| SLA compliance tracking — per-document overdue/at-risk status vs configured SLA | ✅ | `portalAnalytics.ts` → `client/sla-compliance.get.ts`, `sla-compliance.vue` |
| Workload analytics — pending/flagged/in-transit per office, bottleneck detection | ✅ | `portalAnalytics.ts` → `client/workload-analytics.get.ts`, `workload-analytics.vue` |
| Document registry — upload, register, view, print QR sticker | ✅ | `documents/{index,upload,register}`, `DocumentRegisterModal.vue`, `DocumentQrStickerModal.vue` |
| QR embedded directly into the .docx/.xlsx file itself (not just a sticker) | ✅ | `stampDocumentQr.ts` |
| Plain-language ("semantic") document search | ✅ (LLM match, not vector search) | `documents/semantic-search.post.ts`, `SemanticSearchModal.vue` |
| AI chat assistant — natural-language data queries, org-topology Q&A, document summarization, generated report canvas | ✅ (Groq, multi-intent pipeline) | `rag/query.ts`, `AiCanvasWorkspace.vue` |
| Workflow stage / route builder (custom multi-office routing paths) | ✅ | `stages/*`, `stageComp.vue` |
| Office network management | ✅ | `office/*`, `officeComp.vue` |
| Own dispatch/intake desk ("Station") with its own scannable QR | ✅ | `clientStation.ts`, `client/station.get.ts`, `ClientStationQrPage.vue` |
| User & role management, employee whitelist upload | ✅ | `users/*`, `org/employee-whitelist/*`, `UserManagementComp.vue` |
| Org settings, org code/validation | ✅ | `org/*` |
| Employee whitelist management (upload eligible-hire list, view, clear) | ✅ | `org/employee-whitelist/{upload,index,clear}` |
| Activity log (full audit trail) | ✅ | `activityLog.ts`, `activity-logs/index.get.ts`, `client/activity.vue` |
| Messages (1:1 + group threads) | ✅ | `messages/*`, `client/messages.vue` |
| Notifications (status changes, pickup accept) | ✅ | `notifications/*` |
| Operational reports — free-text reports from staff, auto-notify org admins | ✅ | `operationalReports.ts`, `reports/*` |
| Feedback submission | ✅ | `client/feedback.post.ts` |
| Document issue threads (flag/discuss/resolve a document problem) | ✅ | `documents/issues/*` |

## 2. Employee Portal (`/employee/*`) — Department Staff

Same engine as the client portal, scoped to one office. The AI layer hard-enforces
**LOCAL scope** — an employee can only query/see their own office's data (`rag/query.ts`).

| Feature | Status | Where |
|---|---|---|
| Dashboard (office-scoped) | ✅ | `employee/dashboard.vue`, `employee/index.vue` |
| Document intake / registration view | ✅ | `EmployeeDocumentsView.vue`, `documents/index.get.ts` |
| QR scan to receive/clear a document at a checkpoint | ✅ | `employee/scan.vue`, `tracking/checkpoint-done.post.ts` (alias of `complete-checkpoint.post.ts`) |
| Predictive workload forecast — buckets recent doc volume into 2/4/6/8-hr windows, projects 2/4/6-hr-ahead load | 🧪 heuristic (arithmetic momentum model, not ML) | `employee/predictive-workload.get.ts` |
| Flagged documents / compliance queue | ✅ | `FlaggedDocumentsPage.vue`, `employee/flagged.vue` |
| Stage/route visibility | ✅ | `EmployeeStagesView.vue` |
| Office roster & own-office management | ✅ | `employee/offices/*`, `employee/my-offices.get.ts` |
| Staff/user management (department scope) | ✅ | `employee/users/*` |
| AI assistant (office-scoped) | ✅ | `employee/ai.vue` → `rag/query.ts` |
| Ledger (transaction/processing history) | ✅ | `employee/ledger.get.ts` |
| Document issue chat panel | ✅ | `DocumentIssueChatPanel.vue` |
| Messages, notifications, reports, activity, settings | ✅ | `employee/{messages,notifications,reports,activity,settings}.vue` |
| QR card for the office itself (wall-mounted checkpoint QR) | ✅ | `OfficeQrCard.vue` |

## 3. Messenger Portal (`/messenger/*`) — Courier / Liaison

The relay layer. This is the QR-scan-driven handoff chain that physically moves a document
between offices.

| Feature | Status | Where |
|---|---|---|
| Delivery task list ("To-Do") | ✅ | `messenger/deliveries.vue` |
| Pickup at client station (scan the org's dispatch-desk QR) | ✅ | `tracking/checkpoint-pickup.post.ts` |
| Pickup / begin transit (scan document or manifest) | ✅ | `tracking/pickup.post.ts` |
| Drop-off at destination office (scan office-wall QR; validates it matches the document's next route step) | ✅ | `tracking/dropoff.post.ts` |
| Full document status state machine: `CREATED → PICKED_UP → IN_TRANSIT → ARRIVED_AT_OFFICE → COMPLETED / DISCREPANCY_REPORTED` | ✅ | `tracking/advance.post.ts` |
| Live custody/chain-of-custody timeline per document | ✅ | `tracking/{custody,timeline,trip,queue}.get.ts`, `DocumentTimeline.vue`, `MessengerCustodyDrawer.vue` |
| QR scanner UI | ✅ | `QrScanner.vue`, `messenger/scan.vue` |
| Delivery/transaction history ("Liaison Log") | ✅ | `messenger/history.vue`, `messenger/history.get.ts` |
| Reports, notifications, settings | ✅ | `messenger/{reports,notifications,settings}.vue` |

## 4. Public-Users Portal (`/public-users/*`, `/tracking`) — Citizens

**⚠️ Not yet wired to the live backend.** These pages exist as UI scaffolding / demo content
only — flag this before citing citizen-facing features as shipped.

| Feature | Status | Where |
|---|---|---|
| "My Documents" list/detail view | 🎭 mock | `public-users/index.vue` — renders from a hardcoded `documentList` array, no API call |
| Citizen AI assistant chat | 🎭 mock | `public-users/ai.vue` — responses are `setTimeout` + keyword string-matching, no backend call |
| Public "Global Tracking" search page | 🎭 mock | `tracking.vue` — search always simulates the same fake `PKG-0x8F2A` result with a static 3-node map and a static audit log |
| Citizen profile | 🎭 mock | `public-users/profile.vue` — every field (name, email, citizen ID, verified badge) is a hardcoded `readonly` input, no API call; "Edit Profile" button has no handler |
| Org validation status (real backend, unused by the above pages) | ✅ but orphaned | `public/org-validation-status.get.ts` |

**Implication for the value proposition:** "a public tracking link for citizens" is a documented
design goal, and one real supporting endpoint exists, but the citizen-facing UI itself does not
yet call it. Don't cite this as a shipped, working feature without rebuilding the page to use
real data.

## 5. Marketing Site (public, unauthenticated)

| Page | Purpose |
|---|---|
| `/` (`index.vue`) | Landing page — hero, AI features section, brand reveal, scroll-video section |
| `/features` | "The Complete Architecture" — workflow engine, chain-of-custody telemetry, AI (smart summarization, NLQ), SLA/analytics observability |
| `/pricing` | Pricing tiers |
| `/about`, `/contact` | Static info pages |

## 6. Core Backend Systems (shared across portals)

### AI pipeline (Groq, `llama-3.3-70b`)
A single chat endpoint (`server/api/rag/query.ts`) fronts everything:
1. **Intent classification** (`intentRouter.ts`) — routes a prompt to one of: `conversation`,
   `data_query`, `document_revision`, `semantic_search`, `SYSTEM_TOPOLOGY`, `document_summary`.
   Fails safe to `conversation` on error.
2. **Data query pipeline** — natural language → structured query spec (`ttqt.ts`, "text-to-query
   translation") → Supabase query, scoped by org/role → MySQL blob hydration for matched
   documents (`hybridDatabase.ts`) → formatted HTML report or data table
   (`documentSynthesizer.ts`), rendered on an AI canvas.
3. **Semantic search** (`documents/semantic-search.post.ts`) — LLM reads a condensed list of
   documents and picks semantic matches with explanations. **This is LLM-based matching, not
   embedding/vector search** — worth knowing before calling it "semantic search" in a pitch.
4. **Document summarization** — AI-generated title + 2-sentence description on upload
   (`aiAnalyzer.ts`), and on-demand markdown summaries of a specific document's extracted text.
5. **Topology Q&A** — the AI can answer "which office handles X" / show a routing map using the
   org's real office/stage/route data.
6. **Scope enforcement** — `employee` role is hard-restricted to LOCAL (own office) data; only
   `client` (admin) can query org-wide.

### Document relay / chain-of-custody engine
A five-state machine (`CREATED → PICKED_UP → IN_TRANSIT → ARRIVED_AT_OFFICE →
COMPLETED/DISCREPANCY_REPORTED`) driven entirely by QR scans at each handoff: client station →
courier pickup → office drop-off → employee checkpoint clearance → next leg or completion.
Every transition writes an immutable `tracking_events` row and triggers a notification.

### QR & document generation
- Deep-link QR payloads (`flowvision://track/doc?id=...`, `.../checkpoint?office_id=...`)
- Collision-safe tracking code generation (`FLOW-...`, retries on conflict, accepts client-side
  codes when unique)
- QR **physically embedded into the .docx/.xlsx file itself** via direct OOXML manipulation
  (PizZip) / ExcelJS — not just a printed sticker

### Storage architecture
Dual-database: **Supabase/Postgres** holds document metadata, org/office/stage structure, users,
tracking events. **MySQL (Hostinger)** holds the actual file BLOBs. `hybridDatabase.ts` is the
layer that joins the two — fetches metadata, then hydrates matched rows with real extracted file
text from the MySQL blob store for AI consumption.

### Cross-cutting
- Role-based access control (client / employee / employee_sub_user / messenger — these are the
  only 4 roles; `employee_sub_user` shares the employee zone, there's no separate admin/superadmin
  role), enforced both in route middleware (`auth.global.ts`) and per-endpoint org/office scoping
- Full activity audit log across all portals
- Real-time-ish notifications on every status/document-issue event (poll/push via
  `notifications/*`, **not** WebSocket — `socket.io` is a `package.json` dependency
  (confirmed unused: zero references in `server/`, `app/`, or any plugin) with no wiring
  anywhere in the codebase)
- Operational reports with auto-escalation to admins
- Misc utility endpoints: `account_type` (lookup), `ping` (health check)

---

## Known Gaps / Caveats (for accuracy, not to be glossed over)

- **Public citizen tracking is UI-only.** `tracking.vue` and `public-users/*` simulate data
  client-side; they don't call the real tracking APIs yet.
- **"Predictive workload" is a heuristic, not ML.** It's a documented momentum/bucket formula
  over recent counts — real and useful, but don't oversell it as machine learning.
- **"Semantic search" is LLM classification over a candidate list, not vector/embedding
  search.** Accurate for pitch language, but distinguish it from RAG-style embedding retrieval
  if asked technically.
- **`socket.io` is a dependency but wasn't found wired into any server route** — treat
  "real-time" claims as polling/event-driven via the notifications system, not confirmed
  WebSocket push, unless verified further.
- **There is no OCR.** Confirmed by reading `documentParser.ts` in full: it uses `mammoth` to
  extract real text from `.docx`/`.doc` only, falls back to raw `.toString('utf-8')` for plain
  text files, and returns **canned placeholder strings** for `.pdf` (explicitly: "server-side
  text extraction is disabled") and `.xlsx`/`.xls` (placeholder text, not actual cell contents).
  No image/scan-to-text library is imported anywhere. If the thesis cites OCR as a capability,
  that's design intent, not shipped code — say so plainly if asked.
- **`socket.io` is dependency-only, confirmed unused.** Repo-wide grep found zero references
  outside `package.json`/`package-lock.json`. All "real-time" behavior is poll/push through the
  `notifications/*` REST endpoints, not a socket connection.
- **The codebase contains dev/debug scaffolding that isn't real product surface** — don't cite
  these as features: `server/api/test/index.get.ts`, `server/api/test-queue.get.ts` (currently
  uncommitted; queries `documents` with a hardcoded fake actor and a commented-out org filter —
  a scratch endpoint, not production logic), and `server/api/org/test.post.ts`.

---
*Generated by reading the actual `server/api` (all 92 files across every folder), `server/utils`,
`app/pages`, `app/components` tree and role middleware (`auth.global.ts`, full role list
confirmed — no hidden admin/superadmin zone) in the FlowVision repository. Every item previously
marked "not reviewed" has been read and resolved. Status tags reflect what the code does today,
not the thesis documentation's design intent — cross-reference with
[VALUE_PROPOSITION.md](VALUE_PROPOSITION.md) for the docx-sourced problem/objectives framing.*
