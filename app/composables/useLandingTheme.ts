/**
 * Landing/marketing surface theme — dark-only by design (FlowVision flow-* tokens).
 * `isLandingDark` stays exported (always true, no toggle) so existing `isLandingDark ? a : b`
 * branches across app/components/landing/features/* keep working as those files get migrated
 * to flow-* tokens one at a time — the light-mode branch is unreachable dead code at that point
 * and gets removed as part of that per-component pass, not here.
 */
export function useLandingTheme() {
  const isLandingDark = ref(true)

  const navCapsuleClass = computed(() => 'bg-flow-void/70 backdrop-blur-md border border-flow-muted/15 shadow-md')

  return {
    isLandingDark,
    navCapsuleClass,
  }
}
