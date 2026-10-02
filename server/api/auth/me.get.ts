/**
 * GET /api/auth/me
 *
 * The signed-in user, from the verified session (never from a browser cookie
 * the page can read). Returns { user: null } when not signed in, so public
 * pages can call it without handling an error.
 */
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) return { user: null }

  const config = useRuntimeConfig()
  const client = createClient(config.public.supabaseUrl, config.supabaseServiceKey)
  const { data: user } = await client
    .from('users')
    .select('*')
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (!user) return { user: null }

  const { password: _password, ...safeUser } = user
  return { user: safeUser }
})
