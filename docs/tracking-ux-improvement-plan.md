# FlowVision — Tracking UX Analysis & Improvement Plan

**Status: Phases 1–4 implemented. Phase 5 (Lost/Missing status) is blocked
on a manual database step — see the note at the end of Part 8.** This
document is kept as the record of what was analyzed, why, and what shipped.
It covers: how the system looks and flows today, whether a non-technical
40–60 year-old user could actually use it, what's missing, and a phased
plan to fix it — focused on **flow, UI design, and ease of use**, without
touching the existing dashboards.

### What's actually live now

- **Phase 1 — Terminology.** Client sidebar's "Workflow Steps" renamed to
  "Document Routes" to match the employee side; fixed a real bug in the
  upload modal that linked to `/employee/stages` (a page a client can't
  even reach) — it now points to `/client/stages`.
- **Phase 2 — Notifications & Activity.** Fixed the raw-enum title leak in
  `notifyClientStatusUpdate`; added severity tiers (Urgent / Needs Action /
  routine) with color-coded left borders and top-of-list sorting on both
  the client and employee notification pages; added a "Mine only" filter
  to Activity (`ActivityTimeline.vue` + `/api/activity-logs?mine=true`);
  added a "View Document" deep link to the messenger notification list
  (client/employee already had this).
- **Phase 3 — My Tracking.** New page at `/client/my-tracking` and
  `/employee/my-tracking`, added to the sidebar above Dashboard. Card-based,
  e-commerce order-history style, with All / On the Way / Needs My
  Attention / Completed filters and an Activity tab (personal, via the new
  "Mine only" filter). Dashboard and the existing Documents list were not
  touched.
- **Phase 4 — Per-document SLA.** Upload modal has an optional "Expected
  Completion Time" field (hours or days); reuses the existing
  `documents.target_completion_date` column, so **no schema change was
  needed**. A "check on page load" endpoint
  (`POST /api/tracking/check-sla-breaches`) runs whenever My Tracking
  loads, and notifies the document's owner, the org's admin (the org's
  registering user), and the office currently holding it — once per
  breach, not repeatedly. Countdown/overdue display added to My Tracking
  cards and the document drawer.
- **Phase 5 — Lost/Missing status.** Not implemented — needs a database
  change I can't run myself (no DB tool in this session). SQL is ready;
  see the end of Part 8.

---

## Part 1 — How the system is laid out today

### 1.1 Who sees what (navigation)

