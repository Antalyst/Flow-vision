import { reactive } from 'vue'

export type StaffToastType = 'success' | 'warning' | 'error'

interface ToastState {
  visible: boolean
  message: string
  type: StaffToastType
}

const toast = reactive<ToastState>({
  visible: false,
  message: '',
  type: 'success',
})

let hideTimer: ReturnType<typeof setTimeout> | null = null

export function useStaffToast() {
  function show(message: string, type: StaffToastType = 'success', durationMs = 4000) {
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
