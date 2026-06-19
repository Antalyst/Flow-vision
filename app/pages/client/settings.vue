<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <header>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:gear-six-fill" class="h-4 w-4 text-candy-orange" />
        <span>Support</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="headingClass">Settings</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">Account Settings</h1>
      <p class="mt-1 text-sm" :class="mutedClass">Display layers, notification controls, and session management.</p>
    </header>

    <div v-if="!settingsReady" class="rounded-lg border p-8 text-center text-sm" :class="[panelClass, mutedClass]">
      Loading preferences…
    </div>

    <template v-else>
      <section class="rounded-lg border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Display Layer</h2>
        <p class="mt-1 text-xs" :class="mutedClass">Switch between light and dark interface surfaces.</p>
        <div class="mt-4 flex items-center justify-between gap-4 rounded-lg border px-4 py-4" :class="innerPanelClass">
          <div>
            <p class="text-sm font-semibold" :class="headingClass">{{ isDark ? 'Dark Mode' : 'Light Mode' }}</p>
            <p class="text-xs" :class="mutedClass">Flat onyx and white surfaces — no ambient effects.</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="isDark"
            class="relative h-8 w-14 rounded-full transition"
            :class="isDark ? 'bg-candy-orange' : 'bg-gray-300'"
            @click="toggleTheme"
          >
            <span class="absolute top-1 h-6 w-6 rounded-full bg-white-pure transition" :class="isDark ? 'left-7' : 'left-1'" />
          </button>
        </div>
      </section>

      <section class="rounded-lg border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Notification Preferences</h2>
        <div class="mt-4 space-y-3">
          <SettingToggleRow
            label="Document Status Alerts"
            description="Receive in-app alerts when your documents change tracking state."
            :checked="documentStatusAlerts"
            :disabled="savingDoc"
            @update:checked="onDocAlerts"
          />
          <SettingToggleRow
            label="Operational Report Broadcasts"
            description="Alert when employees or messengers submit new operational summaries."
            :checked="operationalReportAlerts"
            :disabled="savingReport"
            @update:checked="onReportAlerts"
          />
          <SettingToggleRow
            label="Sound Alerts"
            description="Play a short tone when new client notifications arrive."
            :checked="soundAlerts"
            :disabled="savingSound"
            @update:checked="onSoundAlerts"
          />
        </div>
      </section>

      <section class="rounded-lg border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Account</h2>
        <p class="mt-1 text-xs" :class="mutedClass">
          Signed in as <span class="font-medium" :class="headingClass">{{ auth.user?.email }}</span>
        </p>
        <button
          type="button"
          class="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-500/5 dark:text-red-400"
          :class="innerPanelClass"
          :disabled="isLoggingOut"
          @click="handleLogout"
        >
          <Icon v-if="isLoggingOut" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
          <Icon v-else name="ph:sign-out" class="h-4 w-4" />
          Log out
        </button>
      </section>
    </template>

    <Teleport to="body">
      <Transition name="toast-fade">
        <div v-if="toast.visible" class="fixed bottom-24 left-1/2 z-[100] max-w-sm -translate-x-1/2 rounded-lg border px-4 py-3 text-sm font-semibold md:bottom-8" :class="toastClass">
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import SettingToggleRow from '~/components/messenger/SettingToggleRow.vue'
import { useClientSettings } from '~/composables/useClientSettings'
import { useClientToast } from '~/composables/useClientToast'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const { isDark, toggleTheme } = useTheme()
const {
  ready: settingsReady,
  documentStatusAlerts,
  operationalReportAlerts,
  soundAlerts,
  setDocumentStatusAlerts,
  setOperationalReportAlerts,
  setSoundAlerts,
  hydrate,
} = useClientSettings()
const { toast, show: showToast } = useClientToast()

const savingDoc = ref(false)
const savingReport = ref(false)
const savingSound = ref(false)
const isLoggingOut = ref(false)

const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white'))
const innerPanelClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-zinc-200 bg-white-surface'))
const toastClass = computed(() => toast.type === 'error'
  ? 'border-red-500/40 text-red-300 bg-onyx-card'
  : 'border-emerald-500/30 text-emerald-300 bg-onyx-card dark:bg-onyx-card')

async function onDocAlerts(v: boolean) {
  savingDoc.value = true
  try {
    await setDocumentStatusAlerts(v)
    showToast(v ? 'Document alerts enabled.' : 'Document alerts muted.')
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Failed to save preference.', 'error')
  } finally { savingDoc.value = false }
}

async function onReportAlerts(v: boolean) {
  savingReport.value = true
  try {
    await setOperationalReportAlerts(v)
    showToast(v ? 'Report broadcasts enabled.' : 'Report broadcasts muted.')
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Failed to save preference.', 'error')
  } finally { savingReport.value = false }
}

async function onSoundAlerts(v: boolean) {
  savingSound.value = true
  try {
    await setSoundAlerts(v)
    showToast(v ? 'Sound alerts enabled.' : 'Sound alerts muted.')
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Failed to save preference.', 'error')
  } finally { savingSound.value = false }
}

async function handleLogout() {
  isLoggingOut.value = true
  try { await auth.logout() } finally { isLoggingOut.value = false }
}

onMounted(() => hydrate())
</script>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.2s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; }
</style>
