/**
 * server/utils/actorContext.ts
 *
 * Shared utility: resolve the authenticated actor's identity and organisation
 * from the session cookie + a DB lookup.
 *
 * Security contract
 * ─────────────────
 * • org_id is ALWAYS read from the `users` table keyed by the session cookie's
 *   user_id.  It is NEVER accepted from query-string parameters.
 * • If the DB-resolved org_id differs from any org_id supplied in the request
 *   query string, the session value wins.
 * • Callers can optionally request the actor's assigned office IDs for
 *   LOCAL-scope filtering.
 */

import type { H3Event } from 'h3'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScopeParam = 'GLOBAL' | 'LOCAL'

export interface ActorContext {
  /** user_id from the session cookie */
  userId:    string
  /** role from the session cookie (cross-checked against DB) */
  userRole:  string
  /** org_id resolved from the DB — never from the request */
  orgId:     string
  /** full_name for audit-trail notes */
  fullName:  string | null
}

export interface ActorContextWithOffices extends ActorContext {
  /**
   * UUIDs of every office assigned to this actor (used for LOCAL scope).
   * Empty array for client admins (they always see the full org).
   */
  officeIds: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse `scope` from the query string and normalise to uppercase.
 * Accepts: 'GLOBAL' | 'LOCAL' | 'global' | 'local'
 * Default: 'GLOBAL'
 */
export function parseScope(raw: string | undefined): ScopeParam {
  const upper = (raw ?? 'GLOBAL').toUpperCase()
  return upper === 'LOCAL' ? 'LOCAL' : 'GLOBAL'
}

// ── Core resolvers ────────────────────────────────────────────────────────────

/**
 * Resolves the bare actor context (userId, userRole, orgId, fullName).
 * Throws 401 if the session cookie is missing.
 * Throws 403 if the user row cannot be found or has no org_id.
 */
export async function resolveActorContext(
  event: H3Event,
  client: ReturnType<typeof import('#supabase/server').serverSupabaseClient extends (...args: any) => infer R ? () => R : never>,
): Promise<ActorContext> {
  const userId   = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role')

  if (!userId || !userRole) {
    throw createError({ statusCode: 401, message: 'Authentication required.' })
  }

  const { data: actorRow, error } = await (client as any)
    .from('users')
    .select('org_id, full_name, role')
    .eq('user_id', userId)
    .single()

  if (error || !actorRow?.org_id) {
    throw createError({
      statusCode: 403,
      message: 'Could not resolve authenticated user profile. Please log in again.',
    })
  }

  // Cookie-role vs DB-role cross-check — defend against tampered cookies
  if (String(actorRow.role) !== String(userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Role mismatch: session cookie does not match database profile.',
    })
  }

  return {
    userId,
    userRole,
    orgId:    String(actorRow.org_id),
    fullName: actorRow.full_name ?? null,
  }
}

/**
 * Extends resolveActorContext with a second lookup that fetches every office
 * UUID assigned to this actor within their org.
 *
 * Used by LOCAL-scope endpoints to build the office filter list.
 * Client admins always receive an empty officeIds array (they bypass LOCAL
 * filtering and always see the full org).
 */
export async function resolveActorContextWithOffices(
  event: H3Event,
  client: any,
): Promise<ActorContextWithOffices> {
  const base = await resolveActorContext(event, client)

  // Client admins have no assigned offices — LOCAL scope is not applicable
  if (base.userRole !== 'employee') {
    return { ...base, officeIds: [] }
  }

  const { data: officeRows, error: officeErr } = await client
    .from('offices')
    .select('id')
    .eq('org_id', base.orgId)
    .eq('assigned_user', base.userId)

  if (officeErr) {
    // Non-fatal: fall back to empty set (employee sees own uploads only in LOCAL)
    console.warn('[actorContext] Could not resolve office list:', officeErr.message)
    return { ...base, officeIds: [] }
  }

  const officeIds: string[] = (officeRows ?? []).map((o: any) => String(o.id))
  return { ...base, officeIds }
}
