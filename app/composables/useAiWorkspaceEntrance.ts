import { computed, onMounted, ref } from 'vue'

/** One-shot mount entrance orchestration for /client/ai workspace. */
export function useAiWorkspaceEntrance() {
  const isEntranceVisible = ref(false)

  onMounted(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isEntranceVisible.value = true
      })
    })
  })

  const enterClass = computed(() => (isEntranceVisible.value ? 'fv-ai-enter-visible' : ''))

  /** Cascading delay for nested stagger items (ms). */
  const staggerDelay = (index = 0, baseMs = 350, stepMs = 65) => ({
    transitionDelay: `${baseMs + index * stepMs}ms`,
  })

  return { isEntranceVisible, enterClass, staggerDelay }
}
