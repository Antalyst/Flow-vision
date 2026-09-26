export const MARKETING_ROUTES = [
  '/',
  '/features',
  '/tracking',
  '/pricing',
  '/about',
  '/contact',
] as const

/** True for homepage and marketing sub-pages that share the landing shell. */
export function useMarketingPage() {
  const route = useRoute()
  const isMarketingPage = computed(() => {
    const path = route.path.length > 1 ? route.path.replace(/\/+$/, '') : route.path
    return (MARKETING_ROUTES as readonly string[]).includes(path)
  })
  return { isMarketingPage }
}
