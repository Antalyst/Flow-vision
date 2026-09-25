import { reactive } from 'vue'

export type SuperadminToastType = 'success' | 'warning' | 'error'

interface ToastState {
  visible: boolean
  message: string
  type: SuperadminToastType
}

const toast = reactive<ToastState>({
  visible: false,
  message: '',
  type: 'success',
})

let hideTimer: ReturnType<typeof setTimeout> | null = null

export function useSuperadminToast() {
  function show(message: string, type: SuperadminToastType = 'success', durationMs = 4000) {
    toast.message = message
    toast.type = type
    toast.visible = true

    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      toast.visible = false
    }, durationMs)
  }

  function dismiss() {
    toast.visible = false
    if (hideTimer) clearTimeout(hideTimer)
  }

  return { toast, show, dismiss }
}
