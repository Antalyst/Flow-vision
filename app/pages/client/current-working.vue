<template>
  <div class="space-y-6 pb-24 lg:pb-8">

    <!-- ── Page header ────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange mb-1">Track Documents</p>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="isDark ? 'text-white' : 'text-gray-900'">
          Live Tracking
        </h1>
        <p class="mt-1 text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
          See where every document is right now · {{ auth.currentOrg?.name }}
        </p>
      </div>

      <!-- Status filter pills -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="chip in statusChips"
          :key="chip.status"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-200 hover:scale-[1.02]"
          :class="statusFilter === chip.status
            ? 'border-candy-orange bg-candy-orange text-white'
            : (isDark ? 'border-onyx-border bg-white/5 text-gray-400' : 'border-gray-200 bg-white text-gray-500')"
          @click="statusFilter = statusFilter === chip.status ? '' : chip.status"
        >
          <Icon :name="chip.icon" class="h-3.5 w-3.5" />
          <span>{{ chip.label }}</span>
          <span
            class="rounded-full px-1.5 py-0.5 text-[13px]"
            :class="statusFilter === chip.status ? 'bg-white/20' : (isDark ? 'bg-white/10' : 'bg-black/5')"
          >{{ queueSummary[chip.countKey] ?? 0 }}</span>
        </button>
      </div>
    </div>

    <!-- ── KPI row ─────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div class="flex flex-col justify-between gap-3 rounded-2xl p-4 bg-candy-orange shadow-lg shadow-candy-orange/15">
        <span class="text-[13px] font-bold uppercase tracking-wider text-white/85">Total</span>
        <p class="text-2xl font-bold text-white">{{ queueSummary.total ?? 0 }}</p>
      </div>
      <div
        v-for="kpi in kpiCards"
        :key="kpi.label"
        class="flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-300"
        :class="isDark ? 'border-onyx-border bg-[#1A1A1A]' : 'border-gray-200 bg-white'"
      >
        <div class="flex items-center gap-2">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg" :class="kpi.iconBg">
            <Icon :name="kpi.icon" class="h-3.5 w-3.5" :class="kpi.iconColor" />
          </span>
          <span class="text-[13px] font-bold uppercase tracking-wider" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            {{ kpi.label }}
          </span>
        </div>
        <p class="text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
          {{ kpi.value }}
        </p>
      </div>
    </div>

    <!-- ── Document queue + detail ─────────────────────────────────────── -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">

      <!-- Document list (1/2 width) -->
      <section
        class="flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 lg:h-[calc(100vh_-_19rem)] lg:min-h-[420px]"
        :class="isDark ? 'border-onyx-border bg-[#1A1A1A]' : 'border-gray-200 bg-white'"
      >
        <!-- Section header -->
        <div
          class="flex flex-none items-center justify-between border-b px-6 py-4"
          :class="isDark ? 'border-onyx-border' : 'border-gray-100'"
        >
          <div>
            <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
              Documents on the Move
            </h2>
            <p class="text-xs mt-0.5" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              {{ filteredQueue.length }} documents{{ statusFilter ? ` · ${STATUS_LABELS[statusFilter]}` : '' }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition hover:border-candy-orange hover:text-candy-orange"
            :class="isDark ? 'border-onyx-border text-gray-400' : 'border-gray-200 text-gray-500'"
            @click="refreshQueue"
          >
            <Icon name="ph:arrows-clockwise" class="h-3.5 w-3.5" :class="queueLoading ? 'animate-spin' : ''" />
            Refresh
          </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="queueLoading" class="divide-y overflow-y-auto lg:flex-1" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
          <div
            v-for="n in 5" :key="n"
            class="flex items-center gap-4 px-6 py-4"
          >
            <div class="h-9 w-9 animate-pulse rounded-full" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
            <div class="flex-1 space-y-2">
              <div class="h-3 w-48 animate-pulse rounded-md" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
              <div class="h-2.5 w-32 animate-pulse rounded-md" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
            </div>
          </div>
        </div>

        <!-- Queue rows -->
        <div v-else class="divide-y overflow-y-auto lg:flex-1" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
          <button
            v-for="doc in filteredQueue"
            :key="doc.id"
            type="button"
            class="w-full flex items-start gap-4 px-6 py-4 text-left transition-all duration-150"
            :class="[
              isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50',
              selectedDocId === doc.id
                ? (isDark ? 'bg-candy-orange/5 border-l-2 border-l-candy-orange' : 'bg-candy-orange/[0.03] border-l-2 border-l-candy-orange')
                : 'border-l-2 border-l-transparent',
            ]"
            @click="selectDocument(doc)"
          >
            <!-- Status icon -->
            <span
              class="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
              :class="statusIconBg(doc.tracking_status)"
            >
              <Icon :name="STATUS_ICONS[doc.tracking_status] ?? 'ph:file'" class="h-4 w-4" :class="statusIconColor(doc.tracking_status)" />
            </span>

            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <p class="truncate text-sm font-semibold" :class="isDark ? 'text-gray-100' : 'text-gray-900'">
                  {{ doc.title || 'Untitled Document' }}
                </p>
                <span
                  class="flex-shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-bold uppercase tracking-wide"
                  :class="statusBadgeClass(doc.tracking_status)"
                >
                  {{ STATUS_LABELS[doc.tracking_status] ?? doc.tracking_status }}
                </span>
              </div>

              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[14px]"
                :class="isDark ? 'text-gray-500' : 'text-gray-400'">
                <span v-if="doc.stage_name" class="flex items-center gap-1">
                  <Icon name="ph:steps-fill" class="h-3 w-3" />
                  {{ doc.stage_name }}
                </span>
                <span v-if="doc.total_steps" class="flex items-center gap-1">
                  <Icon name="ph:map-pin" class="h-3 w-3" />
                  Stop {{ doc.current_step }} of {{ doc.total_steps }}
                </span>
                <span v-if="doc.messenger_name" class="flex items-center gap-1 text-candy-orange">
                  <Icon name="ph:motorcycle-fill" class="h-3 w-3" />
                  {{ doc.messenger_name }}
                </span>
              </div>

              <!-- Mini progress bar -->
              <div
                v-if="doc.total_steps"
                class="mt-2 h-1.5 w-full overflow-hidden rounded-full"
                :class="isDark ? 'bg-white/10' : 'bg-gray-200'"
              >
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="doc.tracking_status === 'COMPLETED' ? 'bg-success' : 'bg-candy-orange'"
                  :style="{ width: `${doc.progress_pct}%` }"
                />
              </div>
            </div>
          </button>

          <!-- Empty state -->
          <div v-if="!filteredQueue.length" class="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Icon name="ph:package-fill" class="h-10 w-10 text-gray-300" />
            <p class="font-semibold" :class="isDark ? 'text-gray-300' : 'text-gray-600'">No documents here</p>
            <p class="text-sm" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              {{ statusFilter ? 'Try a different filter or refresh.' : 'Everything is either finished or nothing has been added yet.' }}
            </p>
          </div>
        </div>
      </section>

      <!-- Detail panel (1/3) -->
      <aside
        class="flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 lg:sticky lg:top-6 lg:h-[calc(100vh_-_19rem)] lg:min-h-[420px]"
        :class="isDark ? 'border-onyx-border bg-[#1A1A1A]' : 'border-gray-200 bg-white'"
      >
        <div class="flex-none border-b px-5 py-4" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
          <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ selectedDoc ? 'Delivery Journey' : 'Choose a Document' }}
          </h2>
          <p v-if="selectedDoc" class="mt-0.5 truncate text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            {{ selectedDoc.title }}
          </p>
        </div>

        <!-- No selection state -->
        <div
          v-if="!selectedDoc"
          class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center"
        >
          <Icon name="ph:cursor-click" class="h-10 w-10 text-gray-300" />
          <p class="text-sm" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            Click on any document to see its full delivery journey.
          </p>
        </div>

        <!-- Timeline loading -->
        <div v-else-if="timelineLoading" class="flex-1 overflow-y-auto p-5 space-y-3">
          <div v-for="n in 4" :key="n" class="flex items-center gap-3">
            <div class="h-8 w-8 animate-pulse rounded-full" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3 w-28 animate-pulse rounded-md" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
              <div class="h-2.5 w-20 animate-pulse rounded-md" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <div v-else-if="timelineData" class="flex-1 overflow-y-auto p-5 space-y-5">
          <DocumentTimeline
            :events="timelineData.events"
            :route-steps="timelineData.routeSteps"
            :summary="timelineData.summary"
          />

          <!-- Advance status controls -->
          <div
            v-if="allowedTransitions.length"
            class="space-y-2 border-t pt-4"
            :class="isDark ? 'border-onyx-border' : 'border-gray-100'"
          >
            <p class="text-[13px] font-bold uppercase tracking-widest" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              Update Status
            </p>
            <button
              v-for="nextStatus in allowedTransitions"
              :key="nextStatus"
              type="button"
              :disabled="advancing"
              class="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              :class="advanceButtonClass(nextStatus)"
              @click="advanceStatus(nextStatus)"
            >
              <Icon v-if="advancing" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
              <Icon v-else :name="STATUS_ICONS[nextStatus] ?? 'ph:arrow-right'" class="h-4 w-4" />
              Mark as {{ STATUS_LABELS[nextStatus] }}
            </button>
          </div>

          <p
            v-else-if="timelineData.summary.is_complete"
            class="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-success"
          >
            <Icon name="ph:check-circle-fill" class="h-4 w-4" />
            Delivery complete.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Live Tracking',
  description: 'See every document that is currently on the move across your organization, including active couriers and pending branch deliveries.'
})
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import DocumentTimeline from '~/components/client/tracking/DocumentTimeline.vue'

