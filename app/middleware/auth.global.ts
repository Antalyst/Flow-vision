export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  if (!auth.isLoggedIn && to.path.startsWith('/client')) {
    if (to.path === '/') {
      return;
    }
    return navigateTo('/');
  }
});