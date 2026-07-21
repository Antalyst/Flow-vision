import { computed, ref, watch } from 'vue'

export interface ClientSettingsState {
  documentStatusAlerts: boolean
  operationalReportAlerts: boolean
  soundAlerts: boolean
}

const DEFAULTS: ClientSettingsState = {
  documentStatusAlerts: true,
  operationalReportAlerts: true,
  soundAlerts: true,
}

const STORAGE_PREFIX = 'flowvision:client-settings:'

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

function readStored(userId: string): ClientSettingsState {
  if (!import.meta.client || !userId) return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<ClientSettingsState>
    return {
      documentStatusAlerts: parsed.documentStatusAlerts ?? DEFAULTS.documentStatusAlerts,
      operationalReportAlerts: parsed.operationalReportAlerts ?? DEFAULTS.operationalReportAlerts,
      soundAlerts: parsed.soundAlerts ?? DEFAULTS.soundAlerts,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeStored(userId: string, value: ClientSettingsState) {
  if (!import.meta.client || !userId) return
  localStorage.setItem(storageKey(userId), JSON.stringify(value))
}

const settingsState = ref<ClientSettingsState>({ ...DEFAULTS })
const hydratedUserId = ref<string | null>(null)
const ready = ref(false)

export function useClientSettings() {
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

  async function persist(patch: Partial<ClientSettingsState>) {
    const id = userId.value
    if (!id) throw new Error('Sign in to save client settings.')
    const previous = readStored(id)
    try {
      settingsState.value = { ...settingsState.value, ...patch }
      writeStored(id, settingsState.value)
      return settingsState.value
    } catch (err) {
      settingsState.value = previous
      throw err
    }
  }

  return {
    ready: computed(() => ready.value),
    documentStatusAlerts: computed(() => settingsState.value.documentStatusAlerts),
    operationalReportAlerts: computed(() => settingsState.value.operationalReportAlerts),
    soundAlerts: computed(() => settingsState.value.soundAlerts),
    setDocumentStatusAlerts: (v: boolean) => persist({ documentStatusAlerts: v }),
    setOperationalReportAlerts: (v: boolean) => persist({ operationalReportAlerts: v }),
    setSoundAlerts: (v: boolean) => persist({ soundAlerts: v }),
    hydrate,
  }
}

export function playClientAlertSound() {
  const { soundAlerts } = useClientSettings()
  if (!import.meta.client || !soundAlerts.value) return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 620
    gain.gain.value = 0.07
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.14)
    osc.onended = () => void ctx.close()
  } catch { /* ignore */ }
}