Three portals, each its own sidebar, each already reasonably
well-organized by intent (the client sidebar code even has a comment
confirming it was ordered "track a document → messages → reports →
setup/help"). But the labels lean corporate/software-y, not plain speech:

| Role | Sidebar groups (in order) |
|---|---|
| **Client** | Track Documents *(Dashboard, Live Tracking, All Documents, Scan & Update, Activity History)* → Messenger → Messages & Alerts → Reports & Insights *(incl. "On-Time Status")* → Setup & Team *(incl. "Workflow Steps", "QR Terminals")* → Help & Settings |
| **Employee** | Overview → My Work → Messenger → Delivery Setup *("Document Routes", "Office QR Codes")* → Team → Reports & Activity → Support |
| **Messenger** | Deliveries *(Dashboard, Notifications, QR Scanner, Deliveries, My Activity, Reports, History)* → Account |

All three roles also get a mobile bottom tab bar (4–6 shortcuts) and a
slide-out drawer menu — mobile is already a first-class citizen, not an
afterthought.

**Finding:** the same underlying concept is named differently depending on
which screen you're on — "Delivery Route" (upload modal) vs "Document
Route" (drawer) vs "Workflow Steps" (client sidebar) vs "Document Routes"
(employee sidebar) vs "Stage" (internally). One idea, four labels. For a
casual user this reads as four different things.

### 1.2 Where you actually see tracking info today

1. Dashboard KPI cards (counts only — "3 On the Way").
2. **Documents list** → click a row → a right-side drawer opens
   (`DocumentPreviewDrawer.vue`) — this is the real tracking screen.
3. Inside that drawer: a colored status badge at the top, a
   key/value details block, then a **vertical numbered-step timeline**
   ("Delivery Progress") showing each office stop, who picked it up, when
   it arrived — this is good, it's the closest thing to a shipment tracker
   already in the product.
4. Separately, **"On-Time Status"** (`sla-compliance.vue`) — already
   the best-written screen in the system for a non-technical reader: a
   one-line summary ("3 of 12 documents are running late"), three big
   colored counts, and a table with humanized time ("2d left" / "Late by
   5h") instead of raw numbers.
5. **Notifications** — a plain list page per role, not a bell dropdown.

**Finding:** tracking info is correct and reasonably well-designed, but it's
scattered — dashboard, documents list, drawer, On-Time Status page, and
Notifications are five separate places a user has to check to get the full
picture of "what's happening with my stuff." There is no single "my
documents, my history" screen for a client or an employee (only the
messenger role has that, called "My Activity" — see Part 5).

---

## Part 2 — Non-technical user test

**Persona:** office admin, 40–60 years old, comfortable with email and
basic apps, not comfortable with software jargon, has never seen this
system before, is handed a login and told "track your documents here."

Verdict per stage — **YES** means they'd understand it unassisted, **NO**
means they'd likely get stuck or need to ask someone.

| # | Stage / screen | Verdict | Why |
|---|---|---|---|
| 1 | Logging in, landing on Dashboard | **YES** | Familiar layout, big numbers, clear labels like "Total Documents." |
| 2 | Clicking "Upload Document" | **YES** | Drag-and-drop is universally understood. |
| 3 | Choosing a **"Delivery Route"** during upload | **NO** | They don't know what a "route" or "stage" means yet — no explanation of *why* they're picking this, or what happens after. |
| 4 | Choosing "QR Placement Strategy" (printed vs separate page) | **NO** | This is an internal/technical decision surfaced too early. A first-time user doesn't know what a "QR placement strategy" is or why it matters to them. |
| 5 | Seeing `tracking_status` labels like "Arrived at Office" | **YES** | These are already in plain English, good. |
| 6 | Reading the "Delivery Progress" stepper in the drawer | **YES** | It's visual, sequential, color-coded — the strongest screen in the app. |
| 7 | Understanding `status` (Pending/Approved) *next to* `tracking_status` (On the Way/Completed) on the same card | **NO** | Two different "status" concepts shown close together with similar-looking pills. Confusing even for us to explain in writing (see the note in the earlier process doc) — a casual user will assume they're the same thing. |
| 8 | Reading "On-Time Status" page | **YES** | Best screen in the system — plain sentences, humanized time, color coding. |
| 9 | Reading a Notification (e.g. title literally reads *"Document Update: ARRIVED_AT_OFFICE"*) | **NO** | Most notifications are well-written plain sentences, but at least one real path (`notifyClientStatusUpdate`) stamps the raw database status straight into the title. One bad apple undermines trust in the rest. |
| 10 | Finding "my documents only" (their own uploads/history) | **NO** | Doesn't exist for client/employee roles today — only Activity Log (org-wide, too much noise) or Documents list (has to search/filter manually). |
| 11 | Understanding what to do if something's wrong ("Flag Issue") | **YES** | The button is clearly labeled and the chat-style resolution is intuitive. |
| 12 | Understanding what happens if a document is physically lost | **NO** | There's no such option in the system at all today — they'd have no idea what to click. |

**Overall: 6 of 12 stages pass in "handed a login, no training" conditions.**
The failures cluster around exactly the areas this plan addresses below:
terminology, a personal "my stuff" view, and missing-document handling.

---

## Part 3 — Pros and cons of the current design

**What's already working well (keep, don't touch):**
- The vertical stepper/timeline metaphor in the document drawer — this is
  the right mental model (a "package tracker" feel) and should become the
  *template* for the new personal tracking view, not be replaced.
- The "On-Time Status" page's plain-language approach — a model for how
  the rest of the system should read.
- Role-based sidebars already grouped by task, not by data model.
- Mobile bottom-bar + drawer pattern already implemented consistently.

**What's actively working against a non-technical user:**
- Inconsistent naming for the same concept (Route/Stage/Workflow Steps).
- Two "status" fields shown together with no visual distinction of what
  each one means.
- Technical decisions (QR placement/size) asked at upload time, before the
  user has any context for why they matter.
- No single "everything about my documents" screen — the information
  exists, but a user has to know to look in 3–4 different places.
