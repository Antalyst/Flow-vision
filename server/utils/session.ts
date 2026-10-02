/**
 * server/utils/session.ts
 *
 * Server-verified login sessions. Replaces the old forgeable `user_session` /
 * `user_role` cookies (a bare user id and role anyone could edit).
 *
 * - The browser holds a random 32-byte token in the HttpOnly `fv_session` cookie.
 * - Only its SHA-256 hash is stored, in `auth_sessions` (RLS on, no policies —
 *   reachable only with the service-role key, server-side).
 * - Identity, role, org, office and active status are loaded from `users` on
 *   every request (server/middleware/auth.ts) — never from anything the
 *   browser sends.
 */
import { createHash, randomBytes } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

export const SESSION_COOKIE = 'fv_session'
/** Old readable identity cookies — never trusted, deleted on sight. */
const LEGACY_COOKIES = ['user_session', 'user_role', 'auth_user', 'auth_token'] as const

const DAY_MS = 24 * 60 * 60 * 1000
/** Hard limit on a session's life, regardless of activity. */
const ABSOLUTE_TTL_MS = 30 * DAY_MS
/** A session unused for this long expires. */
const IDLE_TTL_MS = 7 * DAY_MS
/** How often last_seen_at is refreshed (avoids a DB write on every request). */
const TOUCH_INTERVAL_MS = 15 * 60 * 1000
/** base64url of 32 random bytes. Anything else is rejected before touching the DB. */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

export interface AuthContext {
  userId: string
  role: string
  orgId: string | null
  officeId: string | null
  fullName: string | null
  email: string | null
  sessionHash: string
}

declare module 'h3' {
  interface H3EventContext {
    /** Verified identity for this request, or null when not signed in. Set by server/middleware/auth.ts. */
    auth?: AuthContext | null
  }
}

