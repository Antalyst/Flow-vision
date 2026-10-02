import { useAuthStore } from '~/stores/auth'

// Role → canonical home dashboard
const ROLE_HOME: Record<string, string> = {
  client: '/client/dashboard',
  employee: '/employee/dashboard',
  employee_sub_user: '/staff/dashboard',
  messenger: '/messenger/dashboard',
  superadmin: '/superadmin/dashboard',
}

// Role → protected URL zone prefix it exclusively owns
const ROLE_ZONE: Record<string, string> = {
  client: '/client',
  employee: '/employee',
  employee_sub_user: '/staff',
  messenger: '/messenger',
  superadmin: '/superadmin',
}

const ALL_ZONES = Object.values(ROLE_ZONE)

// Navigation only — every API route enforces access on the server regardless.
// Identity comes from the server session via the auth store (plugins/auth.ts),
// never from a cookie the page can read or edit.
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  if (!auth.loaded) await auth.fetchMe()

  const hasSession = Boolean(auth.user)
  const role = String(auth.user?.role ?? '').toLowerCase().trim()

  const homeRoute = ROLE_HOME[role] ?? '/'
  const ownZone = ROLE_ZONE[role] ?? null
  const hittingProtected = ALL_ZONES.some((z) => to.path.startsWith(z))

  // 1. Logged-in user at the public root → send to their dashboard
  if (hasSession && to.path === '/') {
    return navigateTo(homeRoute)
  }

  // 2. Unauthenticated visitor hitting any protected zone → back to login
  if (!hasSession && hittingProtected) {
    return navigateTo('/')
  }

  // 3. Authenticated user accessing a zone that doesn't belong to their role
  //    e.g. an employee trying to reach /client/* → hard redirect to own home
  if (hasSession && hittingProtected && ownZone) {
    if (!to.path.startsWith(ownZone)) {
      return navigateTo(homeRoute)
    }
  }

  // 4. Bare zone index (e.g. /client with no sub-path) → forward to dashboard
  if (hasSession) {
    for (const [r, zone] of Object.entries(ROLE_ZONE)) {
      if (to.path === zone) {
        return navigateTo(ROLE_HOME[r])
      }
    }
  }
})