- No representation of "this document is lost" — a real-world event this
  system, as a *tracker*, should be able to say something about.

---

## Part 4 — Guiding principle for every change below

> **Mental model: a package/parcel tracker**, exactly like tracking an
> e-commerce order. Every change in this plan exists to make FlowVision
> *feel* like "Track My Order," because that's a mental model this persona
> already has for free — we don't have to teach it.

Ecommerce mapping we'll use consistently in the new UI copy:

| Ecommerce order tracker | FlowVision `tracking_status` |
|---|---|
| Order placed | `CREATED` |
| Picked up by courier | `PICKED_UP` |
| Out for delivery / in transit | `IN_TRANSIT` |
| Arrived at facility | `ARRIVED_AT_OFFICE` |
| Delivery problem | `DISCREPANCY_REPORTED` |
| Delivered | `COMPLETED` |

---

## Part 5 — New: "My Tracking" page (additive — dashboard stays untouched)

**This does not replace or modify the existing Dashboard.** It's a new,
separate page added to the sidebar, exactly the way an e-commerce site has
a Dashboard/Home *and* a separate "My Orders" page.

### What it is
A personal, self-scoped view: "every document that's mine — either I
uploaded it, or it's currently sitting at my desk — and where each one
stands right now." Today, the closest thing is the Activity Log, but that's
org-wide/office-wide noise, not "mine."

### Where it lives
- New sidebar item, **"My Tracking"**, placed at the very top of the
  existing "Track Documents" group (client) and "My Work" group
  (employee) — first thing a user sees, above Dashboard even, since it
  answers their #1 question: *"where's my stuff?"*
- Messenger already has an equivalent ("My Activity") — leave it as is,
  just make the naming consistent later (Part 6).

### What it looks like (ecommerce order-history layout)
- A vertical list of **cards**, one per document, newest first — not a
  dense data table like the current Documents list.
