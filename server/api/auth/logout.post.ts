export default defineEventHandler((event) => {
  deleteCookie(event, 'auth_token');
  deleteCookie(event, 'auth_user');

  return {
    success: true,
    message: 'Logged out successfully'
  }
})