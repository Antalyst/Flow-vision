<template>
  <div class="space-y-6 pb-24 lg:pb-8">

    <!-- ── Page header ────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="mb-3 h-1 w-14 rounded-none bg-candy-orange" />
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="isDark ? 'text-white' : 'text-gray-900'">
          Tracking Operations
        </h1>
        <p class="mt-1 text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
          Live fulfillment pipeline · {{ auth.currentOrg?.name }}
        </p>
      </div>

      <!-- Summary chips -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="chip in statusChips"
          :key="chip.status"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-none border px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:scale-[1.02]"
          :class="statusFilter === chip.status
            ? chip.activeClass
            : (isDark ? 'border-onyx-border bg-white/5 text-gray-400' : 'border-gray-200 bg-white text-gray-500')"
          @click="statusFilter = statusFilter === chip.status ? '' : chip.status"
        >
          <Icon :name="chip.icon" class="h-3.5 w-3.5" />
          <span>{{ chip.label }}</span>
          <span
            class="rounded-none px-1.5 py-0.5 text-[10px]"
            :class="isDark ? 'bg-white/10' : 'bg-black/5'"
          >{{ queueSummary[chip.countKey] ?? 0 }}</span>
        </button>
      </div>
    </div>

    <!-- ── Pipeline KPI row ────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div
        v-for="kpi in kpiCards"
        :key="kpi.label"
        class="flex flex-col gap-1 rounded-none border p-4 transition-all duration-300"
        :class="isDark ? 'border-onyx-border bg-[#1A1A1A]' : 'border-gray-200 bg-white'"
      >
        <div class="flex items-center gap-2 mb-1">
          <span class="flex h-7 w-7 items-center justify-center rounded-none" :class="kpi.iconBg">
            <Icon :name="kpi.icon" class="h-3.5 w-3.5" :class="kpi.iconColor" />
          </span>
          <span class="text-[10px] font-bold uppercase tracking-wider" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            {{ kpi.label }}
          </span>
        </div>
        <p class="text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
          {{ kpi.value }}
        </p>
      </div>
    </div>

    <!-- ── Document queue table ────────────────────────────────────────── -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">

      <!-- Document list (2/3 width) -->
      <section
        class="overflow-hidden rounded-none border transition-all duration-300 lg:col-span-2"
        :class="isDark ? 'border-onyx-border bg-[#1A1A1A]' : 'border-gray-200 bg-white'"
      >
        <!-- Section header -->
        <div
          class="flex items-center justify-between border-b px-6 py-4"
          :class="isDark ? 'border-onyx-border' : 'border-gray-100'"
        >
          <div>
            <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
              In-Flight Documents
            </h2>
            <p class="text-xs mt-0.5" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              {{ filteredQueue.length }} documents{{ statusFilter ? ` · ${STATUS_LABELS[statusFilter]}` : '' }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-none border px-3 py-1.5 text-xs font-semibold transition hover:border-candy-orange hover:text-candy-orange"
            :class="isDark ? 'border-onyx-border text-gray-400' : 'border-gray-200 text-gray-500'"
            @click="refreshQueue"
          >
            <Icon name="ph:arrows-clockwise" class="h-3.5 w-3.5" :class="queueLoading ? 'animate-spin' : ''" />
            Refresh
          </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="queueLoading" class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
          <div
            v-for="n in 5" :key="n"
            class="flex items-center gap-4 px-6 py-4"
          >
            <div class="h-9 w-9 animate-pulse rounded-none" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
            <div class="flex-1 space-y-2">
              <div class="h-3 w-48 animate-pulse rounded-none" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
              <div class="h-2.5 w-32 animate-pulse rounded-none" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
            </div>
          </div>
        </div>

        <!-- Queue rows -->
        <div v-else class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
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
              class="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-none"
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
                  class="flex-shrink-0 rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  :class="statusBadgeClass(doc.tracking_status)"
                >
                  {{ STATUS_LABELS[doc.tracking_status] ?? doc.tracking_status }}
                </span>
              </div>

              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]"
                :class="isDark ? 'text-gray-500' : 'text-gray-400'">
                <span v-if="doc.stage_name" class="flex items-center gap-1">
                  <Icon name="ph:steps-fill" class="h-3 w-3" />
                  {{ doc.stage_name }}
                </span>
                <span v-if="doc.total_steps" class="flex items-center gap-1">
                  <Icon name="ph:map-pin" class="h-3 w-3" />
                  Step {{ doc.current_step }} / {{ doc.total_steps }}
                </span>
                <span v-if="doc.messenger_name" class="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                  <Icon name="ph:motorcycle-fill" class="h-3 w-3" />
                  {{ doc.messenger_name }}
                </span>
              </div>

              <!-- Mini progress bar -->
              <div
                v-if="doc.total_steps"
                class="mt-2 h-1 w-full overflow-hidden rounded-none"
                :class="isDark ? 'bg-white/10' : 'bg-gray-200'"
              >
                <div
                  class="h-full rounded-none transition-all duration-500"
                  :class="doc.tracking_status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-candy-orange'"
                  :style="{ width: `${doc.progress_pct}%` }"
                />
              </div>
            </div>
          </button>

          <!-- Empty state -->
          <div v-if="!filteredQueue.length" class="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Icon name="ph:package-fill" class="h-10 w-10 text-gray-300" />
            <p class="font-semibold" :class="isDark ? 'text-gray-300' : 'text-gray-600'">No documents in this status</p>
            <p class="text-sm" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              {{ statusFilter ? 'Try a different filter or refresh.' : 'All documents are completed or none have been uploaded yet.' }}
            </p>
          </div>
        </div>
      </section>

      <!-- Detail panel (1/3) -->
      <aside
        class="rounded-none border transition-all duration-300"
        :class="isDark ? 'border-onyx-border bg-[#1A1A1A]' : 'border-gray-200 bg-white'"
      >
        <div class="border-b px-5 py-4" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
          <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ selectedDoc ? 'Tracking Timeline' : 'Select a Document' }}
          </h2>
          <p v-if="selectedDoc" class="mt-0.5 truncate text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            {{ selectedDoc.title }}
          </p>
        </div>

        <!-- No selection state -->
        <div
          v-if="!selectedDoc"
          class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
        >
          <Icon name="ph:cursor-click" class="h-10 w-10 text-gray-300" />
          <p class="text-sm" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            Click a document row to view its full tracking timeline.
          </p>
        </div>

        <!-- Timeline loading -->
        <div v-else-if="timelineLoading" class="p-5 space-y-3">
          <div v-for="n in 4" :key="n" class="flex items-center gap-3">
            <div class="h-8 w-8 animate-pulse rounded-none" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3 w-28 animate-pulse rounded-none" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
              <div class="h-2.5 w-20 animate-pulse rounded-none" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <div v-else-if="timelineData" class="p-5 space-y-5">
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
            <p class="text-[10px] font-bold uppercase tracking-widest" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              Advance Status
            </p>
            <button
              v-for="nextStatus in allowedTransitions"
              :key="nextStatus"
              type="button"
              :disabled="advancing"
              class="w-full flex items-center justify-center gap-2 rounded-none px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
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
            class="text-center text-xs font-semibold text-emerald-500"
          >
            ✓ Document delivery completed.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Active Pipeline',
  description: 'Track all in-flight documents across your organization. Monitor active couriers, pending branch deliveries, and real-time transit logistics.'
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
  { status: 'CREATED',           label: 'Registered',  icon: 'ph:file-plus-fill',    countKey: 'created',           activeClass: 'border-gray-400 bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200 dark:border-gray-500' },
  { status: 'PICKED_UP',         label: 'Picked Up',   icon: 'ph:hand-fill',         countKey: 'picked_up',         activeClass: 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' },
  { status: 'IN_TRANSIT',        label: 'In Transit',  icon: 'ph:motorcycle-fill',   countKey: 'in_transit',        activeClass: 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  { status: 'ARRIVED_AT_OFFICE', label: 'Arrived',     icon: 'ph:buildings-fill',    countKey: 'arrived_at_office', activeClass: 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' },
  { status: 'COMPLETED',         label: 'Completed',   icon: 'ph:check-circle-fill', countKey: 'completed',         activeClass: 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
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
  { label: 'Total',      value: queueSummary.value.total ?? 0,              icon: 'ph:files-fill',           iconBg: 'bg-candy-orange/10', iconColor: 'text-candy-orange' },
  { label: 'Registered', value: queueSummary.value.created ?? 0,            icon: 'ph:file-plus-fill',        iconBg: 'bg-gray-500/10',    iconColor: 'text-gray-500' },
  { label: 'In Transit', value: queueSummary.value.in_transit ?? 0,         icon: 'ph:motorcycle-fill',       iconBg: 'bg-amber-500/10',   iconColor: 'text-amber-500' },
  { label: 'Arrived',    value: queueSummary.value.arrived_at_office ?? 0,  icon: 'ph:buildings-fill',        iconBg: 'bg-orange-500/10',  iconColor: 'text-orange-500' },
  { label: 'Completed',  value: queueSummary.value.completed ?? 0,          icon: 'ph:check-circle-fill',     iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
])

const allowedTransitions = computed(() => {
  if (!timelineData.value) return []
  const current = timelineData.value.summary.tracking_status
  return TRANSITIONS[current] ?? []
})

// ── Style helpers ──────────────────────────────────────────────────────
const statusIconBg = (status: string) => {
  const map: Record<string, string> = {
    CREATED:           isDark.value ? 'bg-white/5'          : 'bg-gray-100',
    PICKED_UP:         isDark.value ? 'bg-sky-500/10'       : 'bg-sky-50',
    IN_TRANSIT:        isDark.value ? 'bg-amber-500/10'     : 'bg-amber-50',
    ARRIVED_AT_OFFICE: isDark.value ? 'bg-candy-orange/10'   : 'bg-orange-50',
    COMPLETED:         isDark.value ? 'bg-emerald-500/10'   : 'bg-emerald-50',
  }
  return map[status] ?? (isDark.value ? 'bg-white/5' : 'bg-gray-100')
}

const statusIconColor = (status: string) => ({
  CREATED:           'text-gray-400',
  PICKED_UP:         'text-sky-500',
  IN_TRANSIT:        'text-amber-500',
  ARRIVED_AT_OFFICE: 'text-candy-orange',
  COMPLETED:         'text-emerald-500',
}[status] ?? 'text-gray-400')

const statusBadgeClass = (status: string) => ({
  CREATED:           isDark.value ? 'bg-white/5 text-gray-400'          : 'bg-gray-100 text-gray-500',
  PICKED_UP:         isDark.value ? 'bg-sky-500/10 text-sky-400'        : 'bg-sky-50 text-sky-700',
  IN_TRANSIT:        isDark.value ? 'bg-amber-500/10 text-amber-400'    : 'bg-amber-50 text-amber-700',
  ARRIVED_AT_OFFICE: isDark.value ? 'bg-orange-500/10 text-orange-400'  : 'bg-orange-50 text-orange-700',
  COMPLETED:         isDark.value ? 'bg-emerald-500/10 text-emerald-400': 'bg-emerald-50 text-emerald-700',
}[status] ?? '')

const advanceButtonClass = (status: string) => ({
  PICKED_UP:         'bg-sky-500 text-white hover:bg-sky-600',
  IN_TRANSIT:        'bg-amber-500 text-white hover:bg-amber-600',
  ARRIVED_AT_OFFICE: 'bg-candy-orange text-white hover:bg-orange-600',
  COMPLETED:         'bg-emerald-500 text-white hover:bg-emerald-600',
}[status] ?? 'bg-gray-500 text-white')

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
