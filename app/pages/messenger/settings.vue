<template>
  <div class="space-y-6 pb-24 md:pb-8">
    <div>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:gear-six-fill" class="h-4 w-4 text-candy-orange" />
        <span>Messenger Portal</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">Settings</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
        Messenger Settings
      </h1>
      <p class="mt-1 text-sm" :class="mutedClass">
        Configure alerts, scanner hardware, and on-device cache for your delivery workflow.
      </p>
    </div>

    <div v-if="!settingsReady" class="dashboard-card p-8 text-center text-sm" :class="mutedClass">
      Loading your saved preferences…
    </div>

    <template v-else>
      <!-- Notifications -->
      <section class="dashboard-card p-6" :class="surfaceClass">
        <div class="mb-5 flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-candy-orange/10">
            <Icon name="ph:bell-ringing-fill" class="h-5 w-5 text-candy-orange" />
          </span>
          <div>
            <h2 class="text-sm font-bold" :class="headingClass">Notification Preferences</h2>
            <p class="text-xs" :class="mutedClass">Controls apply to this device and messenger account.</p>
          </div>
        </div>

        <div class="space-y-4">
          <SettingToggleRow
            label="Sound Alerts on New Pickups"
            description="Play a short tone when a new unclaimed pickup appears in your queue."
            :checked="soundAlertsOnPickup"
            :disabled="savingSound"
            @update:checked="onSoundToggle"
          />
          <SettingToggleRow
            label="Push Broadcast Notifications"
            description="Automatically poll for new org-wide pickup broadcasts while the portal is open."
            :checked="pushBroadcastNotifications"
            :disabled="savingPush"
            @update:checked="onPushToggle"
          />
        </div>
      </section>

      <!-- Camera -->
      <section class="dashboard-card p-6" :class="surfaceClass">
        <div class="mb-5 flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-candy-orange/10">
            <Icon name="ph:camera-fill" class="h-5 w-5 text-candy-orange" />
          </span>
          <div>
            <h2 class="text-sm font-bold" :class="headingClass">Camera &amp; Scanner Hardware</h2>
            <p class="text-xs" :class="mutedClass">Choose the default lens used by the QR scanner.</p>
          </div>
        </div>

        <div
          v-if="cameraError"
          class="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400"
        >
          {{ cameraError }}
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label class="flex-1">
            <span class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedClass">
              Default Camera Device
            </span>
            <select
              v-model="selectedCameraId"
              class="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:border-candy-orange focus:ring-2 focus:ring-candy-orange/25"
              :class="inputClass"
              :disabled="loadingCameras || savingCamera"
              @change="onCameraChange"
            >
              <option v-if="loadingCameras" value="">Detecting cameras…</option>
              <option
                v-for="device in cameraDevices"
                :key="device.deviceId"
                :value="device.deviceId"
              >
                {{ device.label }}
                <template v-if="device.facingHint !== 'unknown'">
                  ({{ device.facingHint === 'rear' ? 'Rear' : 'Front' }})
                </template>
              </option>
            </select>
          </label>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:border-candy-orange hover:text-candy-orange disabled:opacity-50"
            :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
            :disabled="loadingCameras"
            @click="loadCameras"
          >
            <Icon name="ph:arrows-clockwise" class="h-4 w-4" :class="loadingCameras ? 'animate-spin' : ''" />
            Refresh Devices
          </button>
        </div>
      </section>

      <!-- Cache -->
      <section class="dashboard-card p-6" :class="surfaceClass">
        <div class="mb-5 flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-candy-orange/10">
            <Icon name="ph:database-fill" class="h-5 w-5 text-candy-orange" />
          </span>
          <div>
            <h2 class="text-sm font-bold" :class="headingClass">Local Cache &amp; Data Storage</h2>
            <p class="text-xs" :class="mutedClass">
              Clears synchronized notification memory and offline route cache on this device.
            </p>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-3 text-sm font-bold text-white-pure transition hover:bg-opacity-90 disabled:opacity-50"
          :disabled="clearingCache"
          @click="onClearCache"
        >
          <Icon v-if="clearingCache" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
          <Icon v-else name="ph:broom-fill" class="h-4 w-4" />
          Clear Synchronized Cache
        </button>
      </section>
    </template>

  </div>

  <Teleport to="body">
    <Transition name="toast-fade">
      <div
        v-if="toast.visible"
        class="fixed bottom-24 left-1/2 z-[100] flex max-w-sm -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl md:bottom-8"
        :class="toastClass"
        role="status"
      >
        <Icon :name="toastIcon" class="h-5 w-5 flex-shrink-0" />
        <span>{{ toast.message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import SettingToggleRow from '~/components/messenger/SettingToggleRow.vue'
import type { CameraDeviceOption } from '~/composables/useMessengerSettings'

definePageMeta({ layout: 'messenger' })

const { isDark } = useTheme()
const {
  ready: settingsReady,
  soundAlertsOnPickup,
  pushBroadcastNotifications,
  defaultCameraDeviceId,
  setSoundAlertsOnPickup,
  setPushBroadcastNotifications,
  setDefaultCameraDeviceId,
  enumerateCameraDevices,
  clearSynchronizedCache,
  hydrate,
} = useMessengerSettings()
const { toast, show: showToast } = useMessengerToast()

const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))
const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const surfaceClass = computed(() => (isDark.value ? 'bg-onyx-black' : 'bg-white-pure'))
const inputClass = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-card text-white-pure'
    : 'border-zinc-200 bg-white text-onyx-black',
)