definePageMeta({ layout: 'client' })

const auth = useAuthStore()
const { isDark } = useTheme()

// ── Types ──────────────────────────────────────────────────────────────
interface QueueDoc {
  id: string
  title: string | null
  tracking_status: string
  current_step: number
  total_steps: number
  progress_pct: number
  stage_name: string | null
  messenger_name: string | null
  created_at: string
}

interface TimelineData {
  events: any[]
  routeSteps: any[]
  summary: {
    total_steps: number
    current_step: number
    tracking_status: string
    is_complete: boolean
    progress_pct: number
  }
}

// ── Constants ──────────────────────────────────────────────────────────
// Shopee-style palette: Registered = neutral gray, everything moving
// (Picked Up / In Transit / Arrived) = brand orange, Completed = green.
const STATUS_LABELS: Record<string, string> = {
  CREATED:           'Registered',
  PICKED_UP:         'Picked Up',
  IN_TRANSIT:        'In Transit',
  ARRIVED_AT_OFFICE: 'Arrived',
  COMPLETED:         'Completed',
}

const STATUS_ICONS: Record<string, string> = {
  CREATED:           'ph:file-plus-fill',
  PICKED_UP:         'ph:hand-fill',
  IN_TRANSIT:        'ph:motorcycle-fill',
  ARRIVED_AT_OFFICE: 'ph:buildings-fill',
  COMPLETED:         'ph:check-circle-fill',
}

