import { computed, inject, onMounted, provide, ref, type InjectionKey, type Ref } from 'vue'

const DASHBOARD_ENTRANCE_KEY: InjectionKey<Ref<boolean>> = Symbol('dashboardEntrance')

/** Call once in the client dashboard layout to orchestrate mount entrance. */
export function provideDashboardEntrance() {
  const isEntranceVisible = ref(false)

  onMounted(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isEntranceVisible.value = true
      })
    })
  })

  provide(DASHBOARD_ENTRANCE_KEY, isEntranceVisible)

  const entranceVisibleClass = computed(() =>
    isEntranceVisible.value ? 'fv-enter-visible' : ''
  )

  return { isEntranceVisible, entranceVisibleClass }
}

/** Consume the layout entrance signal and build stagger class / delay helpers. */
export function useDashboardEntrance() {
  const isEntranceVisible = inject(DASHBOARD_ENTRANCE_KEY, ref(false))

  const entranceVisibleClass = computed(() =>
    isEntranceVisible.value ? 'fv-enter-visible' : ''
  )

  const entranceClasses = (...layers: Array<'sidebar' | 'header' | 'main' | 'card'>) =>
    computed(() =>
      layers
        .map((layer) => `fv-enter-${layer}`)
        .concat(isEntranceVisible.value ? 'fv-enter-visible' : '')
        .join(' ')
    )

  /** Step 4 card stagger — base 300 ms + index offset. */
  const cardEnterDelay = (index = 0, stepMs = 75) => ({
    transitionDelay: `${300 + index * stepMs}ms`,
  })

  return {
    isEntranceVisible,
    entranceVisibleClass,
    entranceClasses,
    cardEnterDelay,
  }
}
