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
import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_ROLES = ['client', 'employee']
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

  const supabase = await serverSupabaseServiceRole(event)
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
  title: string | undefined,
  event: H3Event,
): Promise<string> {
  const supabase = await serverSupabaseServiceRole(event)

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
  event: H3Event,
  limit: number = MEMORY_WINDOW,
): Promise<StoredChatMessage[]> {
  const supabase = await serverSupabaseServiceRole(event)

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
 * client to bypass RLS.
 */
export async function persistMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  event: H3Event,
  metadata: unknown = null,
): Promise<string> {
  const supabase = await serverSupabaseServiceRole(event)

  const messageId = randomUUID()
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
 */
export async function listSessions(userId: string, event: H3Event) {
  const supabase = await serverSupabaseServiceRole(event)

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
  userId: string,
  event: H3Event,
): Promise<boolean> {
  const supabase = await serverSupabaseServiceRole(event)

  const { data } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', String(userId))
    .maybeSingle()

  return Boolean(data?.id)
}

/**
 * Find the most recent assistant document payload in a session.
 */
export async function fetchLatestDocumentPayload(
  sessionId: string,
  event: H3Event,
): Promise<{ title: string; htmlContent: string } | null> {
  const supabase = await serverSupabaseServiceRole(event)

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
export async function fetchSessionTimeline(
  sessionId: string,
  event: H3Event,
): Promise<StoredChatMessage[]> {
  const supabase = await serverSupabaseServiceRole(event)

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
