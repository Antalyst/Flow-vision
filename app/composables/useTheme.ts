import { ref, watch } from 'vue'

const isDark = ref(false)

export function useTheme() {
  const initTheme = () => {
    if (import.meta.client) {
      const stored = localStorage.getItem('flowvision-theme')
      if (stored) {
        isDark.value = stored === 'dark'
      } else {
        isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      applyTheme()
    }
  }

  const applyTheme = () => {
    if (import.meta.client) {
      const root = document.documentElement
      if (isDark.value) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  const toggleTheme = () => {
    isDark.value = !isDark.value
    if (import.meta.client) {
      localStorage.setItem('flowvision-theme', isDark.value ? 'dark' : 'light')
    }
    applyTheme()
  }

  watch(isDark, () => {
    applyTheme()
  })

  return {
    isDark,
    toggleTheme,
    initTheme,
  }
}
