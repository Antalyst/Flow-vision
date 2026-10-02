// Loads the signed-in user from the server session (/api/auth/me) once, before
// any route middleware runs. During SSR the request's HttpOnly session cookie
// is forwarded; the result is carried to the browser in the Pinia state.
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  if (!auth.loaded) await auth.fetchMe()
})
