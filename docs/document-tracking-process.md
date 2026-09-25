# How Document Tracking Works in FlowVision

This explains, end to end, what happens to a document from the moment someone
uploads or registers it on `/client/documents` (or the employee equivalent) to
the moment it's marked done — and what a user actually sees along the way if
they're using FlowVision to track a physical document moving between offices.

There are **two separate status fields** on every document, and mixing them up
is the most common source of confusion:

| Field | What it answers | Who changes it |
|---|---|---|
| `tracking_status` | "Where is the physical document right now?" | Automatically, as it's scanned through pickup/dropoff/checkpoints |
| `status` | "Has it been approved?" | Only flips `Pending → Approved`, and only when the document reaches its final destination |

---

## 1. Creating a document

There are three ways to get a document into the system — all of them end up
in the same place (the `documents` table) and go through the same tracking
lifecycle afterward.

| Method | Where | Use case |
|---|---|---|
| **Upload Document** | `documentUploadModal.vue` on `/client/documents` | You already have a digital file (`.doc`, `.docx`, `.xls`, `.xlsx`, `.csv`) |
| **Scan Physical Document** | `DocumentScannerModal.vue` | You have a paper document with no QR code yet — photograph it with the camera |
| **Scan QR** | `/client/scan` | The document already has a FlowVision QR sticker — this looks it up, it doesn't register a new one |

When you upload or scan a new document, you're required to choose:

- **Delivery Route** — which sequence of offices this document needs to travel
  through (see [Section 2](#2-the-delivery-route)). This is the one field
  that determines everything about how the document will move afterward.POP
- **Document Category** — for filing/search purposes.
- **QR placement** — printed directly on the document, or as a separate
  tracking page (Excel files always get a separate page, so the spreadsheet
  itself isn't touched).

On submit, the system:

1. Generates a unique QR code tied to that document (`flowvision://track/doc?id=…`).
2. Creates the document record with `status: Pending` and `tracking_status: CREATED`.
3. Locks in a snapshot of the full route ("Origin → Stop 1 → Stop 2 → Final
   Stop") into the audit trail, so even if someone edits the route template
   later, the history for *this* document stays accurate.
4. Logs the registration in the activity feed and sends a "document
   registered" email.

**Important:** registering a document does **not** automatically notify a
courier or broadcast it anywhere. It sits in `CREATED` until someone at the
document's current office explicitly assigns a Liaison (the next step). This
is intentional — nothing moves until an office says it's ready to move.

---

## 2. The delivery route

Every document is tied to a **Stage** — a named template that defines the
ordered list of offices ("checkpoints") the document must pass through before
it's considered delivered. A Stage can be:

- **Global** — usable by anyone in the organisation.
- **Local** — scoped to one specific office.

The route is shown to you visually when uploading (Origin → Stop 1 → … →
Final Stop), and the document's `current_step` is just a pointer into that
list: `0` = not dispatched yet, `1` = en route to/at the first checkpoint,
and so on, until it reaches the last one.

---

## 3. How a document is processed (the tracking lifecycle)

This is the real state machine that runs a document from creation to
completion:

```
CREATED
   │  (an office assigns a Liaison/courier — no auto-broadcast)
   ▼
PICKED_UP  ──────────────────────────►  IN_TRANSIT
                                              │  (courier scans the destination office's QR)
                                              ▼
                                     ARRIVED_AT_OFFICE
                                          │        │
                    (employee reviews) ───┘        └── (issue flagged) ──► DISCREPANCY_REPORTED
                          │                                                        │
             not final stop? ─► back to "assign a Liaison" for the next leg      (resolved) ──► back to ARRIVED_AT_OFFICE
                          │
                   final stop? ─► COMPLETED   (status also flips to "Approved")
```

Step by step, with who does what:

1. **Assign Liaison** — someone at the document's current office (a client
   admin, or the employee who owns that office) explicitly hands the document
   to a courier/messenger. Nothing moves before this happens.
2. **Pickup** — the assigned courier scans the document's QR code. The system
   records `PICKED_UP`, then immediately `IN_TRANSIT` (it's now in the
   courier's hands, headed to the next checkpoint).
3. **Dropoff** — the courier scans the QR posted at the destination office.
   The system checks that this is actually the *correct* next stop on the
   route (a mismatch is rejected) and sets `ARRIVED_AT_OFFICE`.
4. **Checkpoint review** — an employee at that office reviews the arrival:
   - If it's **not** the final stop, the checkpoint is marked cleared and the
     document waits for that office to assign the next Liaison (repeat from
     step 1).
   - If it **is** the final stop, the employee's review is what actually
     **completes** the document (see [Section 5](#5-when-a-document-is-finished)).
5. **Discrepancy branch** — at any point after arrival, an issue can be
   flagged (missing pages, wrong document, damage, etc.). This freezes the
   document in `DISCREPANCY_REPORTED` — it cannot be picked up or reassigned
   until the issue is resolved, at which point it drops back to
   `ARRIVED_AT_OFFICE` and the normal flow resumes.

### Tracking status glossary

| `tracking_status` | Meaning |
|---|---|
| `CREATED` | Registered, waiting for a Liaison to be assigned |
| `PICKED_UP` | Courier has it in hand |
| `IN_TRANSIT` | On the way to the next office |
| `ARRIVED_AT_OFFICE` | Physically at an office, pending employee review |
| `DISCREPANCY_REPORTED` | An issue was flagged — delivery is frozen |
| `COMPLETED` | Reached its final destination and was approved |

---

## 4. What "tracking insights" you get, in practice

If you're using FlowVision purely as a document tracker, this is what's
available to you at every point:

- **Live status pill** on the document card/table — current `tracking_status`
  in plain language (e.g. "On the Way", "Received by Office").
- **Delivery Progress timeline** (in the document's detail drawer) — every
  planned checkpoint, showing when it arrived, who delivered it, when it was
  released, and an overall percentage complete.
- **Activity log** — a running audit trail of every action taken on the
  document (registered, picked up, dropped off, issue reported/resolved,
  completed), with who did it and when.
- **Notifications** — office-level alerts such as "Document Departed Office",
  "Inbound Document En Route", "Document Received — Please Verify", and
  "Ready to Assign a Courier", plus email notifications at each major
  milestone (registered, assigned, in transit, arrived, verified, completed,
  or flagged).
- **SLA compliance** — each checkpoint has an allowed time window (configured
  per route, defaulting to ~24 hours). The dashboard shows whether a document
  is currently within that window ("in compliance") or has overstayed it
  ("overdue"). This is purely informational — it doesn't block anything, it's
  a heads-up for follow-up.
- **QR code** — the physical link between the paper and the digital record.
  Scanning it at pickup/dropoff is what actually advances the tracking
  status; it's also how anyone can scan the document later to pull up its
  current status.

---

## 5. When a document is "finished"

Completion is **never automatic just because the courier dropped it off**.
Arriving at the final office only sets `ARRIVED_AT_OFFICE` — an employee at
that office still has to review and clear it. Only that manual review
triggers completion, at which point two things happen together:

- `tracking_status → COMPLETED` (terminal — no further movement is possible)
- `status → Approved` (the compliance/approval field)

From that point the document is done: its timeline shows 100%, it stops
counting toward SLA, and it's included in "Completed" figures on the
dashboard.

> Note: the compliance `status` field currently only ever moves
> `Pending → Approved`. There isn't a "Rejected" action wired up in the
> backend today, even though the UI has styling ready for it.
