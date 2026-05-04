import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const adminClient = await serverSupabaseServiceRole(event)

  const { data: { users }, error } = await adminClient.auth.admin.listUsers()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Auth Error: ${error.message}`,
    })
  }

  return {
    success: true,
    total_users: users.length,
    users: users.map(user => ({
      id: user.id,
      email: user.email,
      last_sign_in: user.last_sign_in_at
    }))
  }
})