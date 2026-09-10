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

export type ScopeParam = 'GLOBAL' | 'LOCAL' | 'INCOMING'

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
 * Accepts: 'GLOBAL' | 'LOCAL' | 'INCOMING' | 'global' | 'local' | 'incoming'
 * Default: 'GLOBAL'
 */
export function parseScope(raw: string | undefined): ScopeParam {
  const upper = (raw ?? 'GLOBAL').toUpperCase()
  if (upper === 'LOCAL') return 'LOCAL'
  if (upper === 'INCOMING') return 'INCOMING'
  return 'GLOBAL'
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
  if (String(actorRow.role).toLowerCase() !== String(userRole).toLowerCase()) {
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
  if (base.userRole !== 'employee' && base.userRole !== 'employee_sub_user') {
    return { ...base, officeIds: [] }
  }

  const officeIdSet = new Set<string>()

  // 1. Check user profile for directly assigned office_id or current_office_id
  const { data: userRow } = await client
    .from('users')
    .select('office_id, current_office_id')
    .eq('user_id', base.userId)
    .maybeSingle()

  if (userRow?.office_id != null && String(userRow.office_id).trim()) {
    officeIdSet.add(String(userRow.office_id).trim())
  }
  if (userRow?.current_office_id != null && String(userRow.current_office_id).trim()) {
    officeIdSet.add(String(userRow.current_office_id).trim())
  }

  // 2. Fetch offices assigned to this employee via assigned_user
  const { data: officeRows, error: officeErr } = await client
    .from('offices')
    .select('id')
    .eq('org_id', base.orgId)
    .eq('assigned_user', base.userId)

  if (officeErr) {
    console.warn('[actorContext] Could not resolve assigned offices:', officeErr.message)
  } else if (officeRows) {
    for (const o of officeRows) {
      if (o?.id != null && String(o.id).trim()) {
        officeIdSet.add(String(o.id).trim())
      }
    }
  }

  return { ...base, officeIds: Array.from(officeIdSet) }
}

