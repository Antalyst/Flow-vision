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

    <div v-if="!settingsReady" class="rounded-none border p-8 text-center text-sm" :class="[panelClass, mutedClass]">
      Loading preferences…
    </div>

    <template v-else>
      <section class="rounded-none border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Display Layer</h2>
        <p class="mt-1 text-xs" :class="mutedClass">Switch between light and dark interface surfaces.</p>
        <div class="mt-4 flex items-center justify-between gap-4 rounded-none border px-4 py-4" :class="innerPanelClass">
          <div>
            <p class="text-sm font-semibold" :class="headingClass">{{ isDark ? 'Dark Mode' : 'Light Mode' }}</p>
            <p class="text-xs" :class="mutedClass">Flat onyx and white surfaces — no ambient effects.</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="isDark"
            class="relative h-8 w-14 rounded-none transition"
            :class="isDark ? 'bg-candy-orange' : 'bg-gray-300'"
            @click="toggleTheme"
          >
            <span class="absolute top-1 h-6 w-6 rounded-none bg-white-pure transition" :class="isDark ? 'left-7' : 'left-1'" />
          </button>
        </div>
      </section>

      <section class="rounded-none border p-6" :class="panelClass">
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

      <section class="rounded-none border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Organisation</h2>
        <p class="mt-1 text-xs" :class="mutedClass">Your current organisation ID and details.</p>
        
        <div class="mt-4 flex items-center justify-between gap-4 rounded-none border px-4 py-4" :class="innerPanelClass">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold truncate" :class="headingClass">{{ auth.currentOrg?.name || 'Loading...' }}</p>
            <p class="text-xs font-mono truncate mt-0.5" :class="mutedClass">Code: {{ auth.currentOrg?.code }}</p>
          </div>
          <button
            type="button"
            class="flex-shrink-0 inline-flex items-center gap-1.5 rounded-none border px-3 py-1.5 text-xs font-semibold transition hover:bg-candy-orange/10 hover:text-candy-orange hover:border-candy-orange/50 active:scale-[0.98]"
            :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
            @click="copyOrgCode"
          >
            <Icon :name="copiedOrg ? 'ph:check-bold' : 'ph:copy'" class="h-3.5 w-3.5" :class="copiedOrg ? 'text-emerald-500' : ''" />
            {{ copiedOrg ? 'Copied!' : 'Copy Code' }}
          </button>
        </div>
      </section>

      <section class="rounded-none border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Document Categories</h2>
        <p class="mt-1 text-xs" :class="mutedClass">Manage the categories available when uploading documents.</p>
        
        <div class="mt-4 flex flex-col gap-4">
          <form @submit.prevent="handleAddCategory" class="flex items-center gap-2">
            <input
              v-model="newCategoryName"
              type="text"
              placeholder="e.g. Invoice, Contract"
              class="flex-1 rounded-none border px-3 py-2 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
              :class="isDark ? 'border-white/10 bg-onyx-black text-white focus:bg-onyx-black' : 'border-gray-200 bg-white focus:bg-white'"
              :disabled="categoriesStore.loading"
            />
            <button
              type="submit"
              class="flex-shrink-0 inline-flex items-center gap-1.5 rounded-none border bg-candy-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-candy-orange/90 active:scale-[0.98] disabled:opacity-50"
              :disabled="categoriesStore.loading || !newCategoryName.trim()"
            >
              <Icon v-if="categoriesStore.loading" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
              <Icon v-else name="ph:plus-bold" class="h-4 w-4" />
              Add
            </button>
          </form>

          <div class="flex flex-col rounded-none border" :class="innerPanelClass">
            <div v-if="categoriesStore.categories.length === 0" class="px-4 py-4 text-center text-xs" :class="mutedClass">
              No categories created yet.
            </div>
            <div
              v-for="category in categoriesStore.categories"
              :key="category.id"
              class="flex items-center justify-between border-b px-4 py-3 last:border-0"
              :class="isDark ? 'border-white/5' : 'border-gray-100'"
            >
              <span class="text-sm font-medium" :class="headingClass">{{ category.name }}</span>
              <button
                type="button"
                class="text-gray-400 transition hover:text-red-500"
                :disabled="categoriesStore.loading"
                @click="handleDeleteCategory(category.id)"
              >
                <Icon name="ph:trash" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-none border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Account</h2>
        <p class="mt-1 text-xs" :class="mutedClass">
          Signed in as <span class="font-medium" :class="headingClass">{{ auth.user?.email }}</span>
        </p>
        <button
          type="button"
          class="mt-4 inline-flex items-center gap-2 rounded-none border px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-500/5 dark:text-red-400"
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
        <div v-if="toast.visible" class="fixed bottom-24 left-1/2 z-[100] max-w-sm -translate-x-1/2 rounded-none border px-4 py-3 text-sm font-semibold md:bottom-8" :class="toastClass">
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Organization Settings',
  description: 'Configure global system preferences, customize your organization profile, and manage application settings.'
})
import SettingToggleRow from '~/components/messenger/SettingToggleRow.vue'
import { useClientSettings } from '~/composables/useClientSettings'
import { useClientToast } from '~/composables/useClientToast'
import { useAuthStore } from '~/stores/auth'
import { useCategoriesStore } from '~/stores/categories'

const auth = useAuthStore()
const categoriesStore = useCategoriesStore()
const newCategoryName = ref('')

async function handleAddCategory() {
  if (!newCategoryName.value.trim()) return
  try {
    await categoriesStore.addCategory(newCategoryName.value)
    newCategoryName.value = ''
    showToast('Category added successfully.')
  } catch (err: any) {
    showToast(err.message || 'Failed to add category.', 'error')
  }
}

async function handleDeleteCategory(id: string) {
  try {
    await categoriesStore.deleteCategory(id)
    showToast('Category deleted.')
  } catch (err: any) {
    showToast(err.message || 'Failed to delete category.', 'error')
  }
}

definePageMeta({ layout: 'client' })

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
const copiedOrg = ref(false)

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

async function copyOrgCode() {
  if (!auth.currentOrg?.code) return
  try {
    await navigator.clipboard.writeText(auth.currentOrg.code)
    copiedOrg.value = true
    showToast('Organisation Code copied to clipboard!')
    setTimeout(() => { copiedOrg.value = false }, 2000)
  } catch (err) {
    showToast('Failed to copy code', 'error')
  }
}

onMounted(async () => {
  hydrate()
  if (auth.isLoggedIn && !auth.currentOrg) {
    await auth.fetchMyOrg()
  }
  await categoriesStore.fetchCategories()
})
</script>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.2s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; }
</style>