- Each card, in this order:
  1. Document title + short reference number.
  2. One big, plain-language status line ("Out for delivery to Legal
     Office") instead of a raw badge.
  3. A compact horizontal progress bar (4–6 dots matching the ecommerce
     stages above), reusing the same visual language as the drawer's
     vertical stepper, just laid horizontally for a card.
  4. One line of "what's next" ("Waiting for {Office} to review").
  5. A "Track" button that opens the *existing* `DocumentPreviewDrawer` —
     we reuse that component as-is for the detail view, no new drawer
     needed.
- Simple top filters only: **All / On the Way / Needs My Attention /
  Completed** — no advanced query builder.
- Empty state: "You don't have any documents yet — [Upload one]."

### Build notes (for the implementation phase, not now)
- Needs a new lightweight API (`GET /api/client/my-documents`,
  `GET /api/employee/my-documents`) filtering `documents` by
  `user_id = me` OR `current_office_id ∈ my offices` — the existing
  `dashboard-documents` endpoint already has the shape, just needs an
  owner-scoped variant instead of org/office-wide.
- No changes required to `documents.vue`, `dashboard.vue`, or any existing
  KPI card — this is purely additive.

---

## Part 6 — Terminology cleanup (Route & Stage)

You confirmed the right mental model yourself: **"route and stage are the
path that we need to follow for the docs."** That's exactly right, and
it's the fix — one path metaphor, one consistent vocabulary, everywhere a
user sees it:

| Keep this word | Retire these, everywhere in UI copy (not code/DB) |
|---|---|
| **Route** = the whole path a document must travel | "Stage" (as a user-facing word), "Workflow Steps" |
| **Stop** = one checkpoint/office on the route | "Step," "Stage step," "Checkpoint" (fine in admin/technical screens, not in front of a first-time user) |

This is copy-only (labels/tooltips), not a database rename — low risk, high
clarity payoff. Apply it first, before anything else in this plan, since
every other screen benefits from it immediately.

---

## Part 7 — New: per-document SLA with escalation notifications

### What's requested
At upload time, let the person uploading say **"this document should be
fully processed within ___ hours."** If it runs over, notify: (1) an
admin, (2) the document's owner/uploader, (3) whichever office currently
holds it.

### How this differs from what exists today
The system already has SLA — but it's a **per-stop** allowance configured
on the *route template* (e.g. "24h per checkpoint"), invisible to the
person uploading, and it only feeds the "On-Time Status" report. What's
being asked for is a **per-document, end-to-end** time budget, set by the
uploader, with **active notification** instead of passive reporting.

**Recommendation: add this as a second, optional layer — don't replace the
existing per-stop SLA.** Two honest questions to settle before building:

1. Is the number the uploader enters a **total budget for the whole
   journey** (e.g. "72 hours door to door"), or a request to **override
   the per-stop limit**? Recommend: total journey budget — it matches
   what a non-technical person would actually mean by "how long should
   this take."
2. Who exactly is "admin"? Recommend: whoever registered the document's
   organisation's Route (i.e., any `client`-role user in that org), unless
   you want a dedicated "Compliance Officer" flag later.

### Proposed flow
1. Upload modal gets one new, optional field: **"Expected completion
   time"** (a simple number + unit, e.g. "3 days"), directly under the
   Route picker where it's contextually relevant. Left blank = no
   change from today's behavior.
2. Stored as a new nullable field on the document (e.g.
   `expected_completion_hours`), separate from the route's own per-stop
   SLA hours.
3. A running countdown is shown on: the document's card in "My Tracking,"
   the drawer, and a new small badge on the Documents list — reusing the
   humanized-time style already proven on the On-Time Status page ("1d
   14h left" / "Overdue by 6h").
4. **On breach**, three notifications fire once (not repeatedly):
   the uploader ("your document is now overdue"), the admin(s) ("a
   tracked document has breached its expected time"), and the current
   office ("a document waiting at your desk is overdue — please act").
   All three reuse the existing `notifications` table/email system — no
   new notification infrastructure needed, just new trigger points.
5. **Important open question:** breach detection needs *something* to
   periodically check "has this document run out of time," since nobody
   is guaranteed to open the app at the exact moment it expires. This repo
   has no scheduled-job/cron system today. Two realistic options:
   - **A — Check on page load** (cheapest): whenever the dashboard/My
     Tracking page loads, silently check any of that user's documents for
     a new breach and fire the notification then. Simple, no new
     infrastructure, but a document with nobody checking the app won't
     notify until someone eventually opens it.
   - **B — Real scheduled job** (e.g. Supabase scheduled function or an
     external cron hitting a new `/api/cron/check-sla` route every 15–30
     min): reliable, timely, but is new infrastructure and needs a
     decision on hosting/ops before it can be built.
   Recommend starting with **A** to ship value fast, and upgrading to
   **B** once you're ready to treat SLA breaches as a real-time
   operational alert rather than a best-effort one.

---

## Part 8 — "What if the document is lost?" — pros, cons, and recommendation

### Current state
There is **no** "lost" or "missing" status anywhere in the tracking
lifecycle. The only exception state is `DISCREPANCY_REPORTED`, and it's
built around **content problems at a checkpoint** ("missing signature
page," "wrong document"), not "the physical document itself has vanished
somewhere between two offices."

### Option A — Reuse the existing Discrepancy flow, just add a "Lost" reason
| Pros | Cons |
|---|---|
| Zero schema/state-machine changes — ships fastest | Mixes "paperwork issue" with "the document is physically gone" — very different severity and different next actions |
| Reuses existing chat, freeze, and resolve flow as-is | Can't build a clean "Lost Documents" register/report later without extra filtering logic |
| Lower engineering risk | A courier who's mid-delivery sees the same "Issue Reported" badge whether it's a typo or a genuinely missing document — no urgency signal |

### Option B — A dedicated `LOST` / `MISSING` tracking status
| Pros | Cons |
|---|---|
| Clear, distinct, honest signal — matches how an e-commerce tracker would show "Lost in transit" | Requires touching the state machine (`advance.post.ts`), every status-badge color map, dashboards/KPI filters — a real, if contained, engineering task |
| Enables a dedicated report ("how many documents did we lose this quarter, from where") — valuable for a document-tracking product specifically | Needs a defined recovery path (found later → back to `IN_TRANSIT`/`ARRIVED_AT_OFFICE`), mirroring how Discrepancy already resolves back to `ARRIVED_AT_OFFICE` |
| Can require structured input when declared (last known office, last seen date/time) — becomes a real incident record, not just a chat message | Should probably be restricted to office/admin roles only (not any actor) given how serious it is — needs a permission decision |

### Recommendation
Go with **Option B**, scoped narrowly: only a `client`-role admin or the
office currently responsible for the document can declare it lost;
declaring it requires "last known location" + a short note, exactly like
opening an incident, not a casual click. Give it its own badge color
(distinct from the orange "issue reported") so a courier or office desk
immediately reads it as more serious. This is a bigger build than
everything else in this plan — recommend it as its own phase (Phase 5
below), not bundled into the SLA/notification work.

### Blocked on a manual step

`documents.tracking_status` and `document_tracking_events.status` both
have a `CHECK` constraint limiting values to the current six states — this
session has no ability to run SQL against your Supabase database, so
adding `LOST` requires you to run this once in the Supabase SQL editor:

```sql
ALTER TABLE public.documents
  DROP CONSTRAINT documents_tracking_status_check,
  ADD CONSTRAINT documents_tracking_status_check
    CHECK (tracking_status = ANY (ARRAY[
      'CREATED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_OFFICE',
      'DISCREPANCY_REPORTED', 'COMPLETED', 'LOST'
    ]::text[]));

ALTER TABLE public.document_tracking_events
  DROP CONSTRAINT document_tracking_events_status_check,
  ADD CONSTRAINT document_tracking_events_status_check
    CHECK (status = ANY (ARRAY[
      'CREATED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_OFFICE',
      'DISCREPANCY_REPORTED', 'COMPLETED', 'LOST'
    ]::text[]));
```

(Constraint names taken from your schema dump — if Supabase auto-generated
different names for your instance, look them up first with
`\d documents` / `\d document_tracking_events` in the SQL editor, or via
the Table Editor's constraint list, and swap them in above.)

Once that's run, tell me and I'll wire up the actual "Mark as Lost" /
"Found — resume delivery" flow, the badge, and the incident-detail fields
(last known location + note) described above.

---

## Part 9 — Notifications & Activity Log: improvement plan

You're right to call this out specifically — once Phase 4 (SLA breach
alerts) ships, the number of notifications a person receives is about to
grow. If the notification layer itself isn't solid first, breach alerts
will just get lost in noise, which defeats the point of building them.

### What's actually there today (checked directly in the code)

The good news: most individual notification *messages* are already
well-written, human sentences — e.g. `broadcastOfficeReviewNotification()`
produces *"A messenger delivered 'Contract Renewal' to Legal Office. Open
the document preview, verify the hard copy, and mark the checkpoint done
to release the next pickup."* That's genuinely good, actionable copy.

Three concrete problems, found directly in
`server/utils/notifications.ts` and `NotificationCenter.vue`:

1. **One real jargon leak.** `notifyClientStatusUpdate()`
   (`server/utils/notifications.ts:545`) builds the title as
   `` `Document Update: ${trackingStatus}` `` — so a client can literally
   see *"Document Update: ARRIVED_AT_OFFICE"* in their notification list,
   raw enum and all. Easy, safe fix: run the status through the same
   plain-language map already defined in Part 4 ("Arrived at Office")
   before it goes into the title.
2. **Notifications don't link anywhere.** Every notification row already
   carries a `document_id` — but `NotificationCenter.vue` never uses it.
   Clicking a notification does nothing except let you press "Mark Read."
   There's no way to go from "Document X was delivered" straight to
   Document X. This is the single highest-value fix in this whole section.
3. **No grouping or severity.** Everything renders as one flat list — a
   routine "delivered, please review" notice looks exactly as urgent as a
   ⚠️ compliance issue would. There's no visual weight difference, and no
   way to collapse "5 routine updates" into one line so the important ones
   stand out.

### What to change

1. **Fix the one bad title** — `notifyClientStatusUpdate` maps
   `trackingStatus` through the plain-language table from Part 4 before
   building the title/message. (Small, immediate, safe.)
2. **Make every notification clickable** — tapping a notification (not
   just the "Mark Read" button) opens that document straight in the
   existing `DocumentPreviewDrawer`, using the `document_id` already
   stored on the row. No new data needed, just wiring the click.
3. **Add a severity tier**, driven by `action_type`/notification type,
   not a new field:
   - **Info** (gray) — routine progress ("arrived," "picked up").
   - **Needs your action** (orange) — assign a liaison, review a
     checkpoint.
   - **Urgent** (red) — compliance issue, and (once Phase 3 ships) an SLA
     breach.
   Sort urgent-and-needs-action to the top of the list, always, regardless
   of timestamp — a 2-day-old unresolved issue should outrank a
   5-minute-old "delivered" notice.
4. **Group routine updates.** If someone has 6 unread "delivered/picked
   up" notices, collapse them into one line ("6 documents moved forward
   today — view all") instead of 6 separate cards; urgent items are never
   grouped, they always show individually and in full.
5. **Tie Notifications to "My Tracking" (Part 5), not just a standalone
   page.** A document card in My Tracking should surface its own most
   recent notification/alert inline ("⚠️ Overdue — needs your attention"
   right on the card), so a user doesn't have to cross-reference two
   separate screens to know something needs them.

### Activity Log — same spirit, different job

Notifications are the *alert* layer (new, unread, needs a reaction).
Activity Log is the *permanent record* (searchable history, already
seen). Keep that split — don't merge them — but fix two real gaps in
`ActivityTimeline.vue`:

1. **No "mine" filter.** The component only supports Date range + Action
   type; there's no owner/document filter. Add one more filter — "Mine
   only" — reusing the exact same component (small, additive change), and
   surface it as the "Activity" tab inside the new My Tracking page from
   Part 5, so a person's personal history and personal tracking live in
   one place.
2. **Flat list mixes unrelated documents.** Right now everything is one
   chronological stream regardless of which document it's about. For the
   "mine" view specifically, group entries under their document title
   (e.g. *"Contract Renewal" — registered → picked up → arrived*) so a
   person reads it as one story per document, not an interleaved feed.

### Where this fits in the roadmap

This becomes its own phase, and it should run **before** Phase 4 (SLA
escalation notifications) — there's no point adding a new, high-value
alert type into a notification system that currently can't distinguish
urgent from routine. See the updated roadmap below.

---

## Part 10 — Phased roadmap

| Phase | Goal | Touches existing screens? | Relative effort |
|---|---|---|---|
| **1. Terminology pass** | One consistent word for "path" (Route) and "checkpoint" (Stop) across every screen (Part 6) | Copy-only edits on upload modal, drawer, sidebars | Small |
| **2. Notifications & Activity fixes** | Fix the one raw-enum title, make notifications clickable → open the document, add severity tiers + grouping, add a "Mine" filter to Activity (Part 9) | Notification insert helpers, `NotificationCenter.vue`, `ActivityTimeline.vue` — no schema change | Small–Medium |
| **3. My Tracking page** | New, additive "where's my stuff" screen, ecommerce-card style, with its own Activity tab (Part 5 + 9) | New page + new nav item only — dashboard untouched | Medium |
| **4. Per-document SLA + escalation notifications** | Optional expected-completion time at upload, with breach alerts to owner/admin/current office (Part 7) — now landing on top of a notification system that can already tell urgent from routine | New optional upload field, new badges, reuses existing (now-improved) notification system | Medium–Large (larger if choosing option B — real cron) |
| **5. Lost/Missing document status** | A true "lost in transit" state with its own recovery flow and incident record (Part 8, Option B) | New status across state machine, badges, filters, a new "Lost Documents" report | Large |

Recommended order: **1 → 2 → 3 → 4 → 5**, each shippable and useful on
its own, each safe to pause after without leaving anything half-broken.
Notifications (Phase 2) deliberately moved ahead of My Tracking and SLA
escalation, since both of those lean on notifications being trustworthy
first.

---

## Part 11 — Decisions needed from you before implementation starts

1. **"Admin" for SLA breach notifications** — any `client`-role user in
   the org, or a specific person/flag?
2. **Per-document SLA meaning** — total end-to-end budget (recommended),
   or override of the per-stop limit?
3. **SLA breach checking** — start with check-on-page-load (fast, no new
   infra), or go straight to a real scheduled job?
4. **Who can declare a document "Lost"** — any office, or client-admin
   only (recommended)?
5. **Should "My Tracking" also apply to the Employee role**, or client
   only for now? (Recommended: both — an employee has documents sitting at
   their desk too, and the same "where's my stuff" question applies.)

Once these are answered, each phase above can be turned into its own
implementation plan.
