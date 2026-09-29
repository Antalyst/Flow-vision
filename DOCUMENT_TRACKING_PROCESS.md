# FlowVision — Document Tracking Process

How a document moves through FlowVision from creation to completion: the states, the actors, the APIs, and everything that fires at each step.

---

## 1. The lifecycle at a glance

```
 CREATED ──► PICKED_UP ──► IN_TRANSIT ──► ARRIVED_AT_OFFICE ──► (next leg or) COMPLETED
                                                 │
                                                 ▼
                                       DISCREPANCY_REPORTED
                                      (side-branch, resolves
                                       back into the flow)
```

This is a single state machine (`documents.tracking_status`) shared by **every** ingestion path — a document scanned on a phone camera and a document uploaded as a `.docx` file both land in exactly the same lifecycle, same table, same tracking events. There is no parallel "scanned document" system.

A document with a multi-office route repeats the `assign → pickup → in transit → arrived → confirmed` cycle once per leg until it reaches its final office.

---

## 2. Step by step

### Step 0 — Registration (`CREATED`)

Two ingestion paths converge here:

| Path | Entry point | Who can use it |
|---|---|---|
| Digital upload | `POST /api/documents/upload` | Client, Employee, Employee Sub-User |
| Physical scan | Camera capture → `POST /api/documents/scan/register` (after `scan/session` + optional `scan/analyze`) | Client, Employee, Employee Sub-User |

