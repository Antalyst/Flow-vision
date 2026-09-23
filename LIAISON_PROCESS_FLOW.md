# FlowVision — Liaison (Messenger) Process Flow & Features

The **Liaison** is the courier role in FlowVision — the person who physically carries a
document between offices and performs the QR-scan handshakes that drive the tracking
state machine. In the codebase this role is called `messenger`; the portal lives under
`/messenger/*`, gated by `app/middleware/auth.global.ts`.

This document describes what the liaison actually does, step by step, and which files
implement each part. Status tags:

- ✅ **Live** — real logic, real database queries, verified in code
- 🧪 **Heuristic** — rule-based logic, not ML
- 🎭 **Mock/demo** — UI only, not wired to a real backend call

---

## 1. Role & Scope

| Property | Value |
|---|---|
| Role key | `messenger` |
| Zone | `/messenger/*` (all other zones are inaccessible) |
| Org scope | A messenger only ever sees documents belonging to their own `org_id` — every tracking endpoint re-resolves `org_id` server-side from the session, never from the request body |
| Custody model | A document is "in a messenger's custody" once `documents.assigned_messenger_id` = that messenger's `user_id` and `tracking_status` is `PICKED_UP` or `IN_TRANSIT` |
| Assignment model | **Office-assigned**, not pool-based. The document's current office (a client admin, or an employee authorized for that office) explicitly picks a Liaison via `POST /api/tracking/assign-liaison`, which writes `assigned_messenger_id` directly. There is no "Accept Task" step — the assignment is already authoritative the moment it's made. A user becomes eligible for an office by being tied to it through `users.office_id` (the same field already used for an employee's home office — no new table) |

---

## 2. The Physical Handshake — Core State Machine

Every document a liaison carries moves through the same five/six-state machine, driven
entirely by QR scans (no manual status dropdowns — the physical scan *is* the state
transition):

```
CREATED
   │  (CURRENT OFFICE explicitly assigns a Liaison — POST /api/tracking/assign-liaison)
   ▼
assigned_messenger_id = <liaison>   (still CREATED — nothing physical has happened yet)
   │  (that SPECIFIC liaison scans the ORIGIN checkpoint / dispatch station / document QR)
   ▼
PICKED_UP  ──────────────────────────────────────────────┐
   │  (system auto-advances to IN_TRANSIT in the same scan)
   ▼
IN_TRANSIT
   │  (liaison scans the DESTINATION office wall QR)
   ▼
ARRIVED_AT_OFFICE   (assigned_messenger_id cleared to NULL — custody released)
   │  (employee at that office reviews the physical hard copy)
   ├──▶ checkpoint cleared  → office is now free to assign the NEXT Liaison for the
   │                            next leg (repeat from the top)
   └──▶ issue flagged       → DISCREPANCY_REPORTED (all further assignment/pickup on
                               this document is frozen until an employee/client resolves it)

...repeats, office by office, until the final stop, where the employee's
review completes the document → COMPLETED (no further Liaison can be assigned).
```

Implementation: `server/api/tracking/{assign-liaison,pickup,checkpoint-pickup,dropoff}.post.ts`
write immutable rows to `document_tracking_events` and update `documents.tracking_status` /
`current_step` / `assigned_messenger_id` / `current_office_id`. The five-state machine
itself (`CREATED → PICKED_UP → IN_TRANSIT → ARRIVED_AT_OFFICE → COMPLETED /
DISCREPANCY_REPORTED`) is unchanged and is the same one used everywhere else in
FlowVision — only *who is allowed to write `assigned_messenger_id`, and when* changed
(see §4 for the full history of this: it used to be a self-service pool claim).

**Key rules:**
- A document arriving at an office does *not* let a Liaison be assigned for the next leg
  immediately. `checkpoint_cleared_step` must equal `current_step` — i.e. an **employee**
  must review the physical hand-off at the desk first (via `complete-checkpoint.post.ts`,
  aliased as `checkpoint-done.post.ts`) before the office can assign anyone for the next leg.
- A Liaison can only pick up a document that is *already assigned to them*
  (`assigned_messenger_id === their user_id`) — scanning a document assigned to someone
  else, or one with no assignment at all, is rejected (`NOT_ASSIGNED_LIAISON` /
  `LIAISON_ASSIGNMENT_REQUIRED`). See §4 Step 2.
- If the current office instead flags a problem (`documents/issues/create.post.ts` —
  client/employee only, not messenger), the document freezes in `DISCREPANCY_REPORTED`
  and both assignment and pickup are rejected with `DISCREPANCY_REPORTED`/`DISCREPANCY_FROZEN`
  until resolved.

---

## 3. Portal Navigation

`app/components/messenger/MessengerNav.vue`:

| Section | Page | Route |
|---|---|---|
| Deliveries | Dashboard | `/messenger/dashboard` |
| Deliveries | Notifications | `/messenger/notifications` |
| Deliveries | QR Scanner | `/messenger/scan` |
| Deliveries | Deliveries (Batch Dispatch) | `/messenger/deliveries` |
| Deliveries | My Activity | `/messenger/activity` |
| Deliveries | Reports | `/messenger/reports` |
| Deliveries | History | `/messenger/history` |
| Account | Settings | `/messenger/settings` |

---

## 4. Step-by-Step Liaison Workflow

### Step 1 — The current office assigns a Liaison
When a document is registered (upload, hard-copy registration, or the physical scanner
feature) or arrives at an office and clears desk review, **nothing is auto-assigned.**
The current office (a client admin anywhere in the org, or an employee authorized for
that specific office) opens the document and uses the **Assign Liaison** panel
(`app/components/documents/AssignLiaisonPanel.vue`, embedded in `DocumentPreviewDrawer.vue`
so it appears in every document detail view across the client and employee portals) to
pick one specific person from a list of eligible candidates
(`GET /api/tracking/eligible-liaisons`) and submit `POST /api/tracking/assign-liaison`.

That call is the entire assignment — it writes `documents.assigned_messenger_id` directly
and is already authoritative. The selected Liaison gets a direct notification
(`notifyLiaisonAssigned`, targeted at exactly their `user_id` — never an org-wide
broadcast) and the document's creator/owner gets a role-aware notice too
(`notifyDocumentCreator`, correctly reaching an employee creator as well as a client one).
**There is no "Accept Task" step** — the assignment already stands; the liaison simply
sees it appear as a delivery ready for pickup on `/messenger/deliveries` /
`/messenger/dashboard` (see Step 3).

*(This replaced an earlier pool-broadcast model where any messenger in the org could
self-claim an unassigned document from a shared notification queue. That accept/claim
machinery — `claimPickupNotification`, `broadcastPickupNotification`,
`POST /api/notifications/accept-pickup` — still exists in the codebase but is disabled/
unused in the active flow, kept only so nothing that still imports it breaks outright.)*

### Step 2 — Origin pickup (scan) — only the assigned Liaison
Once assigned, that Liaison opens `/messenger/scan` in **Pickup** mode
(`app/pages/messenger/scan.vue`) and scans either:
- the **document's own QR** (`flowvision://track/doc?id=...`) — direct pickup, or
- the **dispatch station / origin checkpoint QR** (`flowvision://track/checkpoint?office_id=...`)
  — resolves to *whichever CREATED document at that station is assigned to this specific
  liaison* (`server/api/tracking/checkpoint-pickup.post.ts`) — never an arbitrary
  unassigned one.

Both paths call into `server/api/tracking/{pickup,checkpoint-pickup}.post.ts`, which:
1. Verifies the document/office belongs to the liaison's own org (`SECURITY_ORG_MISMATCH` otherwise)
2. **Verifies the document is actually assigned, and assigned to *this* liaison** —
   `LIAISON_ASSIGNMENT_REQUIRED` if `assigned_messenger_id` is still null,
   `NOT_ASSIGNED_LIAISON` if it belongs to someone else. A liaison can never "take over"
   an unassigned or someone-else's document by scanning it.
3. Verifies it isn't `DISCREPANCY_REPORTED` (`DISCREPANCY_FROZEN`)
4. Verifies the office's desk review has actually cleared it if it previously
   `ARRIVED_AT_OFFICE` (`DESK_REVIEW_REQUIRED` / `CHECKPOINT_NOT_CLEARED`)
5. Writes `PICKED_UP` then `IN_TRANSIT` tracking events in one handshake
6. Resolves the *next* route step's office from `stage_steps` and locks it as the
   expected drop-off destination
7. Fires notification classes: departure notice to the origin office, an inbound
   ASN ("en route") to the destination office, and a status update to the document
   owner (client)
8. Logs the action to the activity/audit trail (`action_type: 'pickup'`)

A **batch manifest** variant of the same endpoint (`document_ids: string[]`) lets a
liaison pick up several documents assigned to them from the same desk in one
scan/request — this backs the "Batch Delivery Dispatch" feature on the Deliveries page.

### Step 3 — Carrying custody (Deliveries / Dashboard)
`GET /api/tracking/custody` returns three buckets, all scoped to `assigned_messenger_id
= this liaison`: **`assigned_pending_pickup`** (`CREATED` or cleared `ARRIVED_AT_OFFICE`
— assigned but not yet physically scanned), **`awaiting_scan`** (`PICKED_UP`, a legacy
transitional state from the old claim flow), and **`in_transit`** (`IN_TRANSIT`). All
three are enriched with the full route (`stage_steps`), destination office name,
priority, and SLA target date.

- **`/messenger/dashboard`** — KPI strip + a compact custody list with a "Scanner"
  shortcut straight into Drop-off mode.
- **`/messenger/deliveries`** ("Batch Delivery Dispatch") — the fuller manifest view:
  shows every document currently in custody, lets the liaison pick one **Active
  Delivery Focus** target (via `useMessengerStore` / `useMessengerFocus`), and displays
  its SLA priority, current step, and destination prominently. This focus follows the
  liaison into the scanner (see below) so the scan UI already knows which document/office
  it expects next.
- **`MessengerCustodyDrawer.vue`** — a detail drawer per document with `confirm-pickup` /
  `process-dropoff` actions wired to the same tracking endpoints.

### Step 4 — Destination drop-off (scan)
Liaison switches `/messenger/scan` to **Drop-off** mode and scans the destination
office's wall-mounted QR (`flowvision://office/{id}` or the checkpoint QR format).
`server/api/tracking/dropoff.post.ts`:
1. Confirms the office belongs to the same org
2. Finds the liaison's one active `IN_TRANSIT` document
3. **Route-matches** — the scanned office must equal the document's expected next
   `stage_steps` stop for this `current_step`, or the scan is rejected with
   `ROUTE_MISMATCH` ("Office X is not the expected next checkpoint")
4. Writes the `ARRIVED_AT_OFFICE` tracking event, sets `current_office_id`, clears
   `assigned_messenger_id` (custody released) and resets `checkpoint_cleared_step` to
   `null` (desk review now required again)
5. If this was the **final route stop**, the response flags `is_final_stop: true` and the
   message tells the liaison the document is awaiting final desk verification rather
   than another pickup leg
6. Notifies the destination office ("review required — mark the checkpoint done to
   release the next pickup"), the document owner, and logs the activity
   (`action_type: 'dropoff'`)

After desk review clears the checkpoint (`complete-checkpoint.post.ts`), that SAME
current office gets a direct alert ("Ready to Assign Next Liaison") — not the
destination office, and not a pool broadcast — since it's the current office's turn to
pick who carries the next leg (back to Step 1).

### Step 5 — Scanner UX details (`app/pages/messenger/scan.vue` + `QrScanner.vue`)
- **Mode toggle** — Pickup / Drop-off pill switch, auto-set from the active focus
  document or a `?mode=` query param.
- **🎯 Focus banner** — when a delivery focus is set, the scanner shows exactly which
  document/office it expects and lets the liaison switch targets from an in-scanner
  picker modal without leaving the page.
- **Camera handling** — web uses `html5-qrcode` over `getUserMedia`; inside a Capacitor
  native shell it instead opens the OS camera app directly (`@capacitor/camera`) and
  decodes the captured photo, since native WebViews can restrict raw `getUserMedia`.
  Includes torch toggle, permission-denied overlay, and a configurable default camera
  device (persisted per messenger in Settings).
- **Result states are exhaustive**, not just success/fail: `processing`, `success`
  (pickup vs. drop-off layouts differ), `in-transit-prompt` (scanned a document that's
  already `IN_TRANSIT` while in Pickup mode → one-tap switch to Drop-off), 🚫
  `security-error` (cross-org scan attempt, styled as a hard security violation, not a
  generic error), `route-error` (wrong destination), generic `error`, and `unknown` (QR
  isn't a recognized FlowVision payload at all).
- Scanning a document QR while in Drop-off mode (or an office QR while in Pickup mode) is
  caught client-side with a corrective message before it ever reaches the server.

### Step 6 — After delivery
- **`/messenger/activity`** — the liaison's own slice of the org-wide activity/audit log.
- **`/messenger/history`** ("Liaison Log") — `GET /api/messenger/history`: a chronological
  log of every `PICKED_UP` / `ARRIVED_AT_OFFICE` / `COMPLETED` / `DISCREPANCY_REPORTED`
  tracking event this specific messenger authored, joined back to document title/QR.
- **`/messenger/reports`** — files a free-text operational report (visible to the org's
  admins), reusing the same `operationalReports.ts` system client/employee portals use.
- **`/messenger/settings`** — sound/notification toggles and the default scanning camera
  device (enumerated via `navigator.mediaDevices`, persisted for next session).

---

## 5. Security & Validation Rules Specific to the Liaison Flow

| Rule | Where enforced | Effect |
|---|---|---|
| `org_id` is always server-resolved from the session cookie, never trusted from the scanned payload or request body | every `tracking/*.post.ts` | prevents a forged QR from leaking cross-tenant data |
| Cross-org scan attempt | `SECURITY_ORG_MISMATCH` in assign-liaison/pickup/dropoff/checkpoint-pickup | scan/assignment is rejected outright and surfaced in the UI as a security violation, not a generic error |
| Pickup with no assignment yet | `pickup`/`checkpoint-pickup` | `LIAISON_ASSIGNMENT_REQUIRED` — the current office must assign someone first |
| Pickup by someone other than the assigned Liaison | `pickup`/`checkpoint-pickup` | `NOT_ASSIGNED_LIAISON` — scanning never lets a liaison take over someone else's (or nobody's) document |
| An employee assigning a Liaison for a document not currently at their office | `assign-liaison`, `eligible-liaisons` | `OFFICE_SCOPE_MISMATCH` — employees may only assign for offices they're actually authorized for; client admins may assign anywhere in their org |
| Assigning a candidate already tied to a *different* office | `assign-liaison` | `LIAISON_OFFICE_MISMATCH` — one office can never poach another office's staff/liaison |
| `DISCREPANCY_REPORTED` documents | assign-liaison/pickup/checkpoint-pickup | assignment and pickup frozen (`DISCREPANCY_REPORTED`/`DISCREPANCY_FROZEN`) until a client/employee resolves the flagged issue |
| `COMPLETED` documents | assign-liaison | `ASSIGNMENT_CLOSED` — no further Liaison can ever be assigned once the workflow is done |
| Desk review not yet cleared for the next assignment/pickup | assign-liaison/pickup/checkpoint-pickup | `DESK_REVIEW_REQUIRED` / `CHECKPOINT_NOT_CLEARED` — an employee must physically verify the hand-off before the next leg starts |
| Drop-off at the wrong office | dropoff | `ROUTE_MISMATCH` — the scanned office must match the document's actual next `stage_steps` stop |
| Only `client`/`employee` can flag a `document_issues` discrepancy | `documentIssues.ts` (`ISSUE_ALLOWED_ROLES`) | a liaison cannot report an issue on a document themselves — that's a desk/admin action, keeping the physical chain-of-custody audit trail admin-authored |

---

## 6. API Endpoint Reference

| Endpoint | Purpose |
|---|---|
| `POST /api/tracking/assign-liaison` | **(New)** Current office directly assigns a specific user as Liaison — the authoritative assignment, no accept step |
| `GET /api/tracking/eligible-liaisons` | **(New)** Lists candidates for the assignment picker, scoped to the document's current office |
| `POST /api/tracking/pickup` | Pick up a specific document by QR/ID (single or batch manifest) — only the assigned Liaison may succeed |
| `POST /api/tracking/checkpoint-pickup` | Pick up *this liaison's own* assigned document waiting at a scanned origin/dispatch station |
| `POST /api/tracking/dropoff` | Check a document in at a scanned destination office |
| `POST /api/tracking/checkpoint-done` | (Employee-triggered) release a checkpoint after desk review — alias of `documents/complete-checkpoint.post.ts` |
| `GET /api/tracking/custody` | The liaison's assigned-pending-pickup / in-transit / awaiting-scan inventory |
| `GET /api/tracking/timeline` | Full chain-of-custody timeline for a document |
| `GET /api/tracking/trip` | Trip-level view (origin → destination progress) |
| `GET /api/tracking/queue` | Pending queue data feeding dashboards |
| `GET /api/messenger/history` | This messenger's own pickup/dropoff/completion log |
| `POST /api/documents/issues/create` | (Client/Employee only) flag a discrepancy — freezes the document |
| `POST /api/notifications/accept-pickup` | **Deprecated** — returns `410 Gone`. Superseded by `assign-liaison`; kept only so a stale client build fails loudly instead of silently reviving pool-claiming |

---

## 7. Known Caveats

- **`socket.io` is not wired in anywhere** (confirmed by repo-wide grep — dependency
  only). "Real-time" dispatch alerts (`broadcastInboundDispatchRealtime`) are delivered
  through the same polling/notification-row system as everything else, not a live
  WebSocket push, despite the "realtime" naming in the function.
- **`checkpoint-pickup` for a client dispatch station** picks the *oldest* `CREATED`
  document assigned to that liaison at that station, not a specific one they choose —
  by design, for station-style bulk pickup, but worth knowing if they have multiple
  different assignments waiting there.
- The liaison cannot self-report a discrepancy; if a physical hand-off looks wrong, that
  has to be escalated to the receiving office's employee, who flags it.
- **Liaison↔office association reuses `users.office_id`** (the same column already used
  for an employee's home office) rather than a new join table — deliberately, since no
  existing relationship already modeled "eligible Liaison for Office Y" and this field
  was otherwise unused for `messenger`-role accounts. One consequence: a Liaison is tied
  to exactly one office at a time. The *first* office to assign a previously-unaffiliated
  user associates them going forward; a different office can never assign someone already
  tied elsewhere (`LIAISON_OFFICE_MISMATCH`).
- **Closing the scanner (or the assignment panel) mid-flow never leaves a document
  silently stuck** — an unassigned document just sits in `CREATED`/cleared
  `ARRIVED_AT_OFFICE` until an office acts; there's no dangling claim state to clean up
  under this model (unlike the old pool-claim flow).
- Not every consumer of `DocumentPreviewDrawer.vue` refetches its list automatically
  after an assignment (`client/documents/index.vue` and `employee/documents/index.vue`
  do; `documentDetailModal.vue`, `FlaggedDocumentsPage.vue`, and `employee/working.vue`
  don't yet listen for the `liaison-assigned` event) — a minor UX gap, not a correctness
  one, since the assignment itself is already committed server-side either way.

---
*Generated by reading the actual `server/api/tracking/*`, `server/api/messenger/*`,
`app/pages/messenger/*`, and `app/components/messenger/*` implementation in the
FlowVision repository — reflects what the code does today, not aspirational thesis
documentation. Cross-reference with [SYSTEM_FEATURES.md](SYSTEM_FEATURES.md) for the
other three portals.*