let db: SupabaseClient | null = null
function sessionDb(): SupabaseClient {
  if (!db) {
    const config = useRuntimeConfig()
    db = createClient(String(config.public.supabaseUrl), String(config.supabaseServiceKey), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return db
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

/** users.status: 1 = active, 0 = deactivated. Older accounts may have NULL — treated as active. */
export function isActiveUserStatus(status: unknown) {
  return !(status === 0 || status === '0')
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

/** Creates a new session for `userId` and sets the session cookie. */
export async function createSession(event: H3Event, userId: string) {
  const token = randomBytes(32).toString('base64url')
  const now = Date.now()
  const { error } = await sessionDb().from('auth_sessions').insert({
    token_hash: hashSessionToken(token),
    user_id: userId,
    created_at: new Date(now).toISOString(),
    last_seen_at: new Date(now).toISOString(),
    expires_at: new Date(now + ABSOLUTE_TTL_MS).toISOString(),
    user_agent: (getRequestHeader(event, 'user-agent') ?? '').slice(0, 500) || null,
    ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
  })
  if (error) {
    console.error('[session] could not create session:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'We could not sign you in. Please try again.' })
  }
  setCookie(event, SESSION_COOKIE, token, cookieOptions(ABSOLUTE_TTL_MS / 1000))
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export function clearLegacyCookies(event: H3Event) {
  for (const name of LEGACY_COOKIES) {
    if (getCookie(event, name) !== undefined) deleteCookie(event, name, { path: '/' })
  }
}

/**
 * Resolves the request's session cookie to a verified identity, or null.
 * Rejects unknown, tampered, expired, idle, revoked, and deactivated-user sessions.
 */
export async function resolveSession(event: H3Event): Promise<AuthContext | null> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null
  if (!TOKEN_RE.test(token)) {
    clearSessionCookie(event)
    return null
  }

  const tokenHash = hashSessionToken(token)
  const client = sessionDb()
  const { data: session, error } = await client
    .from('auth_sessions')
    .select('token_hash, user_id, last_seen_at, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error) {
    console.error('[session] lookup failed:', error.message)
    return null
  }

  const now = Date.now()
  if (
    !session
    || session.revoked_at
    || new Date(session.expires_at).getTime() <= now
    || new Date(session.last_seen_at).getTime() + IDLE_TTL_MS <= now
  ) {
    clearSessionCookie(event)
    return null
  }

  const { data: user } = await client
    .from('users')
    .select('user_id, role, org_id, office_id, full_name, email, status')
    .eq('user_id', session.user_id)
    .maybeSingle()

  if (!user || !user.role || !isActiveUserStatus(user.status)) {
    clearSessionCookie(event)
    return null
  }

  if (new Date(session.last_seen_at).getTime() + TOUCH_INTERVAL_MS <= now) {
    const { error: touchErr } = await client
      .from('auth_sessions')
      .update({ last_seen_at: new Date(now).toISOString() })
      .eq('token_hash', tokenHash)
    if (touchErr) console.warn('[session] last_seen_at update failed (non-fatal):', touchErr.message)
  }

  return {
    userId: String(user.user_id),
    role: String(user.role).toLowerCase(),
    orgId: user.org_id ? String(user.org_id) : null,
    officeId: user.office_id ? String(user.office_id) : null,
    fullName: user.full_name ?? null,
    email: user.email ?? null,
    sessionHash: tokenHash,
  }
}

/** Revokes the current request's session (logout / re-login rotation) and clears the cookie. */
export async function revokeCurrentSession(event: H3Event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (token && TOKEN_RE.test(token)) {
    const { error } = await sessionDb()
      .from('auth_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', hashSessionToken(token))
      .is('revoked_at', null)
    if (error) console.error('[session] revoke failed:', error.message)
  }
  clearSessionCookie(event)
}

/** Revokes every session of a user (deactivation, removal). */
export async function revokeUserSessions(userId: string) {
  const { error } = await sessionDb()
    .from('auth_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null)
  if (error) console.error('[session] revoke-all failed:', error.message)
}

/** Verified user id of this request (undefined when not signed in). Replaces getCookie('user_session'). */
export function sessionUserId(event: H3Event): string | undefined {
  return event.context.auth?.userId
}

/** Verified role of this request, from `users.role` (undefined when not signed in). Replaces getCookie('user_role'). */
export function sessionRole(event: H3Event): string | undefined {
  return event.context.auth?.role
}

/** Throws 401 when not signed in, 403 when the role isn't allowed. */
export function requireAuth(event: H3Event, roles?: readonly string[]): AuthContext {
  const auth = event.context.auth
  if (!auth) {
    throw createError({ statusCode: 401, statusMessage: 'Please sign in to continue.' })
  }
  if (roles && !roles.includes(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have permission to do this.' })
  }
  return auth
}

/** Like requireAuth, and also requires an organization; throws 403 if `orgId` (e.g. from a request) isn't the caller's own. */
export function requireOrgAuth(event: H3Event, roles?: readonly string[], orgId?: unknown): AuthContext & { orgId: string } {
  const auth = requireAuth(event, roles)
  if (!auth.orgId) {
    throw createError({ statusCode: 403, statusMessage: 'Your account is not linked to an organization.' })
  }
  if (orgId !== undefined && orgId !== null && orgId !== '' && String(orgId) !== auth.orgId) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have access to this organization.' })
  }
  return auth as AuthContext & { orgId: string }
}

// ── Login rate limiting (auth_login_attempts; serverless has no shared memory) ──
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES_PER_EMAIL = 5
const MAX_FAILURES_PER_IP = 20

export function hashLoginEmail(email: string) {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

export async function isLoginRateLimited(emailHash: string, ip: string | null) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString()
  const client = sessionDb()
  const { count: emailFailures } = await client
    .from('auth_login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('email_hash', emailHash).eq('success', false).gte('created_at', since)
  if ((emailFailures ?? 0) >= MAX_FAILURES_PER_EMAIL) return true
  if (!ip) return false
  const { count: ipFailures } = await client
    .from('auth_login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip).eq('success', false).gte('created_at', since)
  return (ipFailures ?? 0) >= MAX_FAILURES_PER_IP
}

export async function recordLoginAttempt(emailHash: string, ip: string | null, success: boolean) {
  const { error } = await sessionDb().from('auth_login_attempts').insert({ email_hash: emailHash, ip, success })
  if (error) console.warn('[session] could not record login attempt:', error.message)
}
