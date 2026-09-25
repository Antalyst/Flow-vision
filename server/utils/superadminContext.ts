import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'

/**
 * Super admins are platform-wide accounts — they carry role = 'superadmin' in
 * public.users but (unlike every other role) are NOT scoped to an org_id, so
 * they can't use resolveActorContext (which hard-requires org_id). This is the
 * equivalent identity resolver + service-role DB handle for the /superadmin/* API.
 */

export function getSuperadminDb() {
  const config = useRuntimeConfig()
  return createClient(String(config.public.supabaseUrl), String(config.supabaseServiceKey))
}

export interface SuperadminActor {
  userId: string
  fullName: string | null
  email: string | null
}

export async function requireSuperadmin(event: H3Event): Promise<SuperadminActor> {
  const userId = getCookie(event, 'user_session')
  const role = getCookie(event, 'user_role')

  if (!userId || role !== 'superadmin') {
    throw createError({ statusCode: 403, message: 'Forbidden: super administrator access required' })
  }

  const db = getSuperadminDb()
  const { data, error } = await db
    .from('users')
    .select('user_id, full_name, email, role')
    .eq('user_id', userId)
    .single()

  if (error || !data || String(data.role).toLowerCase() !== 'superadmin') {
    throw createError({ statusCode: 403, message: 'Could not verify super administrator identity' })
  }

  return { userId, fullName: data.full_name ?? null, email: data.email ?? null }
}

/** The four operator-managed account types — superadmin accounts are never
 * created/edited/deleted through the accounts CRUD surface. */
export const MANAGED_ROLES = ['client', 'employee', 'employee_sub_user', 'messenger'] as const
export type ManagedRole = typeof MANAGED_ROLES[number]

export function isManagedRole(role: unknown): role is ManagedRole {
  return typeof role === 'string' && (MANAGED_ROLES as readonly string[]).includes(role)
}