const TRANSITIONS: Record<string, string[]> = {
  CREATED:           ['PICKED_UP'],
  PICKED_UP:         ['IN_TRANSIT'],
  IN_TRANSIT:        ['ARRIVED_AT_OFFICE'],
  ARRIVED_AT_OFFICE: ['PICKED_UP', 'COMPLETED'],
  COMPLETED:         [],
}

const statusChips = [
  { status: 'CREATED',           label: 'Registered',  icon: 'ph:file-plus-fill',    countKey: 'created' },
  { status: 'PICKED_UP',         label: 'Picked Up',   icon: 'ph:hand-fill',         countKey: 'picked_up' },
  { status: 'IN_TRANSIT',        label: 'In Transit',  icon: 'ph:motorcycle-fill',   countKey: 'in_transit' },
  { status: 'ARRIVED_AT_OFFICE', label: 'Arrived',     icon: 'ph:buildings-fill',    countKey: 'arrived_at_office' },
  { status: 'COMPLETED',         label: 'Completed',   icon: 'ph:check-circle-fill', countKey: 'completed' },
]

// ── State ──────────────────────────────────────────────────────────────
const queue          = ref<QueueDoc[]>([])
const queueLoading   = ref(false)
const queueSummary   = ref<Record<string, number>>({})
const statusFilter   = ref('')
const selectedDocId  = ref<string | null>(null)
const selectedDoc    = ref<QueueDoc | null>(null)
const timelineData   = ref<TimelineData | null>(null)
const timelineLoading = ref(false)
const advancing      = ref(false)

