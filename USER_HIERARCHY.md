# FlowVision — User Hierarchy

How accounts, roles, and access scope work across FlowVision. This describes the actual roles implemented in the codebase — there is no separate "admin" role; the **Client** account *is* the organization administrator.

---

## 1. Roles at a glance

```
                        ┌─────────────────────┐
                        │       CLIENT         │   Organization admin
                        │  (org-wide scope)     │   /client/*
                        └──────────┬────────────┘
                                   │ creates / manages
                     ┌─────────────┼──────────────┐
                     ▼             ▼              ▼
            ┌────────────────┐          ┌──────────────────┐
            │    EMPLOYEE      │          │    MESSENGER       │
            │ (owns one or     │          │ (custody per        │
            │  more offices)   │          │  document, org-wide)│
            │  /employee/*     │          │  /messenger/*        │
            └────────┬─────────┘          └──────────────────┘
                     │ manages
                     ▼
            ┌──────────────────────┐
            │  EMPLOYEE_SUB_USER      │   Office staff
            │ (assigned to ONE office)│   /employee/* (shared UI)
            └──────────────────────┘
```

Four roles exist in `users.role`: **`client`**, **`employee`**, **`employee_sub_user`**, **`messenger`**. Every account belongs to exactly one organization (`users.org_id`) — this is the hard tenant boundary; nothing crosses it.

---

## 2. Role definitions

### Client — Organization Administrator
- **Scope:** the entire organization. No office restriction.
- **Home:** `/client/dashboard`
- **Can:**
  - Register documents org-wide (no origin office required)
  - Create and manage **Branch Offices** (`/client/office`) — add/edit/delete, assign an Employee to each
  - Build **Document Routes** (stages/steps) — shared (global) or office-scoped (local)
  - Manage the **Team** — provision Employee and Employee Sub-User accounts, activate/deactivate
  - View all documents, all activity history, all reports across every office
  - Assign a Messenger to any document in the org
- **Identity:** there is one (or a small number of) `client` account per organization — it is the tenant owner.

### Employee — Office Owner
- **Scope:** the office(s) they own, via `offices.assigned_user = users.user_id`. An employee can own more than one office.
- **Home:** `/employee/dashboard`
- **Can:**
  - Register documents (digital upload or physical scan) scoped to their own office
  - Use shared (global) routes or routes local to their own office
  - Assign a Messenger for documents currently at their office
  - Confirm receipt of inbound documents (desk review / "mark received")
  - Manage their office's Employee Sub-Users
- **Cannot:** register or route documents for an office they don't own; see other offices' internal activity by default.

### Employee Sub-User — Office Staff
- **Scope:** a single office, via `users.office_id` (the sub-user does **not** own the office — they're assigned to it).
- **Home:** `/employee/dashboard` (identical UI/navigation to Employee — same page components, same portal)
- **Can:** everything an Employee can do, but strictly limited to their one assigned office (registration, routing, receiving, messenger assignment) — enforced server-side, not just hidden in the UI.
- **Cannot:** act on behalf of any office other than the one they're assigned to, even if that office belongs to the same organization.
- **Why this role exists:** lets an office owner (Employee) delegate day-to-day document handling to staff without giving them ownership or cross-office reach.

### Messenger — Liaison / Delivery Agent
- **Scope:** whichever single document is currently assigned to them, via `documents.assigned_messenger_id`. Not office-bound — a messenger can be assigned to any document within their organization.
- **Home:** `/messenger/dashboard`
- **Can:**
  - See documents assigned to them ("My Deliveries")
  - Scan pickup / scan drop-off (physical custody handoffs)
  - Nothing else — no document creation, no routing configuration, no team management
- **Note:** internally referred to as "Liaison" in parts of the backend (`assign-liaison`, `LIAISON_*` error codes) — this is the same concept as "Messenger," just an older internal name. The user-facing UI consistently says "Messenger."
- **Important:** `employee` and `employee_sub_user` accounts can *also* be assigned as the messenger for a specific document (an office can deliver its own document rather than waiting for a dedicated messenger) — messenger is a **document-level assignment**, not an exclusive account type.

---

## 3. How access is enforced

Every privileged action resolves the actor's identity **server-side**, never trusting anything the browser sends:

1. `user_session` (user ID) + `user_role` cookies identify the session.
2. The server looks up the user's row in `users` — `org_id` and (for employee/sub-user) `office_id` come from that row, not from the request.
3. The DB-stored role is cross-checked against the cookie's claimed role — a mismatch is rejected (guards against a tampered cookie).
4. Every downstream query is filtered by that server-resolved `org_id` (and `office_id`, where applicable) — cross-organization and cross-office access attempts return `403`, not silently-empty data.

This logic lives in `server/utils/actorContext.ts` and is reused by every API route that needs to know "who is this, and what can they touch."

---

## 4. Office ownership vs. assignment (the one subtlety)

| | Employee | Employee Sub-User |
|---|---|---|
| Relationship to office | **Owns** it | **Assigned** to it |
| Stored as | `offices.assigned_user = user_id` | `users.office_id = office.id` |
| Can own multiple offices? | Yes | No — exactly one |
| Set by | Client, when creating/editing the office | Client or the owning Employee, when provisioning the sub-user |

Authorization checks for office-scoped actions (document registration, routing) test **both** relationships — a caller passes if they own the office *or* are assigned to it.

---

## 5. Document lifecycle across roles

```
Client / Employee / Employee Sub-User
        │  registers document (upload or scan)
        ▼
   CREATED
        │  office assigns a Messenger
        ▼
   PICKED_UP → IN_TRANSIT
        │  messenger delivers
        ▼
   ARRIVED_AT_OFFICE
        │  receiving office (Employee / Sub-User) confirms receipt
        ▼
   (next leg: another Messenger assigned) … → COMPLETED
```

Any of the three registering roles can create a document; any Employee/Sub-User at the document's *current* office can assign the next Messenger; the assigned Messenger is the only account (besides the assigning office) authorized to act on that document while it's in transit.
