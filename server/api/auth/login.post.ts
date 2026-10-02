/**
 * POST /api/auth/login
 *
 * Verifies email + password (bcrypt) against public.users, then starts a
 * server-side session (HttpOnly fv_session cookie — see server/utils/session.ts).
 * No readable identity cookies are set any more.
 *
 * Failed attempts are rate limited per email and per IP. Errors never reveal
 * whether an email is registered.
 */
import { createClient } from '@supabase/supabase-js'
import { compare } from 'bcrypt-ts'

const INVALID_CREDENTIALS = 'Invalid email or password.'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter your email and password.' })
  }

  const emailHash = hashLoginEmail(email)
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? null

  if (await isLoginRateLimited(emailHash, ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many failed sign-in attempts. Please wait 15 minutes and try again.',
    })
  }

  const client = createClient(config.public.supabaseUrl, config.supabaseServiceKey)
  const { data: user } = await client
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  const passwordOk = !!user?.password && await compare(password, user.password).catch(() => false)
  if (!user || !passwordOk) {
    await recordLoginAttempt(emailHash, ip, false)
    throw createError({ statusCode: 401, statusMessage: INVALID_CREDENTIALS })
  }

  if (!isActiveUserStatus(user.status)) {
    await recordLoginAttempt(emailHash, ip, false)
    throw createError({ statusCode: 403, statusMessage: 'This account has been deactivated. Please contact your administrator.' })
  }

  await recordLoginAttempt(emailHash, ip, true)

  // Rotation: any session this browser already had is revoked; a fresh one is issued.
  await revokeCurrentSession(event)
  await createSession(event, String(user.user_id))

  const { password: _password, ...safeUser } = user
  return {
    success: true,
    message: 'Login successful',
    user: safeUser,
  }
})
