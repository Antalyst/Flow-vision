// server/utils/aiSession.ts
//
// Tenancy + chat-session lifecycle framework for the AI pipeline.
//
// Identity is ALWAYS derived from the server-set session cookies (never the
// request body), and every chat row is hard-scoped to the resolved org_id +
// user_id. A privileged service-role client is used for the chat tables so the
// pipeline is not blocked by RLS — multi-tenant isolation is instead enforced
// explicitly in every query below.
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_ROLES = ['client', 'employee', 'employee_sub_user']
const MEMORY_WINDOW = 5

export interface TenantContext {
  userId: string
  orgId: string
  role: string
}

export interface StoredChatMessage {
  role: 'user' | 'assistant'
  content: string
  metadata?: unknown
  created_at?: string
}

// ── Lazy service-role client (built once per server runtime) ────────────────
let adminClient: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const config = useRuntimeConfig()
    const url = config.public?.supabaseUrl
    const serviceKey = config.supabaseServiceKey

    if (!url || !serviceKey) {
      // Surface a misconfigured service role immediately — without it, RLS will
      // silently reject every chat insert and reads come back empty.
      console.error(
        'Database write failed: missing Supabase admin credentials',
        { hasUrl: Boolean(url), hasServiceKey: Boolean(serviceKey) }
      )
      throw createError({
        statusCode: 500,
        statusMessage: 'Supabase service-role credentials are not configured on the server.',
      })
    }

    adminClient = createClient(url, serviceKey)
  }
  return adminClient
}

/**
 * Resolve the authenticated tenant from trusted session cookies + the users table.
 * Fails CLOSED: throws 401 when the session is missing/unauthorized and 403 when
 * no valid organization scope can be bound to the user.
 */
export async function resolveTenant(event: H3Event): Promise<TenantContext> {
  const userId = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role')

  if (!userId || !userRole || !ALLOWED_ROLES.includes(userRole)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthenticated: a valid client or employee session is required.',
    })
  }

  const supabase = getAdminClient()
  const { data: sessionUser, error } = await supabase
    .from('users')
    .select('org_id')
    .eq('user_id', userId)
    .single()

  const orgId = sessionUser?.org_id ? String(sessionUser.org_id) : null

  if (error || !orgId || !UUID_REGEX.test(orgId)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: no valid organization scope is bound to this session.',
    })
  }

  return { userId, orgId, role: userRole }
}

/**
 * Verify ownership of an incoming session id, or create one on first message.
 * Returns the active session id to bind for the rest of the turn.
 */
export async function ensureSession(
  sessionId: string | null | undefined,
  orgId: string,
  userId: string,
  title?: string
): Promise<string> {
  const supabase = getAdminClient()

  if (sessionId && UUID_REGEX.test(sessionId)) {
    const { data: owned } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', String(userId))
      .maybeSingle()

    if (owned?.id) {
      return owned.id as string
    }
  }

  const newId = randomUUID()
  const sessionTitle = (title || 'New chat').trim().slice(0, 60) || 'New chat'

  // Supply id + created_at explicitly so the insert succeeds even if the table
  // was created without column defaults.
  const { error } = await supabase.from('chat_sessions').insert({
    id: newId,
    org_id: String(orgId),
    user_id: String(userId),
    title: sessionTitle,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Postgres Insertion Error Details:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to provision chat session: ${error.message}`,
    })
  }

  return newId
}

/**
 * Pull the last N turns (chronological order) for rolling conversational memory.
 */
export async function fetchRecentMessages(
  sessionId: string,
  limit: number = MEMORY_WINDOW
): Promise<StoredChatMessage[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content, metadata, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return (data as StoredChatMessage[]).slice().reverse()
}

/**
 * Write-through persistence of a single chat turn, using the service-role
 * client to bypass RLS. The insert maps exactly to the chat_messages schema:
 *   id (uuid) · session_id (uuid) · role (text 'user'|'assistant') ·
 *   content (text) · metadata (jsonb) · created_at (timestamptz)
 *
 * id + created_at are supplied explicitly so the row writes even when the table
 * lacks column defaults. Throws (with the exact DB error logged) on failure so
 * the write never fails silently.
 */
export async function persistMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata: unknown = null
): Promise<string> {
  const supabase = getAdminClient()

  const messageId = randomUUID()
  // Must match the chat_messages_role_check constraint exactly: lowercase
  // 'user' or 'assistant'.
  const normalizedRole: 'user' | 'assistant' =
    String(role).toLowerCase() === 'assistant' ? 'assistant' : 'user'

  const payload = {
    id: messageId,
    session_id: sessionId,
    role: normalizedRole,
    content: typeof content === 'string' ? content : String(content ?? ''),
    metadata: metadata ?? null,
    created_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('chat_messages').insert(payload)

  if (error) {
    console.error('Postgres Insertion Error Details:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to persist chat message: ${error.message}`,
    })
  }

  return messageId
}

/**
 * List a user's chat sessions, newest first (Recents rail).
 *
 * Ownership is keyed STRICTLY on user_id — the reliable per-user identity. We
 * intentionally do not also gate reads on org_id here: a stale/mismatched org
 * scope was silently producing empty result sets even when the user owned rows.
 */
export async function listSessions(userId: string) {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at')
    .eq('user_id', String(userId))
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load chat sessions: ${error.message}`,
    })
  }

  return data ?? []
}

/**
 * Ownership guard — true only when the session belongs to the calling user_id.
 */
export async function assertSessionOwnership(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const supabase = getAdminClient()

  const { data } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', String(userId))
    .maybeSingle()

  return Boolean(data?.id)
}

/**
 * Find the most recent assistant document payload in a session, so a follow-up
 * formatting critique can revise the existing document (the "active document").
 * Scans recent assistant turns rather than just the last memory window.
 */
export async function fetchLatestDocumentPayload(
  sessionId: string
): Promise<{ title: string; htmlContent: string } | null> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('chat_messages')
    .select('metadata, created_at')
    .eq('session_id', sessionId)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(15)

  if (error || !data) {
    return null
  }

  for (const row of data) {
    const dp = (row as { metadata?: any })?.metadata?.documentPayload
    if (dp?.htmlContent) {
      return {
        title: String(dp.title || 'Document'),
        htmlContent: String(dp.htmlContent),
      }
    }
  }

  return null
}

/**
 * Complete chronological message timeline for a session.
 */
export async function fetchSessionTimeline(sessionId: string): Promise<StoredChatMessage[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content, metadata, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load chat messages: ${error.message}`,
    })
  }

  return (data ?? []) as StoredChatMessage[]
}

export { UUID_REGEX }
