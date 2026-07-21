/** Isolated landing-page theme — uses FlowVision onyx/candy design tokens. */
export function useLandingTheme() {
  const isLandingDark = useState<boolean>('landing:is-dark', () => true)

  function toggleLandingTheme() {
    isLandingDark.value = !isLandingDark.value
  }

  const atmosphereBaseClass = computed(() =>
    isLandingDark.value ? 'bg-onyx-black text-white-pure' : 'bg-white-surface text-zinc-900',
  )

  const featureCardClass = computed(() =>
    isLandingDark.value
      ? 'bg-onyx-card border border-onyx-border rounded-card shadow-card transition-shadow duration-300 hover:shadow-card-hover'
      : 'bg-white border border-zinc-200 rounded-card shadow-card transition-shadow duration-300 hover:shadow-card-hover',
  )

  const metricCardClass = computed(() => featureCardClass.value)

  const navCapsuleClass = computed(() =>
    isLandingDark.value
      ? 'bg-onyx-card border border-onyx-border shadow-md'
      : 'bg-white border border-zinc-200 shadow-md',
  )

  const imageWellClass = computed(() =>
    isLandingDark.value ? 'bg-onyx-black/60' : 'bg-zinc-100',
  )

  const pillBadgeClass = computed(() =>
    isLandingDark.value
      ? 'border border-onyx-border bg-onyx-black text-white-muted font-dashboard text-[10px]'
      : 'border border-zinc-200 bg-zinc-100 text-zinc-600 font-dashboard text-[10px]',
  )

  const pillBadgeDarkClass = computed(() =>
    'border border-onyx-border bg-onyx-black text-white-pure font-dashboard text-xs',
  )

  const nlqTagClass = computed(() =>
    isLandingDark.value
      ? 'bg-onyx-black border border-onyx-border text-white-pure font-dashboard text-[10px] font-bold uppercase tracking-wider'
      : 'bg-zinc-900 text-white-pure font-dashboard text-[10px] font-bold uppercase tracking-wider',
  )

  // Legacy aliases used elsewhere
  const surfaceClass = computed(() => atmosphereBaseClass.value)
  const glassPanelClass = computed(() => featureCardClass.value)
  const bentoSurfaceClass = computed(() => `${featureCardClass.value} p-6`)
  const glassWellClass = computed(() => imageWellClass.value)
  const glassNavClass = computed(() => navCapsuleClass.value)
  const glassChipClass = computed(() => pillBadgeClass.value)
  const cardClass = computed(() => featureCardClass.value)
  const mutedTextClass = computed(() =>
    isLandingDark.value ? 'text-white-muted' : 'text-zinc-500',
  )
  const bodyTextClass = computed(() =>
    isLandingDark.value ? 'text-white-muted font-dashboard' : 'text-zinc-600 font-dashboard',
  )
  const pillClass = computed(() => pillBadgeClass.value)
  const heroTitleClass = computed(() =>
    isLandingDark.value ? 'text-white-pure font-primary' : 'text-zinc-900 font-primary',
  )
  const heroSubtitleClass = computed(() =>
    isLandingDark.value ? 'text-candy-orange font-dashboard' : 'text-zinc-600 font-dashboard',
  )

  return {
    isLandingDark,
    toggleLandingTheme,
    atmosphereBaseClass,
    featureCardClass,
    metricCardClass,
    navCapsuleClass,
    imageWellClass,
    pillBadgeClass,
    pillBadgeDarkClass,
    nlqTagClass,
    surfaceClass,
    glassPanelClass,
    bentoSurfaceClass,
    glassWellClass,
    glassNavClass,
    glassChipClass,
    cardClass,
    mutedTextClass,
    bodyTextClass,
    pillClass,
    heroTitleClass,
    heroSubtitleClass,
  }
}
