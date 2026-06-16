import { createClient } from '@supabase/supabase-js'
import { compare } from 'bcrypt-ts'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { email, password } = body

  const client = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  // 1. Find user by email in public.users
  console.log("Login attempt for email:", email);
  const { data: user, error: userError } = await client
    .from('users') 
    .select('*')
    .eq('email', email)
    .single()

  if (userError || !user) {
    console.error("User not found or lookup error:", userError);
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password',
    })
  }

  console.log("User found, verifying password...");
  // 2. Verify hashed password
  const isPasswordCorrect = await compare(password, user.password)
  console.log("Password verification result:", isPasswordCorrect);
  if (!isPasswordCorrect) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password',
    })
  }

  // Remove password from user object before returning
  const { password: _, ...userWithoutPassword } = user

  const sessionUserId = user.user_id || user.id || ''

  setCookie(event, 'user_session', sessionUserId, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax'
  })
  setCookie(event, 'user_role', user.role || '', {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax'
  })

  return {
    success: true,
    message: 'Login successful',
    user: userWithoutPassword,
    token: 'session_token_placeholder' 
  }
})