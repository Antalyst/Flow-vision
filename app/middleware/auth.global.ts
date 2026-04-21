export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();

  if (to.path.startsWith('/client')) {
    if (!auth.isLoggedIn) {
      return navigateTo('/');
    }
  }
});