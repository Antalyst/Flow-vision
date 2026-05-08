export default defineNuxtRouteMiddleware((to, from) => {
  const userSession = useCookie<string | null>('user_session', {
    path: '/'
  })
  const userRole = useCookie<string | null>('user_role', {
    path: '/'
  })
  const hasSession = Boolean(userSession.value)
  const isClient = (userRole.value || '').toLowerCase() === 'client'

  if (hasSession && to.path === '/') {
    return navigateTo(isClient ? '/client' : '/client/office')
  }

  if (!hasSession && to.path.startsWith('/client')) {
    return navigateTo('/')
  }

  if (hasSession && to.path === '/client' && !isClient) {
    return navigateTo('/client/office')
  }
})