What happens on registration, regardless of path:
1. **RBAC + identity resolution** — actor's `user_id`, `role`, `org_id`, and (for Employee/Sub-User) `office_id` are resolved **server-side** from the session, never trusted from the request.
2. **Office & route validation** — Employees/Sub-Users must supply an origin office they own or are assigned to; the selected route (`stage_id`) and every office in its checkpoint sequence must belong to the same organization (cross-org routing is rejected outright).
3. **QR code generated** — a `flowvision://track/doc?id=...` payload is built once and stays with the document for its entire life (see §5).
4. **Stored** — Supabase `documents` row (`tracking_status = CREATED`, `current_step = 0`) + the file itself in MySQL `document_storage` (for scans: the camera image, or all pages combined into one PDF; for uploads: the original file, QR-stamped into the page if it's a `.docx`/`.xlsx`).
5. **First tracking event written** — a `document_tracking_events` row (`status: CREATED`) with a human-readable note including the full route snapshot (every checkpoint the document is scheduled to visit).
6. **Notifications** — the document creator gets a "registered" email/notification. No messenger is assigned yet.

At this point the document exists, has a QR code, and is sitting at its origin office — but nobody is carrying it.

### Step 1 — Assigning a Messenger

`POST /api/tracking/assign-liaison`

- Callable by: **Client**, or the **Employee/Sub-User currently at the document's office**.
- Validates: document isn't already completed/in-transit/flagged; the office assigning it actually holds the document right now; the chosen messenger belongs to the same org and (if already tied to an office) isn't being pulled cross-office.
- Sets `documents.assigned_messenger_id`. **No accept/claim step** — the messenger is notified and is immediately authorized to scan it. This is a deliberate design choice: whoever the office picks is trusted, not opt-in.
- Fires a notification + email to the assigned messenger and a "messenger assigned" update to the document owner.

Eligible assignees: `employee`, `employee_sub_user`, `messenger`, or `client` — an office can even deliver its own document rather than wait for a dedicated messenger. "Messenger" is a **per-document assignment**, not an exclusive account type.

### Step 2 — Pickup (`CREATED`/`ARRIVED_AT_OFFICE` → `PICKED_UP` → `IN_TRANSIT`)

`POST /api/tracking/pickup` (scans the document's own QR) or `POST /api/tracking/checkpoint-pickup` (scans an office/station QR, picks up everything assigned to that messenger at once — the batch/manifest flow)

- Callable by: **only** the account in `documents.assigned_messenger_id`. Every other account gets `403` — this is the real authorization, checked after the role gate, and it's role-agnostic (an Employee, Sub-User, Client, or Messenger are all checked the same way once assigned).
- Blocked if: not yet assigned to anyone, assigned to someone else, has an open discrepancy, or the receiving office hasn't confirmed the previous leg yet (checkpoint not cleared).
- On success: `tracking_status → IN_TRANSIT`, `current_step` advances, a tracking event is written, and the destination office gets an inbound-delivery alert (so they know to expect it).

### Step 3 — Drop-off (`IN_TRANSIT` → `ARRIVED_AT_OFFICE`)

`POST /api/tracking/dropoff`

- The messenger scans the **destination office's** QR code (not the document's).
- Validates the scanned office is genuinely the document's next scheduled stop (`ROUTE_MISMATCH` otherwise) and belongs to the same organization as the messenger.
- Sets `tracking_status → ARRIVED_AT_OFFICE`, clears `assigned_messenger_id` (the leg is done — a new messenger must be explicitly assigned for the next leg), and notifies the document owner + the receiving office.
- If this was the **final** stop on the route, the response flags `is_final_stop: true` — the document still isn't `COMPLETED` yet; it's waiting on desk review.

### Step 4 — Office confirms receipt (desk review)

`POST /api/documents/complete-checkpoint`

- Callable by: **Employee / Employee Sub-User** at the receiving office (not the messenger, not the client).
- This is the human check: someone at the office physically verifies the paper/file actually arrived before the system lets it move again.
- Two outcomes:
  - **Not the final stop** → `checkpoint_cleared_step` is set, releasing the document so the office can now assign the *next* messenger (back to Step 1). Document stays `ARRIVED_AT_OFFICE` in between.
  - **Final stop** → `tracking_status → COMPLETED`. Document owner is notified the document has been verified and delivered.

### Side-branch — Discrepancy (`DISCREPANCY_REPORTED`)

Any office reviewing a document can flag an issue (missing pages, wrong document, damaged copy, etc.) instead of clearing it. This:
- Sets `tracking_status → DISCREPANCY_REPORTED`, which **freezes** the document — it cannot be picked up, dropped off, or reassigned while flagged.
- Opens an issue thread (office ↔ document owner) to resolve it.
- Once resolved, the document is released back into the normal flow (typically back to `ARRIVED_AT_OFFICE`, ready for the next messenger assignment).

---

## 3. State reference

| Internal status | Meaning | Set by |
|---|---|---|
| `CREATED` | Registered, sitting at origin, no messenger yet | Registration (upload/scan) |
| `PICKED_UP` | Messenger has scanned it, about to depart (very short-lived; usually observed as `IN_TRANSIT`) | `pickup` |
| `IN_TRANSIT` | Physically with the messenger, moving to the next office | `pickup` |
| `ARRIVED_AT_OFFICE` | Delivered, awaiting desk confirmation | `dropoff` |
| `COMPLETED` | Verified at its final destination — terminal state | `complete-checkpoint` (final stop) |
| `DISCREPANCY_REPORTED` | Frozen pending issue resolution | Office issue report |

---

## 4. Every transition writes an audit trail

Two records are written at (almost) every step, independent of each other:

1. **`document_tracking_events`** — the authoritative, append-only ledger: one row per status change, with `status`, `step_index`, `actor_id`/`actor_role`/`actor_name`, and a human-readable `notes` string. This is what powers the document's history/timeline view.
2. **Activity log** (`logActivitySafe`) — a general-purpose audit entry (`action_type: 'upload' | 'scan' | 'dropoff' | 'assign_liaison' | ...`) used for office-level activity history, separate from the per-document ledger.

Notifications and transactional emails fire alongside these (document owner, assigned messenger, receiving office) — see the email events in `server/utils/email/emailEvents.ts`. None of these are required for the state machine to function; they're side effects, and failures there are non-fatal (the tracking transition itself already succeeded).

---

## 5. The QR code

- One QR payload is generated **once**, at registration, and never changes: `flowvision://track/doc?id=<uuid>`.
- It is not regenerated per leg or per office — the same code follows the physical document for its entire life.
- Two things get scanned during transit, and they are **not the same code**:
  - The **document's own QR** — scanned at pickup, identifies *which document* is being picked up.
  - The **office's QR** (a fixed code printed at each office/checkpoint) — scanned at drop-off (and at batch/manifest pickup), identifies *where* the messenger is standing.
- A public, unauthenticated tracking page can look up a document's current status by this same code.

---

## 6. Authorization model (why a step can't be faked)

Every one of the endpoints above runs the same two-layer check:

1. **Identity/role gate** — is this account type even allowed to call this endpoint at all (e.g., a Client can't scan a pickup; only the roles that can physically hold a document can).
2. **Assignment gate** — regardless of role, does *this specific account* currently hold the real-world authority over *this specific document* (`assigned_messenger_id` for pickup/dropoff, "currently at this office" for assign/confirm)?

Layer 2 is the one that actually matters — it's role-agnostic and is what stops, say, an Employee at the wrong office (or a Messenger not assigned to this document) from touching a document they have no business touching, even though their *role* would otherwise be permitted to perform that kind of action. Organization (`org_id`) is resolved server-side from the session at every step, so cross-tenant access is structurally impossible, not just hidden in the UI.

---

## 7. One route, multiple legs

A document's route is a fixed, ordered sequence of offices (a "stage" with numbered "steps"), locked in at registration time. Steps 2–4 above (assign → pickup → dropoff → confirm) repeat once per leg:

```
Origin Office ──leg 1──► Office B ──leg 2──► Office C (final) ──► COMPLETED
   assign→pickup→        assign→pickup→         assign→pickup→
   dropoff→confirm        dropoff→confirm         dropoff→confirm(final)
```

`current_step` tracks progress along this sequence; `checkpoint_cleared_step` is what actually gates whether the *next* leg's messenger assignment is allowed to start.
