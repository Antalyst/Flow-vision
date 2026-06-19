export function useAuthModals() {
  const loginModal = useState<boolean>('fv:login-modal', () => false)
  const registerModal = useState<boolean>('fv:register-modal', () => false)

  function openLogin() {
    registerModal.value = false
    loginModal.value = true
  }

  function openRegister() {
    loginModal.value = false
    registerModal.value = true
  }

  function closeModals() {
    loginModal.value = false
    registerModal.value = false
  }

  return { loginModal, registerModal, openLogin, openRegister, closeModals }
}
