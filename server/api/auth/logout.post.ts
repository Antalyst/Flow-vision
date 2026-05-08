export default defineEventHandler(async (event) => {
  deleteCookie(event, 'user_session')
  deleteCookie(event, 'user_role')

  return {
    success: true,
    message: 'Logged out successfully'
  }
})