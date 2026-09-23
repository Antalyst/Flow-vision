<template>
  <div class="relative space-y-6 pb-32 md:pb-24">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="space-y-3">
        <div class="h-4 w-40 animate-pulse rounded" :class="skeletonClass" />
        <div class="h-8 w-64 animate-pulse rounded" :class="skeletonClass" />
      </div>
      <div class="dashboard-card animate-pulse p-6" :class="skeletonClass">
        <div class="h-24 rounded-xl" :class="skeletonInner" />
      </div>
      <div class="dashboard-card animate-pulse p-6" :class="skeletonClass">
        <div class="h-40 rounded-xl" :class="skeletonInner" />
      </div>
      <div class="dashboard-card animate-pulse p-6" :class="skeletonClass">
        <div class="space-y-4">
          <div v-for="n in 4" :key="n" class="flex gap-3">
            <div class="h-8 w-8 rounded-full" :class="skeletonInner" />
            <div class="h-8 flex-1 rounded-lg" :class="skeletonInner" />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="trip">
      <div class="flex items-center gap-2">
        <NuxtLink
          to="/messenger/dashboard"
          class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition hover:text-candy-orange"
          :class="mutedClass"
        >
          <Icon name="ph:arrow-left-bold" class="h-3.5 w-3.5" />
          Dashboard
        </NuxtLink>
      </div>

      <!-- Trip status header -->
      <section
        class="dashboard-card border p-6"
        :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white-pure'"
      >
        <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">Active Transit Run</p>
        <h1 class="mt-2 text-xl font-bold leading-tight" :class="headingClass">
          {{ trip.title }}
        </h1>
        <p class="mt-2 font-mono text-xs" :class="mutedClass">Tracking ID: {{ trip.tracking_id }}</p>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span
            class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide"
            :class="statusBadgeClass"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-current" :class="trip.tracking_status === 'IN_TRANSIT' ? 'animate-pulse' : ''" />
            {{ statusLabel }}
          </span>
          <span class="text-xs font-semibold" :class="mutedClass">
            Step {{ trip.current_step }} / {{ trip.total_steps || '—' }}
          </span>
        </div>
      </section>

      <!-- Route vector -->
      <section
        class="dashboard-card border p-6"
        :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white-pure'"
      >
        <h2 class="mb-5 text-sm font-bold" :class="headingClass">Route Vector</h2>

        <div class="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div
            class="rounded-xl border p-4 text-center"
            :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-zinc-200 bg-white-surface'"
          >
            <p class="text-[13px] font-bold uppercase tracking-wider text-candy-orange">Source Station</p>
            <p class="mt-2 text-sm font-bold" :class="headingClass">
              {{ trip.source_office_name || 'Origin desk' }}
            </p>
          </div>

          <div class="flex flex-col items-center justify-center gap-1 px-2">
            <Icon name="ph:arrow-right-bold" class="hidden h-8 w-8 text-candy-orange md:block" />
            <Icon name="ph:arrow-down-bold" class="h-8 w-8 text-candy-orange md:hidden" />
            <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">In Transit</p>
          </div>

          <div
            class="rounded-xl border-2 border-candy-orange/40 bg-candy-orange/5 p-4 text-center"
            :class="isDark ? 'bg-candy-orange/10' : ''"
          >
            <p class="text-[13px] font-bold uppercase tracking-wider text-candy-orange">Target Destination</p>
            <p class="mt-2 text-sm font-bold text-candy-orange">
              {{ trip.destination_office_name || 'Next checkpoint' }}
            </p>
          </div>
        </div>
      </section>

      <!-- Fulfillment stepper -->
      <section
        class="dashboard-card border p-6"
        :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white-pure'"
      >
        <h2 class="mb-5 text-sm font-bold" :class="headingClass">Fulfillment Trail</h2>

        <ol v-if="trip.route_steps.length" class="relative space-y-0">
          <li
            v-for="(step, index) in trip.route_steps"
            :key="step.step_number"
            class="relative flex gap-4 pb-6 last:pb-0"
          >
            <div class="flex flex-col items-center">
              <span
                class="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold"
                :class="stepNodeClass(step)"
              >
                {{ step.step_number }}
              </span>
              <span
                v-if="index < trip.route_steps.length - 1"
                class="mt-1 w-0.5 flex-1 min-h-[24px]"
                :class="step.step_number < trip.current_step ? 'bg-candy-orange' : (isDark ? 'bg-onyx-border' : 'bg-gray-200')"
              />
            </div>
            <div class="min-w-0 flex-1 pt-1">
              <p class="text-sm font-semibold" :class="stepLabelClass(step)">
                {{ step.office_name }}
              </p>
              <p class="mt-0.5 text-xs" :class="mutedClass">{{ stepStateLabel(step) }}</p>
            </div>
          </li>
        </ol>

        <p v-else class="text-sm" :class="mutedClass">No route checkpoints defined for this document.</p>
      </section>
    </template>

    <!-- Sticky drop-off action -->
    <div
      v-if="trip && trip.is_active_trip && trip.tracking_status === 'IN_TRANSIT'"
      class="fixed bottom-20 left-0 right-0 z-40 border-t px-4 py-4 md:bottom-0"
      :class="isDark ? 'border-onyx-border bg-onyx-black/95 backdrop-blur-md' : 'border-zinc-200 bg-white-pure/95 backdrop-blur-md'"
    >
      <div class="mx-auto max-w-3xl">
        <button
          type="button"
          class="flex w-full items-center justify-center gap-3 rounded-2xl bg-candy-orange px-6 py-4 text-base font-bold text-white-pure shadow-lg shadow-candy-orange/30 transition hover:bg-opacity-90 active:scale-[0.99]"
          @click="goToDropoffScan"
        >
          <Icon name="ph:scan-fill" class="h-6 w-6" />
          Arrived at Destination: Scan Drop-off QR
        </button>
      </div>
    </div>

    <!-- Terminal interrupt modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showTerminalModal"
          class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            class="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-zinc-200 bg-white-pure'"
          >
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Icon name="ph:warning-fill" class="h-6 w-6 text-amber-500" />
            </div>
            <h3 class="text-lg font-bold" :class="headingClass">Trip No Longer Active</h3>
            <p class="mt-2 text-sm leading-relaxed" :class="mutedClass">
              {{ terminalMessage }}
            </p>
            <button
              type="button"
              class="mt-6 w-full rounded-xl bg-candy-orange py-3 text-sm font-bold text-white-pure transition hover:bg-opacity-90"
              @click="goDashboard"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