const filteredQueue = computed(() => {
  if (!statusFilter.value) return queue.value
  return queue.value.filter((d) => d.tracking_status === statusFilter.value)
})

const kpiCards = computed(() => [
  { label: 'Registered', value: queueSummary.value.created ?? 0,            icon: 'ph:file-plus-fill',        iconBg: 'bg-gray-500/10',    iconColor: 'text-gray-500' },
  { label: 'In Transit', value: queueSummary.value.in_transit ?? 0,         icon: 'ph:motorcycle-fill',       iconBg: 'bg-candy-orange/10', iconColor: 'text-candy-orange' },
  { label: 'Arrived',    value: queueSummary.value.arrived_at_office ?? 0,  icon: 'ph:buildings-fill',        iconBg: 'bg-candy-orange/10', iconColor: 'text-candy-orange' },
  { label: 'Completed',  value: queueSummary.value.completed ?? 0,          icon: 'ph:check-circle-fill',     iconBg: 'bg-success/10',     iconColor: 'text-success' },
])

const allowedTransitions = computed(() => {
  if (!timelineData.value) return []
  const current = timelineData.value.summary.tracking_status
  return TRANSITIONS[current] ?? []
})

// ── Style helpers (3-tier Shopee palette: gray / orange / green) ───────
const statusIconBg = (status: string) => {
  if (status === 'COMPLETED') return isDark.value ? 'bg-success/10' : 'bg-success/10'
  if (status === 'CREATED') return isDark.value ? 'bg-white/5' : 'bg-gray-100'
  return 'bg-candy-orange/10'
}

const statusIconColor = (status: string) => {
  if (status === 'COMPLETED') return 'text-success'
  if (status === 'CREATED') return 'text-gray-400'
  return 'text-candy-orange'
}

const statusBadgeClass = (status: string) => {
  if (status === 'COMPLETED') return 'bg-success/10 text-success'
  if (status === 'CREATED') return isDark.value ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
  return 'bg-candy-orange/10 text-candy-orange'
}

const advanceButtonClass = (status: string) =>
  status === 'COMPLETED' ? 'bg-success text-white hover:opacity-90' : 'bg-candy-orange text-white hover:bg-candy-hover'

// ── Data fetching ──────────────────────────────────────────────────────
const refreshQueue = async () => {
  const orgId = auth.user?.org_id
  if (!orgId) return
  queueLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: QueueDoc[]; summary: Record<string, number> }>('/api/tracking/queue', {
      params: { orgId },
    })
    queue.value        = res.data ?? []
    queueSummary.value = res.summary ?? {}
  } catch (err) {
    console.error('[Tracking] queue fetch error:', err)
  } finally {
    queueLoading.value = false
  }
}

const selectDocument = async (doc: QueueDoc) => {
  if (selectedDocId.value === doc.id) return
  selectedDocId.value   = doc.id
  selectedDoc.value     = doc
  timelineData.value    = null
  timelineLoading.value = true

  try {
    const res = await $fetch<{ success: boolean; data: TimelineData }>('/api/tracking/timeline', {
      params: { documentId: doc.id },
    })
    timelineData.value = res.data
  } catch (err) {
    console.error('[Tracking] timeline fetch error:', err)
  } finally {
    timelineLoading.value = false
  }
}

const advanceStatus = async (nextStatus: string) => {
  if (!selectedDocId.value || advancing.value) return
  advancing.value = true
  try {
    await $fetch('/api/tracking/advance', {
      method: 'POST',
      body: { document_id: selectedDocId.value, status: nextStatus },
    })
    // Refresh both queue and selected timeline
    await Promise.all([
      refreshQueue(),
      selectDocument({ ...selectedDoc.value!, tracking_status: nextStatus }),
    ])
  } catch (err: any) {
    console.error('[Tracking] advance error:', err)
    alert(err?.data?.message || 'Failed to advance status')
  } finally {
    advancing.value = false
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await refreshQueue()
})
</script>
