import { compare } from 'bcrypt-ts'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body
  const db = event.context.db;

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required.',
    })
  }

  try {
    const [rows]: any = await db.query(
      'SELECT * FROM users WHERE email = ? LIMIT 1', 
      [email]
    )
    const user = rows[0]
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials.',
      })
    }
    const isPasswordValid = await compare(password, user.password)

    if (!isPasswordValid) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials.',
      })
    }

    const { password: _, ...safeUser } = user
    const token = 'generated-session-token' 

    setCookie(event, 'auth_user', JSON.stringify(safeUser), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'BoyLupotJv',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })

    setCookie(event, 'auth_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'BoyLupotJv',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })

    return {
      message: 'Login successful',
      user: safeUser,
      token: token
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal Server Error',
    })
  }
})