/**
 * Runs before every server route.
 *
 * 1. Deletes the old forgeable identity cookies (user_session, user_role,
 *    auth_user, auth_token) — they are never trusted.
 * 2. CSRF guard: a state-changing /api request whose Origin (or Referer) is a
 *    different site is rejected. Browsers always send Origin on cross-site
 *    requests; same-site pages, the Android app (it loads this same site) and
 *    non-browser callers without an Origin are unaffected. SameSite=Lax on the
 *    session cookie is the second layer.
 * 3. Resolves the fv_session cookie to a verified identity in
 *    event.context.auth (see server/utils/session.ts).
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const STATIC_PATH = /^\/(_nuxt|__nuxt|_ipx)\/|\.(ico|png|jpe?g|svg|webp|gif|js|mjs|css|map|txt|webmanifest|woff2?)$/i

function assertSameOrigin(event: Parameters<typeof getRequestHost>[0]) {
  const source = getRequestHeader(event, 'origin') || getRequestHeader(event, 'referer')
  if (!source) return
  let sourceHost: string
  try {
    sourceHost = new URL(source).host
  } catch {
    throw createError({ statusCode: 403, statusMessage: 'Request blocked.' })
  }
  if (sourceHost !== getRequestHost(event, { xForwardedHost: true })) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request blocked.' })
  }
}

export default defineEventHandler(async (event) => {
  const path = (event.path || '').split('?')[0] ?? ''
  if (STATIC_PATH.test(path)) return

  clearLegacyCookies(event)

  if (!path.startsWith('/api/')) return

  if (!SAFE_METHODS.has(event.method)) assertSameOrigin(event)

  event.context.auth = await resolveSession(event)
})
