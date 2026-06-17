# Debugging Activity Logs: Client Document Upload Failure

## 1. Code Trace & Discovery

- **Document Upload Handler File Path:** `server/api/documents/upload.post.ts`
- **Activity Log Utility (insert + fetch):** `server/utils/activityLog.ts`
- **Activity Log API Endpoint:** `server/api/activity-logs/index.get.ts`
- **Activity Log Fetching Component File Path:** `app/components/activity/ActivityTimeline.vue`
- **Activity Log Composable (frontend query):** `app/composables/useActivityLogs.ts`
- **Client Activity Page:** `app/pages/client/activity.vue`
- **Database Migration (table definition):** `supabase/migrations/20260616_activity_notifications.sql`

### Upload flow (Client role)

1. `POST /api/documents/upload` authenticates via cookies `user_session` + `user_role`.
2. Step 2 loads `org_id` and `full_name` from `public.users` (never from the form). Upload aborts with **401** if `org_id` is missing — so a successful document insert always has a valid `org_id`.
3. Step 7 inserts into `public.documents` via `serverSupabaseClient(event)` (`@nuxtjs/supabase`).
4. After the CREATED tracking event (Step 9), a **secondary** `try/catch` block calls `logActivity()` then `createPickupNotification()`.

### Fetch flow (Client role)

1. `ActivityTimeline.vue` → `useActivityLogs()` → `GET /api/activity-logs?range=week&action=all`
2. `fetchActivityLogsForActor()` in `activityLog.ts` resolves the session `org_id` and queries:
   - `.eq('org_id', actor.orgId)` only (no `office_id` / `user_id` scoping for clients)
   - Optional date range (`week` by default) and action-type filter from query params
3. The Vue component does **not** apply any additional client-side filtering.

---

## 2. Why It Is Not Working (The Root Cause)

The insert hook **exists** but failures were **invisible** to the user. Three compounding issues were identified:

### A. Silent insert failures (primary — write path)

`logActivity()` in `server/utils/activityLog.ts` catches Supabase errors internally and only calls `console.error`. It does **not** throw, return a status, or surface an error to the upload response. The upload handler wraps the hook in another `try/catch` that also only logs to the server console.

**Result:** The document upload returns `success: true` even when `activity_logs` insert fails (missing table, RLS denial, wrong API key, constraint violation, etc.).

### B. Supabase client credential mismatch (primary — read path, historically)

Document inserts use `serverSupabaseClient(event)` from `@nuxtjs/supabase` (typically `NUXT_SUPABASE_SECRET_KEY` / service role).

An earlier version of `fetchActivityLogsForActor()` used `useServerSupabase()` from `server/utils/supabase.ts`, which reads `runtimeConfig.supabaseServiceKey` from `SUPABASE_SERVICE_KEY` only. If that env var was unset while the Nuxt module key was set:

- `documents` inserts succeeded (service role via Nuxt module)
- `activity_logs` **reads returned empty** (anon or invalid key + RLS enabled with no policies on `activity_logs`)

`activity_logs` has RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) but **no permissive policies** for anon/authenticated roles — only the service role bypasses RLS.

### C. Client `office_id` on insert (secondary — fixed)

Client uploads previously passed `officeId: effectiveOfficeId`, which could inherit a legacy `office_id` form field. That did not block client **fetch** after the client query was corrected to `org_id` only, but it violated the org-wide transparency model (client uploads should log with `office_id = null`).

### D. Migration not applied (environment)

If `supabase/migrations/20260616_activity_notifications.sql` has not been run against the live database, `public.activity_logs` does not exist. PostgREST returns an error on insert; because of (A), the upload still appears successful.

### Session / constraint audit

| Column        | Client upload value              | DB constraint                          | Fails? |
|---------------|----------------------------------|----------------------------------------|--------|
| `org_id`      | `String(users.org_id)` — required before upload proceeds | `NOT NULL` | No (upload would already 401) |
| `user_id`     | Session `user_session` cookie    | Nullable                               | No |
| `user_name`   | `users.full_name` (may be null)  | Nullable                               | No |
| `office_id`   | Should be `null` for client      | Nullable UUID                          | No |
| `action_type` | `'upload'` (lowercase)           | CHECK `IN ('upload', ...)`             | No (unless `'UPLOAD'` sent) |
| `message`     | Built from name + title          | `NOT NULL`                             | No |

