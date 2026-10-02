/**
 * POST /api/auth/logout
 * Revokes the server-side session (the token stops working immediately) and clears the cookie.
 */
export default defineEventHandler(async (event) => {
  await revokeCurrentSession(event)

  return {
    success: true,
    message: 'Logged out successfully'
  }
})
