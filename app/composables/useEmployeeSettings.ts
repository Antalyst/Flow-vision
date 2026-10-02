import { computed, ref, watch } from 'vue'

export type PipelineView = 'LOCAL' | 'GLOBAL'
export type AutoRefreshMode = 'realtime' | '30s' | '60s'

export interface EmployeeSettingsState {
  flaggedDocumentAlerts: boolean
  incomingHandoffBroadcasts: boolean
  defaultPipelineView: PipelineView
  autoRefreshMode: AutoRefreshMode
}

export const AUTO_REFRESH_OPTIONS: Array<{ value: AutoRefreshMode; label: string; intervalMs: number }> = [
  { value: 'realtime', label: 'Real-time (10s poll)', intervalMs: 10_000 },
  { value: '30s', label: '30 second poll', intervalMs: 30_000 },
  { value: '60s', label: '1 minute poll', intervalMs: 60_000 },
]

const DEFAULTS: EmployeeSettingsState = {
  flaggedDocumentAlerts: true,
  incomingHandoffBroadcasts: true,
  defaultPipelineView: 'LOCAL',
  autoRefreshMode: '30s',
}

const STORAGE_PREFIX = 'flowvision:employee-settings:'

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

function readStored(userId: string): EmployeeSettingsState {
  if (!import.meta.client || !userId) return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<EmployeeSettingsState>
    return {
      flaggedDocumentAlerts: parsed.flaggedDocumentAlerts ?? DEFAULTS.flaggedDocumentAlerts,
      incomingHandoffBroadcasts: parsed.incomingHandoffBroadcasts ?? DEFAULTS.incomingHandoffBroadcasts,
      defaultPipelineView: parsed.defaultPipelineView ?? DEFAULTS.defaultPipelineView,
      autoRefreshMode: parsed.autoRefreshMode ?? DEFAULTS.autoRefreshMode,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeStored(userId: string, value: EmployeeSettingsState) {
  if (!import.meta.client || !userId) return
  localStorage.setItem(storageKey(userId), JSON.stringify(value))
}

const settingsState = ref<EmployeeSettingsState>({ ...DEFAULTS })
const hydratedUserId = ref<string | null>(null)
const ready = ref(false)

function resolveIntervalMs(mode: AutoRefreshMode): number {
  return AUTO_REFRESH_OPTIONS.find((o) => o.value === mode)?.intervalMs ?? 30_000
}

function playAlertTone(frequency = 660) {
  if (!import.meta.client) return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
    osc.onended = () => void ctx.close()
  } catch {
    // Audio unavailable
  }
}

export function useEmployeeSettings() {
  const auth = useAuthStore()

  const userId = computed(() => String(auth.user?.user_id ?? ''))

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

  async function persist(patch: Partial<EmployeeSettingsState>) {
    const id = userId.value
    if (!id) throw new Error('Sign in to save employee settings.')

    const previous = readStored(id)
    try {
      settingsState.value = { ...settingsState.value, ...patch }
      writeStored(id, settingsState.value)
      applyHandoffPolling()
      return settingsState.value
    } catch (err) {
      settingsState.value = previous
      throw err
    }
  }

  function applyHandoffPolling() {
    if (!import.meta.client) return
    const { startAutoRefresh, stopAutoRefresh } = useEmployeeNotifications()
    if (settingsState.value.incomingHandoffBroadcasts) {
      startAutoRefresh(resolveIntervalMs(settingsState.value.autoRefreshMode))
    } else {
      stopAutoRefresh()
    }
  }

  async function setFlaggedDocumentAlerts(enabled: boolean) {
    return persist({ flaggedDocumentAlerts: enabled })
  }

  async function setIncomingHandoffBroadcasts(enabled: boolean) {
    return persist({ incomingHandoffBroadcasts: enabled })
  }

  async function setDefaultPipelineView(view: PipelineView) {
    return persist({ defaultPipelineView: view })
  }

  async function setAutoRefreshMode(mode: AutoRefreshMode) {
    const result = await persist({ autoRefreshMode: mode })
    applyHandoffPolling()
    return result
  }

  function playFlaggedAlertSound() {
    if (settingsState.value.flaggedDocumentAlerts) playAlertTone(520)
  }

  function playHandoffAlertSound() {
    if (settingsState.value.incomingHandoffBroadcasts) playAlertTone(740)
  }

  const workingBoardPollIntervalMs = computed(() =>
    resolveIntervalMs(settingsState.value.autoRefreshMode),
  )

  return {
    ready: computed(() => ready.value),
    flaggedDocumentAlerts: computed(() => settingsState.value.flaggedDocumentAlerts),
    incomingHandoffBroadcasts: computed(() => settingsState.value.incomingHandoffBroadcasts),
    defaultPipelineView: computed(() => settingsState.value.defaultPipelineView),
    autoRefreshMode: computed(() => settingsState.value.autoRefreshMode),
    workingBoardPollIntervalMs,
    setFlaggedDocumentAlerts,
    setIncomingHandoffBroadcasts,
    setDefaultPipelineView,
    setAutoRefreshMode,
    playFlaggedAlertSound,
    playHandoffAlertSound,
    applyHandoffPolling,
    hydrate,
  }
}