**Frontend:** `useActivityLogs.ts` does not filter by `office_id` or `user_id`. The only filters are `range` (default `week`) and `action` (default `all`) sent as query params to the API.

---

## 3. The Code Block Responsible

### Silent failure in `logActivity` (insert swallows errors)

```typescript
// server/utils/activityLog.ts (before fix)
export async function logActivity(input: ActivityLogInput, client = useServerSupabase()) {
  const { error } = await client.from('activity_logs').insert({ ... })

  if (error) {
    console.error('[activityLog] Failed to write activity log:', error.message, input)
    // ← no throw, no return value — caller assumes success
  }
}
```

### Upload hook isolated in non-fatal try/catch

```typescript
// server/api/documents/upload.post.ts (before fix)
try {
  await logActivity({ orgId, officeId: effectiveOfficeId, ... }, client)
  await createPickupNotification({ ... }, client)
} catch (activityErr) {
  console.error('[Upload] Activity/notification hook failed:', activityErr)
  // ← upload still returns success: true
}
```

### Historical client fetch using wrong Supabase client

```typescript
// server/utils/activityLog.ts (before fix)
const client = useServerSupabase()  // wrong key / RLS → empty []
// ...
query = query.eq('org_id', actor.orgId)
// employee branch could previously share the same else-path; client now has explicit branch
```

---

## 4. Exact Implementation Fix

### 4a. Make `logActivity` fail loudly and verify the row was written

```typescript
// server/utils/activityLog.ts
export async function logActivity(
  input: ActivityLogInput,
  client: Awaited<ReturnType<typeof serverSupabaseClient>>,
): Promise<string> {
  const { data, error } = await client
    .from('activity_logs')
    .insert({
      org_id: String(input.orgId),
      office_id: input.officeId ?? null,
      user_id: input.userId ?? null,
      user_name: input.userName ?? null,
      action_type: input.actionType,
      message: input.message,
      document_id: input.documentId ?? null,
      metadata: input.metadata ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      message: `Activity log insert failed: ${error?.message ?? 'unknown error'}`,
    })
  }

  return (data as { id: string }).id
}
```

### 4b. Call `logActivity` immediately after document insert (client: `office_id = null`)

```typescript
// server/api/documents/upload.post.ts — after supabaseDoc is committed
const docTitle = aiAnalysis.title ?? supabaseDoc.title ?? 'Document'

await logActivity({
  orgId: String(orgId),
  officeId: resolvedRole === 'client' ? null : effectiveOfficeId,
  userId,
  userName: actorName,
  actionType: 'upload',
  message: `${actorName ?? 'User'} uploaded "${docTitle}"`,
  documentId: supabaseDoc.id,
}, client)

// notifications remain best-effort in their own try/catch
```

### 4c. Client fetch — `org_id` only, same Supabase client as upload

```typescript
// server/utils/activityLog.ts — fetchActivityLogsForActor
const client = await serverSupabaseClient(event)

if (userRole === 'client') {
  const actor = await resolveActorContext(event, client)
  query = query.eq('org_id', actor.orgId)
  // no .eq('office_id', ...) and no .eq('user_id', ...)
}
```

### 4d. Apply database migration

Run `supabase/migrations/20260616_activity_notifications.sql` (and `20260616_notifications_message_user.sql` if using messenger notifications) on the target Supabase project so `public.activity_logs` exists.

### 4e. Environment

Ensure **one** service-role key is configured for server routes:

- `NUXT_SUPABASE_SECRET_KEY` (preferred by `@nuxtjs/supabase`), or
- `SUPABASE_SERVICE_KEY` (fallback in `nuxt.config.ts` `runtimeConfig.supabaseServiceKey`)

---

## 5. Verification checklist

1. Upload a document as a **Client** user.
2. Confirm a row exists: `SELECT * FROM activity_logs WHERE document_id = '<new-doc-id>';`
3. Open **Client → Activity**; set date range to **All time** if needed.
4. Confirm `GET /api/activity-logs` returns the new row with matching `org_id`.
5. If insert still fails, check server logs for `Activity log insert failed:` (now thrown, not swallowed).
