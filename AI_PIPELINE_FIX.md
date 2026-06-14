# AI Pipeline Fix — Intent Routing & Session Persistence

> **Scope:** `server/api/rag/query.ts`, new server utilities, new AI session endpoints, and `app/components/ai/AiCanvasWorkspace.vue`.
> **Goal:** Turn the AI surface from a rigid "database dump tool" into a context-aware conversational engine with durable chat history.

---

## 1. Problem Analysis

### 1.1 The Intent Routing Bug — "Everything is a database query"

**Current behavior**

`POST /api/rag/query` pipes **every** prompt straight into the structured NLQ chain:

```
prompt → translateTextToQuery() (TTQT) → Supabase ilike search → MySQL blob hydration
       → generateDocumentTemplate() → synthesizeDataTemplate() → dataBuilderOutput
```

There is **no gateway** deciding whether the user actually wants data. So a casual `"hi"` or `"how are you"` is force-fed into TTQT, which dutifully invents `documentType`/`searchWords`, runs an `ilike` scan, hydrates whatever rows match, and returns a **document table dump**. The assistant can never "just talk".

**Root cause**

- TTQT is unconditional — it is the *first and only* interpretation layer.
- No classification step distinguishes **NLP** (small talk, follow-ups, capability questions) from **NLQ** (fetch/filter/view/manage records).
- The system has a single mode: *extract*.

**Impact**

- Greetings and meta-questions produce irrelevant, repetitive table dumps.
- Burns LLM + DB + MySQL round-trips on prompts that need none.
- Feels like a query console, not an assistant.

**Fix:** insert a lightweight **Intent Router** before TTQT. Classify each prompt as `conversation` or `data_query`. Only `data_query` activates the extraction engine; `conversation` is answered by a normal conversational model.

---

### 1.2 The State Persistence Breakage — "Every refresh forgets everything"

**Current behavior**

- Chat threads live **only** in client-side `ref()` state in `AiCanvasWorkspace.vue`.
- A "session" is a local object pushed into an in-memory array; it is **never linked to a database session id**.
- The backend receives only `{ prompt }`. It does **not** read or write any `chat_messages` / `chat_sessions` rows.

**Root cause**

- No `session_id` contract between client and server.
- No persistence hooks: messages are never saved.
- No memory: each request is stateless, so the model cannot reference earlier turns ("explain the previous answer" has nothing to explain).

**Impact**

- A page refresh wipes all conversations and "Recents".
- No continuity/memory across turns.
- Nothing is auditable or resumable.

**Fix:** introduce `chat_sessions` + `chat_messages` tables. The client passes an active `session_id`; the server creates one on first message, persists every user/assistant turn, and replays the **last 4–5 messages** as conversational memory.

---

## 2. Target Architecture

```
                         ┌─────────────────────────┐
   prompt + session_id → │  POST /api/rag/query     │
                         │                          │
                         │  1. resolveTenant()      │  ← org/user from session cookies
                         │  2. ensureSession()      │  ← create/verify chat_sessions row
                         │  3. fetchRecentMessages()│  ← last 5 turns = memory
                         │  4. persist(user msg)    │
                         │  5. classifyIntent() ────┼──┐
                         └─────────────┬────────────┘  │
                                       │               │
                  conversation ────────┘               └──────── data_query
                         │                                            │
              generateConversationalReply()              TTQT → hydrate → formatter
                         │                                  → synthesizeDataTemplate()
                         └──────────────┬─────────────────────────────┘
                                        │
                              persist(assistant msg) → return { mode, session_id, reply, dataBuilderOutput? }
```

### 2.1 Database schema (Supabase / PostgreSQL)

```sql
create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  user_id     uuid not null,
  title       text not null default 'New chat',
  created_at  timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.chat_sessions(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  metadata    jsonb,                       -- persists dataBuilderOutput for data_query turns
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at);
create index if not exists chat_sessions_tenant_idx  on public.chat_sessions (org_id, user_id, created_at desc);
```

> **Tenancy:** both tables are always filtered by the **session-derived** `org_id` + `user_id`. A user can only read/append their own sessions; cross-tenant access is structurally impossible (mirrors the RAG tenant fix).

---

## 3. Intent Routing Rules

`classifyIntent(prompt)` returns one of:

| Intent          | Triggers                                                                                  | Engine                              |
| --------------- | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| `conversation`  | greetings (`hi`, `hello`), thanks, small talk, capability questions, "explain the previous answer", anything not clearly a data request | Conversational NLP reply            |
| `data_query`    | explicit asks to **fetch / filter / view / list / summarize / manage** specific documents, records, reports, or municipal data | TTQT → hydrate → formatter → builder |

**Fail-safe:** if classification errors or is ambiguous, default to **`conversation`** — never dump data the user didn't ask for.

---

## 4. Session & Memory Rules

1. **Create-on-first-message:** if no `session_id` is supplied, the server creates a `chat_sessions` row (title = first prompt) and returns its `id`. The client reuses it for the rest of the thread.
2. **Memory window:** for an existing session, the server loads the **last 5** `chat_messages` (chronological) and passes them as context to the conversational/intent layers.
3. **Write-through:** every user prompt and every assistant reply is inserted into `chat_messages` immediately, so a refresh can fully rehydrate the thread.
4. **Resumability:** the client loads `Recents` from `GET /api/ai/sessions` and a thread's messages from `GET /api/ai/messages?session_id=…` (with `metadata` rehydrating any inline dataset preview).

---

## 5. Implementation Map

| File                                        | Change                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `server/utils/intentRouter.ts` *(new)*      | `classifyIntent()` — LLM JSON classifier, conversation-safe default.   |
| `server/utils/conversation.ts` *(new)*      | `generateConversationalReply()` — grounded small-talk/assistant reply. |
| `server/utils/aiSession.ts` *(new)*         | `resolveTenant()`, `ensureSession()`, `fetchRecentMessages()`, `persistMessage()`. |
| `server/api/rag/query.ts`                   | Intent gateway, session binding, memory replay, write-through persistence, unioned response (`mode`). |
| `server/api/ai/sessions.get.ts` *(new)*     | List the caller's chat sessions for "Recents".                         |
| `server/api/ai/messages.get.ts` *(new)*     | Return a session's messages (ownership-checked) for refresh hydration. |
| `app/components/ai/AiCanvasWorkspace.vue`   | Send/track `session_id`, DB-backed Recents, load history on select, render `reply` + persisted dataset. |

---

## 6. Outcome

- **Conversational by default:** "hi" gets a friendly reply, not a table.
- **Targeted extraction:** the NLQ engine fires only on genuine data requests.
- **Durable memory:** threads survive refresh, appear under Recents, and carry rolling context so follow-ups make sense.
