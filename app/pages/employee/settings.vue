<template>
  <div ref="pageRoot" class="space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <header ref="headerEl">
      <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedClass">
        <Icon name="ph:gear-six-fill" class="h-3.5 w-3.5 text-candy-orange" />
        <span>Employee Portal</span>
        <Icon name="ph:caret-right" class="h-3 w-3 opacity-50" />
        <span :class="headingClass">Settings</span>
      </div>
      <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="headingClass">
        Employee Settings
      </h1>
      <p class="mt-1.5 text-sm" :class="mutedClass">
        Station profile, compliance alerts, and workspace preferences for your account.
      </p>
    </header>

    <!-- ── Station Profile ────────────────────────────────────────────── -->
    <section
      ref="section1El"
      class="rounded-2xl border overflow-hidden"
      :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
    >
      <!-- Section header -->
      <div
        class="flex items-center gap-3 border-b px-6 py-4"
        :class="isDark ? 'border-onyx-border' : 'border-gray-100'"
      >
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-candy-orange/10 ring-1 ring-candy-orange/20">
          <Icon name="ph:buildings-fill" class="h-4.5 w-4.5 text-candy-orange" />
        </span>
        <div>
          <h2 class="text-sm font-bold" :class="headingClass">Station Profile</h2>
          <p class="text-[11px]" :class="mutedClass">Workstation metadata assigned by your organisation.</p>
        </div>
      </div>

      <div class="p-6">
        <div v-if="profileLoading" class="space-y-3">
          <div v-for="n in 2" :key="n" class="h-20 animate-pulse rounded-xl" :class="skeletonClass" />
        </div>

        <div
          v-else-if="profileError"
          class="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4 text-sm text-red-500"
        >
          {{ profileError }}
        </div>

        <div v-else-if="!stationCards.length" class="text-sm" :class="mutedClass">
          No office station is assigned to your account yet. Contact your organisation administrator.
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="station in stationCards"
            :key="station.id"
            class="rounded-xl border px-5 py-4 transition-colors"
            :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-white-surface'"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">Station Name</p>
                <p class="mt-1 text-sm font-semibold" :class="headingClass">{{ station.displayName }}</p>
              </div>
              <span
                v-if="privilegeLabel"
                class="inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
              >
                {{ privilegeLabel }}
              </span>
            </div>
            <div class="mt-4 pt-4 border-t" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
              <p class="text-[10px] font-bold uppercase tracking-widest" :class="mutedClass">
                Station ID / Checkpoint Token
              </p>
              <p class="mt-1 break-all font-mono text-xs" :class="headingClass">{{ station.id }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Loading preferences -->
    <div
      v-if="!settingsReady"
      class="rounded-2xl border px-6 py-10 text-center text-sm"
      :class="[panelClass, mutedClass]"
    >
      <Icon name="ph:spinner-gap-bold" class="h-6 w-6 animate-spin mx-auto mb-3 text-candy-orange" />
      Loading your saved preferences…
    </div>

    <template v-else>
      <!-- ── Compliance & Dispatch Alerts ──────────────────────────────── -->
      <section
        ref="section2El"
        class="rounded-2xl border overflow-hidden"
        :class="panelClass"
      >
        <div
          class="flex items-center gap-3 border-b px-6 py-4"
          :class="isDark ? 'border-onyx-border' : 'border-gray-100'"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-candy-orange/10 ring-1 ring-candy-orange/20">
            <Icon name="ph:bell-ringing-fill" class="h-4.5 w-4.5 text-candy-orange" />
          </span>
          <div>
            <h2 class="text-sm font-bold" :class="headingClass">Compliance & Dispatch Alerts</h2>
            <p class="text-[11px]" :class="mutedClass">Device-level alert behaviour for this employee session.</p>
          </div>
        </div>

        <div class="divide-y p-0" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
          <div class="px-6 py-5">
            <SettingToggleRow
              label="Flagged Document Alerts"
              description="Play a system tone when a compliance issue is reported on a document tied to your station."
              :checked="flaggedDocumentAlerts"
              :disabled="savingFlagged"
              @update:checked="onFlaggedToggle"
            />
          </div>
          <div class="px-6 py-5">
            <SettingToggleRow
              label="Incoming Hand-off Broadcasts"
              description="Poll for inbound messenger drop-offs and play an alert when a folder arrives at your desk."
              :checked="incomingHandoffBroadcasts"
              :disabled="savingHandoff"
              @update:checked="onHandoffToggle"
            />
          </div>
        </div>
      </section>

      <!-- ── Workspace Canvas Preferences ──────────────────────────────── -->
      <section
        ref="section3El"
        class="rounded-2xl border overflow-hidden"
        :class="panelClass"
      >
        <div
          class="flex items-center gap-3 border-b px-6 py-4"
          :class="isDark ? 'border-onyx-border' : 'border-gray-100'"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-candy-orange/10 ring-1 ring-candy-orange/20">
            <Icon name="ph:kanban-fill" class="h-4.5 w-4.5 text-candy-orange" />
          </span>
          <div>
            <h2 class="text-sm font-bold" :class="headingClass">Workspace Canvas Preferences</h2>
            <p class="text-[11px]" :class="mutedClass">Controls the live kanban board at /employee/working.</p>
          </div>
        </div>

        <div class="space-y-6 px-6 py-6">
          <!-- Default pipeline view -->
          <div>
            <p class="mb-3 text-xs font-bold uppercase tracking-widest" :class="mutedClass">
              Default Pipeline View
            </p>
            <div
              class="inline-flex items-center gap-0.5 rounded-xl border p-1"
              :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-white-surface'"
            >
              <button
                v-for="opt in pipelineViewOptions"
                :key="opt.value"
                type="button"
                class="rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 disabled:opacity-50"
                :class="defaultPipelineView === opt.value
                  ? 'bg-candy-orange text-white shadow-sm shadow-candy-orange/30'
                  : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800')"
                :disabled="savingPipelineView"
                @click="onPipelineViewChange(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Auto-refresh frequency -->
          <label class="block max-w-md">
            <span class="mb-2 block text-xs font-bold uppercase tracking-widest" :class="mutedClass">
              Auto-Refresh Frequency
            </span>
            <select
              :value="autoRefreshMode"
              class="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
              :class="inputClass"
              :disabled="savingRefresh"
              @change="onRefreshModeChange(($event.target as HTMLSelectElement).value as AutoRefreshMode)"
            >
              <option
                v-for="opt in AUTO_REFRESH_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
            <p class="mt-2 text-[11px] leading-relaxed" :class="mutedClass">
              Applies to the live working board sync loop and inbound hand-off polling while the portal is open.
            </p>
          </label>
        </div>
      </section>
    </template>

    <!-- ── Toast Notification ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="toast-fade">
        <div
          v-if="toast.visible"
          class="fixed bottom-24 left-1/2 z-[100] flex max-w-sm -translate-x-1/2 items-center gap-2.5 rounded-xl border px-5 py-3.5 text-sm font-semibold shadow-lg md:bottom-8"
          :class="toastClass"
          role="status"
        >
          <Icon :name="toastIcon" class="h-5 w-5 flex-shrink-0" />
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { gsap } from 'gsap'
import SettingToggleRow from '~/components/messenger/SettingToggleRow.vue'
import {
  AUTO_REFRESH_OPTIONS,
  type AutoRefreshMode,
  type PipelineView,
  useEmployeeSettings,
} from '~/composables/useEmployeeSettings'
import { useEmployeeToast } from '~/composables/useEmployeeToast'

definePageMeta({ layout: 'employee' })

interface OfficeRow {
  id: string
  name: string
  code?: string | null
}

interface AccountTypeRow {
  acctype_id: string | number
  name: string
}

const auth = useAuthStore()
const { isDark } = useTheme()
const {
  ready: settingsReady,
  flaggedDocumentAlerts,
  incomingHandoffBroadcasts,
  defaultPipelineView,
  autoRefreshMode,
  setFlaggedDocumentAlerts,
  setIncomingHandoffBroadcasts,
  setDefaultPipelineView,
  setAutoRefreshMode,
  hydrate,
  applyHandoffPolling,
} = useEmployeeSettings()
const { toast, show: showToast } = useEmployeeToast()

const profileLoading = ref(true)
const profileError = ref<string | null>(null)
const myOffices = ref<OfficeRow[]>([])
const privilegeLabel = ref<string | null>(null)

const savingFlagged = ref(false)
const savingHandoff = ref(false)
const savingPipelineView = ref(false)
const savingRefresh = ref(false)

const pipelineViewOptions: Array<{ value: PipelineView; label: string }> = [
  { value: 'LOCAL', label: 'Local View' },
  { value: 'GLOBAL', label: 'Global View' },
]

// GSAP refs
const pageRoot  = ref<HTMLElement | null>(null)
const headerEl  = ref<HTMLElement | null>(null)
const section1El = ref<HTMLElement | null>(null)
const section2El = ref<HTMLElement | null>(null)
const section3El = ref<HTMLElement | null>(null)

const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'))
const skeletonClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-gray-100'))
const inputClass = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-black text-white-pure'
    : 'border-gray-200 bg-white text-onyx-black',
)

