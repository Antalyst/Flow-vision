let listenersAttached = false

/** Single source of truth for scene perf/motion flags — shared (useState) so every
 * FlowVisionScene instance and the scroll-story section agree, and so only one pair of
 * matchMedia listeners ever exists no matter how many components call this. */
export function useScenePreferences() {
  const prefersReducedMotion = useState<boolean>('scene:reduced-motion', () => false)
  const isLowPower = useState<boolean>('scene:low-power', () => false)

  onMounted(() => {
    if (listenersAttached) return
    listenersAttached = true

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const widthQuery = window.matchMedia('(max-width: 768px)')

    prefersReducedMotion.value = motionQuery.matches
    isLowPower.value = widthQuery.matches

    motionQuery.addEventListener('change', (e) => {
      prefersReducedMotion.value = e.matches
    })
    widthQuery.addEventListener('change', (e) => {
      isLowPower.value = e.matches
    })
  })

  return { prefersReducedMotion, isLowPower }
}