export interface TripDocument {
  id: string
  title: string
  tracking_id: string
  tracking_status: string
  current_step: number
  total_steps: number
  source_office_name: string | null
  source_office_id: string | null
  destination_office_name: string | null
  destination_office_id: string | null
  route_steps: Array<{ step_number: number; office_id: string; office_name: string }>
  is_active_trip: boolean
  is_terminal: boolean
  terminal_reason: string | null
  created_at: string
}

definePageMeta({ layout: 'messenger' })

const route = useRoute()
const router = useRouter()
const { isDark } = useTheme()
const { show: showToast } = useMessengerToast()

const loading = ref(true)
const trip = ref<TripDocument | null>(null)
const showTerminalModal = ref(false)
const terminalMessage = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

const documentId = computed(() => String(route.query.document_id ?? '').trim())

const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))
const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const skeletonClass = computed(() => (isDark.value ? 'bg-onyx-card' : 'bg-gray-200'))
const skeletonInner = computed(() => (isDark.value ? 'bg-onyx-border' : 'bg-gray-300'))

const statusLabel = computed(() => {
  switch (trip.value?.tracking_status) {
    case 'IN_TRANSIT': return 'On the Way'
    case 'PICKED_UP': return 'Awaiting Pickup Scan'
    case 'COMPLETED': return 'Completed'
    case 'DISCREPANCY_REPORTED': return 'Flagged'
    default: return trip.value?.tracking_status ?? '—'
  }
})

const statusBadgeClass = computed(() => {
  if (trip.value?.tracking_status === 'IN_TRANSIT') {
    return 'border-candy-orange/40 bg-candy-orange/10 text-candy-orange'
  }
  if (trip.value?.tracking_status === 'PICKED_UP') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-500'
  }
  return isDark.value ? 'border-onyx-border text-white-muted' : 'border-zinc-200 text-gray-500'
})

function stepNodeClass(step: { step_number: number }) {
  const current = trip.value?.current_step ?? 0
  if (step.step_number === current) {
    return 'border-candy-orange bg-candy-orange text-white-pure shadow-md shadow-candy-orange/25'
  }
  if (step.step_number < current) {
    return 'border-candy-orange/50 bg-candy-orange/20 text-candy-orange'
  }
  return isDark.value ? 'border-onyx-border text-white-muted' : 'border-zinc-200 text-gray-400'
}

function stepLabelClass(step: { step_number: number }) {
  const current = trip.value?.current_step ?? 0
  if (step.step_number === current) return 'text-candy-orange'
  if (step.step_number < current) return 'text-candy-orange/80'
  return mutedClass.value
}

function stepStateLabel(step: { step_number: number }) {
  const current = trip.value?.current_step ?? 0
  if (step.step_number < current) return 'Completed'
  if (step.step_number === current) return 'Current checkpoint'
  return 'Upcoming'
}

function goDashboard() {
  showTerminalModal.value = false
  router.push('/messenger/dashboard')
}

function goToDropoffScan() {
  if (!trip.value?.id) return
  router.push({
    path: '/messenger/scan',
    query: { mode: 'dropoff', document_id: trip.value.id },
  })
}

function handleTerminalState(reason: string) {
  terminalMessage.value = reason
  showTerminalModal.value = true
  stopPolling()
}

async function loadTrip(silent = false) {
  if (!documentId.value) return

  if (!silent) loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: TripDocument }>('/api/tracking/trip', {
      query: { document_id: documentId.value },
      credentials: 'include',
    })

    trip.value = res.data

    if (res.data.is_terminal) {
      handleTerminalState(res.data.terminal_reason || 'This delivery trip is no longer active.')
      return
    }

    if (!res.data.is_active_trip) {
      handleTerminalState(res.data.terminal_reason || 'This document is no longer in your custody.')
    }
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusCode?: number; message?: string }
    const message = e?.data?.message ?? e?.message ?? 'Failed to load delivery trip.'

    if (e?.statusCode === 404) {
      showToast('Document not found. Returning to dashboard.', 'warning')
      await router.replace('/messenger/dashboard')
      return
    }

    if (!silent) {
      showToast(message, 'error')
    }
  } finally {
    if (!silent) loading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    void loadTrip(true)
  }, 12000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  if (!documentId.value) {
    showToast('Select a document from your custody list to view its active trip.', 'warning')
    await router.replace('/messenger/dashboard')
    return
  }

  await loadTrip()
  if (trip.value?.is_active_trip && !trip.value.is_terminal) {
    startPolling()
  }
})

onBeforeUnmount(stopPolling)

watch(documentId, async (id) => {
  if (!id) {
    showToast('Missing document context. Returning to dashboard.', 'warning')
    await router.replace('/messenger/dashboard')
    return
  }
  await loadTrip()
})
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