const stationCards = computed(() =>
  myOffices.value.map((office) => ({
    id: office.id,
    displayName: office.code ? `${office.name} — ${office.code}` : office.name,
  })),
)

const toastClass = computed(() => {
  switch (toast.type) {
    case 'warning':
      return 'border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-onyx-card dark:text-amber-300'
    case 'error':
      return 'border-red-500/40 bg-red-50 text-red-800 dark:bg-onyx-card dark:text-red-300'
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

async function loadStationProfile() {
  const orgId = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) {
    profileError.value = 'Session could not be resolved. Sign in again to load your station profile.'
    profileLoading.value = false
    return
  }

  profileLoading.value = true
  profileError.value = null

  try {
    const [officesRes, accountTypes] = await Promise.all([
      $fetch<{ success: boolean; data: OfficeRow[] }>('/api/employee/my-offices', {
        params: { orgId, userId },
      }),
      $fetch<AccountTypeRow[]>('/api/account_type'),
    ])

    myOffices.value = officesRes.data ?? []

    const acctypeId = auth.user?.acctype_id
    const match = (accountTypes ?? []).find((t) => String(t.acctype_id) === String(acctypeId))
    privilegeLabel.value = match?.name ?? null
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    profileError.value = e?.data?.message ?? e?.message ?? 'Failed to load station profile.'
  } finally {
    profileLoading.value = false
  }
}

async function onFlaggedToggle(enabled: boolean) {
  savingFlagged.value = true
  try {
    await setFlaggedDocumentAlerts(enabled)
    showToast(enabled ? 'Flagged document alerts enabled.' : 'Flagged document alerts muted.')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save flagged alert preference.'
    showToast(message, 'error')
  } finally {
    savingFlagged.value = false
  }
}

async function onHandoffToggle(enabled: boolean) {
  savingHandoff.value = true
  try {
    await setIncomingHandoffBroadcasts(enabled)
    showToast(enabled ? 'Incoming hand-off broadcasts enabled.' : 'Incoming hand-off broadcasts paused.')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save hand-off alert preference.'
    showToast(message, 'error')
  } finally {
    savingHandoff.value = false
  }
}

async function onPipelineViewChange(view: PipelineView) {
  if (view === defaultPipelineView.value) return
  savingPipelineView.value = true
  try {
    await setDefaultPipelineView(view)
    showToast(`Default working view set to ${view === 'LOCAL' ? 'Local' : 'Global'}.`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save pipeline view preference.'
    showToast(message, 'error')
  } finally {
    savingPipelineView.value = false
  }
}

async function onRefreshModeChange(mode: AutoRefreshMode) {
  savingRefresh.value = true
  try {
    await setAutoRefreshMode(mode)
    const label = AUTO_REFRESH_OPTIONS.find((o) => o.value === mode)?.label ?? mode
    showToast(`Auto-refresh set to ${label}.`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save refresh interval.'
    showToast(message, 'error')
  } finally {
    savingRefresh.value = false
  }
}

// ── GSAP Entrance ──────────────────────────────────────────────────────
const runEntranceAnimation = () => {
  const els = [headerEl.value, section1El.value, section2El.value, section3El.value].filter(Boolean)
  gsap.fromTo(els,
    { opacity: 0, y: 22 },
    { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out' }
  )
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  runEntranceAnimation()
  hydrate()
  applyHandoffPolling()
  await loadStationProfile()
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
