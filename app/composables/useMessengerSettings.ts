import { computed, ref, watch } from 'vue'

export interface MessengerSettingsState {
  soundAlertsOnPickup: boolean
  pushBroadcastNotifications: boolean
  defaultCameraDeviceId: string
}

const DEFAULTS: MessengerSettingsState = {
  soundAlertsOnPickup: true,
  pushBroadcastNotifications: true,
  defaultCameraDeviceId: 'environment',
}

const STORAGE_PREFIX = 'flowvision:messenger-settings:'
const CACHE_PREFIX = 'flowvision:messenger-cache:'

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

function readStored(userId: string): MessengerSettingsState {
  if (!import.meta.client || !userId) return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<MessengerSettingsState>
    return {
      soundAlertsOnPickup: parsed.soundAlertsOnPickup ?? DEFAULTS.soundAlertsOnPickup,
      pushBroadcastNotifications: parsed.pushBroadcastNotifications ?? DEFAULTS.pushBroadcastNotifications,
      defaultCameraDeviceId: parsed.defaultCameraDeviceId ?? DEFAULTS.defaultCameraDeviceId,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeStored(userId: string, value: MessengerSettingsState) {
  if (!import.meta.client || !userId) return
  localStorage.setItem(storageKey(userId), JSON.stringify(value))
}

const settingsState = ref<MessengerSettingsState>({ ...DEFAULTS })
const hydratedUserId = ref<string | null>(null)
const ready = ref(false)

export interface CameraDeviceOption {
  deviceId: string
  label: string
  facingHint: 'front' | 'rear' | 'unknown'
}

function inferFacing(label: string): 'front' | 'rear' | 'unknown' {
  const lower = label.toLowerCase()
  if (/front|user|selfie|face/.test(lower)) return 'front'
  if (/back|rear|environment|main/.test(lower)) return 'rear'
  return 'unknown'
}

/**
 * Best-effort robust rear-camera lookup for the QR scanner (see Step 3 of the
 * camera diagnostic): `facingMode: { ideal: 'environment' }` is only a hint —
 * some browsers/devices silently grant whatever camera they want. This scans
 * device *labels* (only available after a getUserMedia permission prompt has
 * already been granted at least once) for a rear/back/environment match and
 * returns its deviceId so the caller can request that exact device instead of
 * trusting the facingMode hint alone. Returns null if no such device is found
 * (e.g. labels are still blank, or the device genuinely only has one camera) —
 * callers should fall back to the plain facingMode hint in that case.
 */
export async function findRearCameraDeviceId(): Promise<string | null> {
  if (!import.meta.client || !navigator.mediaDevices?.enumerateDevices) return null
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const rear = devices.find((d) => d.kind === 'videoinput' && inferFacing(d.label || '') === 'rear')
    return rear?.deviceId || null
  } catch {
    return null
  }
}

export function useMessengerSettings() {
  const auth = useAuthStore()
  const sessionCookie = useCookie<string | null>('user_session')

  const userId = computed(() => String(auth.user?.user_id ?? sessionCookie.value ?? ''))

  function hydrate() {
    const id = userId.value
    if (!id) {
      ready.value = false
      return
    }
    if (hydratedUserId.value === id && ready.value) return
    settingsState.value = readStored(id)
    hydratedUserId.value = id
    ready.value = true
  }

  if (import.meta.client) {
    hydrate()
    watch(userId, () => hydrate(), { immediate: true })
  }

  async function persist(patch: Partial<MessengerSettingsState>) {
    const id = userId.value
    if (!id) throw new Error('Sign in to save messenger settings.')

    try {
      settingsState.value = { ...settingsState.value, ...patch }
      writeStored(id, settingsState.value)
      return settingsState.value
    } catch (err) {
      settingsState.value = readStored(id)
      throw err
    }
  }

  async function setSoundAlertsOnPickup(enabled: boolean) {
    return persist({ soundAlertsOnPickup: enabled })
  }

  async function setPushBroadcastNotifications(enabled: boolean) {
    const result = await persist({ pushBroadcastNotifications: enabled })
    const { stopAutoRefresh, startAutoRefresh } = useMessengerNotifications()
    if (enabled) {
      startAutoRefresh(15000)
    } else {
      stopAutoRefresh()
    }
    return result
  }

  async function setDefaultCameraDeviceId(deviceId: string) {
    return persist({ defaultCameraDeviceId: deviceId })
  }

  async function enumerateCameraDevices(): Promise<CameraDeviceOption[]> {
    if (!import.meta.client || !navigator.mediaDevices?.enumerateDevices) {
      throw new Error('Camera enumeration is not supported in this browser.')
    }

    let hasPermission = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
      hasPermission = true
    } catch (err: unknown) {
      console.warn('getUserMedia failed or permission denied:', err)
      // We don't throw immediately. We still attempt enumerateDevices() 
      // to return empty-label devices or the default fallback list.
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoInputs = devices.filter((d) => d.kind === 'videoinput')

    if (videoInputs.length === 0) {
      return [
        { deviceId: 'environment', label: 'Rear Camera (environment)', facingHint: 'rear' },
        { deviceId: 'user', label: 'Front Camera (user)', facingHint: 'front' },
      ]
    }

    return videoInputs.map((device, index) => ({
      deviceId: device.deviceId || (index === 0 ? 'environment' : `camera-${index}`),
      label: device.label?.trim() || `Camera ${index + 1} (Permission Required)`,
      facingHint: inferFacing(device.label || ''),
    }))
  }

  function clearSynchronizedCache() {
    if (!import.meta.client) return { clearedKeys: 0 }

    const stateKeys = [
      'messenger:notifications',
      'messenger:notifications-loading',
      'messenger:notifications-error',
      'messenger:notifications-claiming',
      'messenger:notifications-fetched-at',
    ] as const

    for (const key of stateKeys) {
      const state = useState(key)
      if (key === 'messenger:notifications') state.value = []
      else if (key === 'messenger:notifications-loading') state.value = false
      else if (key === 'messenger:notifications-error') state.value = null
      else if (key === 'messenger:notifications-claiming') state.value = null
      else if (key === 'messenger:notifications-fetched-at') state.value = null
    }

    let clearedKeys = 0
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
        clearedKeys++
      }
    }

    return { clearedKeys }
  }

  function playPickupSound() {
    if (!import.meta.client || !settingsState.value.soundAlertsOnPickup) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.value = 0.08
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
      osc.onended = () => void ctx.close()
    } catch {
      // Audio not available — ignore
    }
  }

  return {
    ready: computed(() => ready.value),
    soundAlertsOnPickup: computed(() => settingsState.value.soundAlertsOnPickup),
    pushBroadcastNotifications: computed(() => settingsState.value.pushBroadcastNotifications),
    defaultCameraDeviceId: computed(() => settingsState.value.defaultCameraDeviceId),
    setSoundAlertsOnPickup,
    setPushBroadcastNotifications,
    setDefaultCameraDeviceId,
    enumerateCameraDevices,
    clearSynchronizedCache,
    playPickupSound,
    hydrate,
  }
}

export function resolveCameraConstraint(deviceId: string): MediaTrackConstraints | { facingMode: string } {
  if (!deviceId || deviceId === 'environment') return { facingMode: 'environment' }
  if (deviceId === 'user') return { facingMode: 'user' }
  return { deviceId: { exact: deviceId } }
}
