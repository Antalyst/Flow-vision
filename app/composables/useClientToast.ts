import { reactive } from 'vue'

export type ClientToastType = 'success' | 'warning' | 'error'

const toast = reactive({
  visible: false,
  message: '',
  type: 'success' as ClientToastType,
})

let hideTimer: ReturnType<typeof setTimeout> | null = null

export function useClientToast() {
  function show(message: string, type: ClientToastType = 'success', durationMs = 4000) {
    toast.message = message
    toast.type = type
    toast.visible = true
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => { toast.visible = false }, durationMs)
  }

  function dismiss() {
    toast.visible = false
    if (hideTimer) clearTimeout(hideTimer)
  }

  return { toast, show, dismiss }
}