const savingSound = ref(false)
const savingPush = ref(false)
const savingCamera = ref(false)
const clearingCache = ref(false)
const loadingCameras = ref(false)
const cameraError = ref<string | null>(null)
const cameraDevices = ref<CameraDeviceOption[]>([])
const selectedCameraId = ref('')

const toastClass = computed(() => {
  switch (toast.type) {
    case 'warning':
      return 'border-amber-500/40 bg-amber-950 text-amber-200'
    case 'error':
      return 'border-red-500/40 bg-red-950 text-red-200'
    default:
      return isDark.value
        ? 'border-emerald-500/30 bg-onyx-card text-emerald-300'
        : 'border-emerald-200 bg-white text-emerald-700'
  }
})

const toastIcon = computed(() => {
  switch (toast.type) {
    case 'warning': return 'ph:warning-fill'
    case 'error': return 'ph:x-circle-fill'
    default: return 'ph:check-circle-fill'
  }
})

async function onSoundToggle(enabled: boolean) {
  savingSound.value = true
  try {
    await setSoundAlertsOnPickup(enabled)
    showToast(enabled ? 'Sound alerts enabled.' : 'Sound alerts disabled.')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save sound preference.'
    showToast(message, 'error')
  } finally {
    savingSound.value = false
  }
}

async function onPushToggle(enabled: boolean) {
  savingPush.value = true
  try {
    await setPushBroadcastNotifications(enabled)
    showToast(enabled ? 'Broadcast polling enabled.' : 'Broadcast polling paused.')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save notification preference.'
    showToast(message, 'error')
  } finally {
    savingPush.value = false
  }
}

async function loadCameras() {
  loadingCameras.value = true
  cameraError.value = null
  try {
    cameraDevices.value = await enumerateCameraDevices()
    if (!cameraDevices.value.some((d) => d.deviceId === selectedCameraId.value)) {
      selectedCameraId.value = defaultCameraDeviceId.value || cameraDevices.value[0]?.deviceId || 'environment'
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not enumerate camera devices.'
    cameraError.value = message
    showToast(message, 'warning')
  } finally {
    loadingCameras.value = false
  }
}

async function onCameraChange() {
  if (!selectedCameraId.value) return
  savingCamera.value = true
  try {
    await setDefaultCameraDeviceId(selectedCameraId.value)
    showToast('Default camera updated for QR scanning.')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save camera preference.'
    showToast(message, 'error')
    selectedCameraId.value = defaultCameraDeviceId.value
  } finally {
    savingCamera.value = false
  }
}

async function onClearCache() {
  clearingCache.value = true
  try {
    const { clearedKeys } = clearSynchronizedCache()
    const { fetchNotifications } = useMessengerNotifications()
    await fetchNotifications(true)
    showToast(
      clearedKeys > 0
        ? `Cache cleared (${clearedKeys} offline ${clearedKeys === 1 ? 'entry' : 'entries'} removed).`
        : 'Synchronized cache cleared successfully.',
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to clear cache.'
    showToast(message, 'error')
  } finally {
    clearingCache.value = false
  }
}

onMounted(async () => {
  hydrate()
  selectedCameraId.value = defaultCameraDeviceId.value
  await loadCameras()
})

watch(defaultCameraDeviceId, (id) => {
  if (id) selectedCameraId.value = id
})
</script>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
