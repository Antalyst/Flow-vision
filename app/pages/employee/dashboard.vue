<template>
  <div ref="pageRoot" class="space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight">
          Hello, {{ auth.user?.full_name?.split(' ')[0] || 'Employee' }}
        </h1>
        <p class="mt-1.5 text-sm" :class="mutedText">Here's your workspace at a glance.</p>
      </div>

      <div
        v-if="primaryOfficeLabel"
        class="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm"
        :class="isDark ? 'bg-onyx-card border-onyx-border text-gray-300' : 'bg-white border-gray-200 text-gray-700'"
      >
        <Icon name="ph:buildings-light" class="h-4 w-4 text-candy-orange" />
        <span class="font-semibold">{{ primaryOfficeLabel }}</span>
      </div>
    </div>

    <!-- ── Office Banner ─────────────────────────────────────────────── -->
    <div
      ref="bannerEl"
      class="flex flex-col gap-4 rounded-2xl border px-5 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
      :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
    >
      <p class="text-sm font-semibold">{{ officeBannerText }}</p>
      <NuxtLink
        to="/employee/ai"
        class="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-candy-hover"
      >
        <Icon name="ph:sparkle-light" class="h-4 w-4" />
        Ask AI a Question
      </NuxtLink>
    </div>

    <!-- ── KPI Cards ─────────────────────────────────────────────────── -->
    <div ref="kpiEl" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <NuxtLink
        v-for="card in kpiCards"
        :key="card.label"
        :to="card.to"
        class="group relative rounded-2xl border p-5 transition-colors"
        :class="isDark ? 'bg-onyx-card border-onyx-border hover:bg-onyx-black' : 'bg-white border-gray-200 hover:bg-gray-50'"
      >
        <Icon
          name="ph:arrow-up-right-bold"
          class="absolute right-4 top-4 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100"
          :class="mutedText"
        />
        <Icon :name="card.icon" class="h-7 w-7 text-candy-orange" />
        <p class="mt-4 text-3xl font-bold tracking-tight">
          <span v-if="ledgerLoading" class="inline-block h-8 w-12 rounded-md" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
          <span v-else>{{ card.value }}</span>
        </p>
        <p class="mt-1 text-xs font-medium" :class="mutedText">{{ card.label }}</p>
      </NuxtLink>
    </div>

    <!-- ── Document Forecast Chart ──────────────────────────────────── -->
    <div ref="chartDivEl" class="rounded-2xl border p-5 transition-colors" :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-sm font-bold">Document Activity</h2>
          <p class="mt-0.5 text-xs" :class="mutedText">Documents created in your offices, by day.</p>
        </div>
        <div class="flex flex-none items-center gap-2">
          <label for="forecast-start" class="text-xs font-medium" :class="mutedText">From</label>
          <input
            id="forecast-start"
            v-model="forecastStart"
            type="date"
            :max="forecastEnd"
            class="rounded-lg border px-2.5 py-1.5 text-xs outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
            :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-200 bg-white text-gray-900'"
          />
          <label for="forecast-end" class="text-xs font-medium" :class="mutedText">to</label>
          <input
            id="forecast-end"
            v-model="forecastEnd"
            type="date"
            :min="forecastStart"
            :max="todayStr"
            class="rounded-lg border px-2.5 py-1.5 text-xs outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
            :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-200 bg-white text-gray-900'"
          />
        </div>
      </div>
      <div class="h-64 w-full">
        <Bar v-if="chartData.datasets.length" :data="chartData" :options="chartOptions" :plugins="[barValueLabelPlugin]" ref="chartRef" />
      </div>
    </div>

    <!-- ── Main Two-Column Layout ─────────────────────────────────────── -->
    <div ref="mainGridEl" class="grid grid-cols-1 gap-5 lg:grid-cols-5">

      <!-- ── Left Column: Documents (3/5) ───────────────────────── -->
      <section
        class="rounded-2xl border lg:col-span-3 flex flex-col overflow-hidden transition-colors"
        :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
      >
        <div class="border-b px-6 py-4" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
          <h2 class="text-sm font-bold">My Documents</h2>
          <p class="mt-0.5 text-xs" :class="mutedText">Documents in your office, or uploaded by you.</p>
        </div>

        <!-- Loading skeleton -->
        <Transition name="scope-fade" mode="out-in">
          <div v-if="ledgerLoading" key="loading" class="flex-1 space-y-3 p-5">
            <div v-for="n in 5" :key="n" class="h-16 rounded-2xl" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
          </div>

          <!-- Ledger rows -->
          <div v-else-if="ledger.length" key="rows" class="flex-1 space-y-3 overflow-y-auto p-5">
            <div
              v-for="doc in ledger.slice(0, 12)"
              :key="doc.id"
              class="flex items-center gap-4 rounded-2xl border p-4 transition-colors"
              :class="isDark ? 'border-onyx-border hover:bg-white/[0.025]' : 'border-gray-100 hover:bg-gray-50/80'"
            >
              <span
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                :class="isDark ? 'bg-white/10' : 'bg-gray-100'"
              >
                <Icon name="ph:file-text-light" class="h-5 w-5" :class="isDark ? 'text-gray-300' : 'text-gray-500'" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold" :class="isDark ? 'text-gray-100' : 'text-gray-800'">
                  {{ doc.title || 'Untitled Document' }}
                </p>
                <p class="mt-0.5 text-xs" :class="mutedText">
                  {{ formatDate(doc.created_at) }}<span v-if="doc.is_own_upload"> · you uploaded</span>
                </p>
              </div>
              <span class="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold" :class="docStatusMeta(doc).class">
                {{ docStatusMeta(doc).label }}
              </span>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else key="empty" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-candy-orange/10 border border-candy-orange/20">
              <Icon name="ph:clipboard-text-light" class="h-7 w-7 text-candy-orange/50" />
            </div>
            <p class="font-semibold" :class="isDark ? 'text-gray-300' : 'text-gray-700'">No documents in your office yet.</p>
            <p class="text-xs max-w-[220px]" :class="mutedText">Upload a document from one of your offices to get started.</p>
          </div>
        </Transition>

        <div class="px-6 pb-6 pt-2">
          <NuxtLink
            to="/employee/documents"
            class="inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-semibold text-candy-orange transition-colors hover:bg-candy-orange/10"
            :class="isDark ? 'border-onyx-border' : 'border-gray-200'"
          >
            View All Documents
          </NuxtLink>
        </div>
      </section>

      <!-- ── Right Column (2/5) ──────────────────────────────────────── -->
      <div class="lg:col-span-2 flex flex-col gap-5">

        <!-- My Sub-Offices -->
        <div class="rounded-2xl border p-5 transition-colors" :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'">
          <h2 class="text-sm font-bold">My Sub-Offices</h2>
          <p class="mt-0.5 text-sm" :class="mutedText">Branches registered under you</p>

          <div v-if="officesLoading" class="mt-4 space-y-2">
            <div v-for="n in 2" :key="n" class="h-12 rounded-xl" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
          </div>

          <div v-else-if="myOffices.length" class="mt-4 space-y-2">
            <div
              v-for="office in myOffices.slice(0, 4)"
              :key="office.id"
              class="flex items-center gap-3 rounded-xl border p-3 transition-colors"
              :class="isDark ? 'border-onyx-border hover:bg-white/[0.03]' : 'border-gray-100 hover:bg-gray-50'"
            >
              <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-candy-orange/10">
                <Icon name="ph:buildings-light" class="h-4 w-4 text-candy-orange" />
              </span>
              <p class="truncate text-xs font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                {{ office.name }}
              </p>
            </div>
            <p v-if="myOffices.length > 4" class="text-center text-sm" :class="mutedText">
              +{{ myOffices.length - 4 }} more
            </p>
          </div>

          <div v-else class="mt-4 flex flex-col items-center gap-3 py-6 text-center">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
              <Icon name="ph:buildings-light" class="h-5 w-5" :class="mutedText" />
            </div>
            <p class="text-xs" :class="mutedText">No offices assigned yet.</p>
          </div>
        </div>

        <!-- Assigned Tasks -->
        <div class="flex flex-1 flex-col rounded-2xl border p-5 transition-colors" :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'">
          <h2 class="text-sm font-bold">Assigned Tasks</h2>
          <p class="mt-0.5 text-sm" :class="mutedText">
            <span v-if="queueLoading">Loading…</span>
            <span v-else-if="queueItems.length">{{ queueItems.length }} document{{ queueItems.length !== 1 ? 's' : '' }} need your attention</span>
            <span v-else>Nothing needs your attention right now.</span>
          </p>

          <!-- Loading skeleton -->
          <div v-if="queueLoading" class="mt-4 space-y-2">
            <div v-for="n in 3" :key="n" class="h-14 rounded-xl" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
          </div>

          <!-- Task rows -->
          <div v-else-if="queueItems.length" class="mt-4 flex-1 space-y-2 overflow-y-auto">
            <div
              v-for="doc in queueItems.slice(0, 5)"
              :key="doc.id"
              class="flex items-center gap-3 rounded-xl border p-3 transition-colors"
              :class="isDark ? 'border-onyx-border hover:bg-white/[0.03]' : 'border-gray-100 hover:bg-gray-50'"
            >
              <span
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                :class="isDark ? 'bg-white/10' : 'bg-gray-100'"
              >
                <Icon name="ph:file-text-light" class="h-4 w-4" :class="isDark ? 'text-gray-300' : 'text-gray-500'" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                  {{ doc.title || 'Untitled Document' }}
                </p>
                <p class="mt-0.5 truncate text-xs" :class="mutedText">
                  {{ doc.current_label || doc.stage_name || formatDate(doc.created_at) }}
                </p>
              </div>
              <span class="flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" :class="docStatusMeta(doc).class">
                {{ docStatusMeta(doc).label }}
              </span>
            </div>
          </div>

          <!-- Empty state (all caught up) -->
          <div v-else class="mt-4 flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 border border-success/20">
              <Icon name="ph:check-circle-light" class="h-5 w-5 text-success" />
            </div>
            <p class="text-xs" :class="mutedText">You're all caught up.</p>
          </div>

          <div class="mt-4">
            <NuxtLink
              to="/employee/working"
              class="inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-semibold text-candy-orange transition-colors hover:bg-candy-orange/10"
              :class="isDark ? 'border-onyx-border' : 'border-gray-200'"
            >
              See What's On Your Desk
            </NuxtLink>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { gsap } from 'gsap'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import { useChartTheme } from '~/composables/useChartTheme'
import { useInboundDispatchRealtime } from '~/composables/useInboundDispatchRealtime'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

definePageMeta({ layout: 'employee' })

const auth = useAuthStore()
const { isDark } = useTheme()
const { candy, buildCartesianScales, buildTooltipPlugin, watchChartTheme } = useChartTheme()

// ── Types ──────────────────────────────────────────────────────────────
interface LedgerDoc {
  id: string
  title: string | null
  status: string | null
  tracking_status?: string | null
  office_id?: string | null
  office_label?: string | null
  origin_label?: string | null
  current_label?: string | null
  stage_name?: string | null
  is_own_upload: boolean
  created_at: string
}

interface OfficeRecord {
  id: string | number
  name: string
  code?: string
}

// ── Data state ─────────────────────────────────────────────────────────
const ledger         = ref<LedgerDoc[]>([])
const ledgerLoading  = ref(false)
const myOffices      = ref<OfficeRecord[]>([])
const officesLoading = ref(false)
const queueItems     = ref<LedgerDoc[]>([])
const queueLoading   = ref(false)

// ── Inbound Dispatch Realtime Subscription (ASN) ───────────────────────
const myOfficeIds = computed(() => myOffices.value.map((o) => o.id))
const orgIdComputed = computed(() => (auth.user?.org_id ? String(auth.user.org_id) : null))
useInboundDispatchRealtime(orgIdComputed, myOfficeIds, (dispatch) => {
  console.log('[Dashboard] Inbound dispatch alert received via Realtime:', dispatch)
  fetchLedger()
  fetchQueue()
  fetchPredictiveData()
})

const predictiveData = ref<{ labels: string[]; values: number[] }>({ labels: [], values: [] })

// ── Document Activity date-range filter ─────────────────────────────────
const todayStr = new Date().toISOString().slice(0, 10)
const defaultStartDate = new Date()
defaultStartDate.setDate(defaultStartDate.getDate() - 6)
const forecastStart = ref<string>(defaultStartDate.toISOString().slice(0, 10))
const forecastEnd   = ref<string>(todayStr)

watch([forecastStart, forecastEnd], () => fetchPredictiveData())

// ── Document Activity Chart (bar) ───────────────────────────────────────
const chartRef = ref(null)

watchChartTheme(() => chartRef.value?.chart)

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { ...buildTooltipPlugin() },
  },
  scales: buildCartesianScales(),
  elements: {
    bar: { borderRadius: 8 },
  },
}))

const chartData = computed(() => {
  const labels = predictiveData.value.labels.map((iso) =>
    new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${iso}T00:00:00`))
  )

  return {
    labels,
    datasets: [
      {
        label: 'Documents',
        data: predictiveData.value.values,
        backgroundColor: candy.primary,
        maxBarThickness: 48,
      },
    ],
  }
})

// Draws the value above each bar, matching the design's on-bar labels.
const barValueLabelPlugin = {
  id: 'barValueLabel',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart
    ctx.save()
    ctx.font = '600 12px Geist, sans-serif'
    ctx.fillStyle = isDark.value ? '#FFFFFF' : '#121212'
    ctx.textAlign = 'center'
    chart.data.datasets.forEach((dataset: any, i: number) => {
      const meta = chart.getDatasetMeta(i)
      meta.data.forEach((bar: any, index: number) => {
        const value = dataset.data[index]
        if (value === null || value === undefined) return
        ctx.fillText(String(value), bar.x, bar.y - 6)
      })
    })
    ctx.restore()
  },
}

// ── GSAP refs ──────────────────────────────────────────────────────────
const pageRoot  = ref<HTMLElement | null>(null)
const headerEl  = ref<HTMLElement | null>(null)
const bannerEl  = ref<HTMLElement | null>(null)
const kpiEl     = ref<HTMLElement | null>(null)
const mainGridEl = ref<HTMLElement | null>(null)
const chartDivEl = ref<HTMLElement | null>(null)

// ── Theming ────────────────────────────────────────────────────────────
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

// ── Office labels (real data) ───────────────────────────────────────────
const primaryOfficeLabel = computed(() => {
  if (myOffices.value.length === 1) return myOffices.value[0].name
  if (myOffices.value.length > 1) return `${myOffices.value.length} Offices`
  return auth.currentOrg?.name ?? ''
})

const officeBannerText = computed(() => {
  if (myOffices.value.length === 0) return 'Showing documents from your account.'
  if (myOffices.value.length === 1) return `Showing documents from your office — ${myOffices.value[0].name}.`
  return `Showing documents from your ${myOffices.value.length} offices — ${myOffices.value.map((o) => o.name).join(', ')}.`
})

// ── Computed KPI cards (data-driven, real ledger data) ──────────────────
const kpiCards = computed(() => {
  const own     = ledger.value.filter((d) => d.is_own_upload).length
  const waiting = ledger.value.filter((d) => !d.tracking_status || d.tracking_status === 'CREATED').length
  const moving  = ledger.value.filter((d) => d.tracking_status === 'IN_TRANSIT').length

// ── Computed KPI cards (scope-aware, data-driven) ──────────────────────
const kpiCards = computed(() => {
  if (currentScope.value === 'LOCAL') {
    const own     = ledger.value.filter((d) => d.is_own_upload).length
    const pending = ledger.value.filter((d) => (d.status ?? '').toLowerCase() === 'pending').length
    const transit = ledger.value.filter((d) => d.tracking_status === 'IN_TRANSIT').length
    return [
      {
        label: 'Office Docs', value: String(ledger.value.length),
        trend: 'in your offices', trendColor: 'text-candy-orange',
        icon: 'ph:files-light', iconColor: 'text-candy-orange',
      },
      {
        label: 'My Uploads', value: String(own),
        trend: 'uploaded by you', trendColor: mutedText.value,
        icon: 'ph:upload-simple-light', iconColor: 'text-emerald-500',
      },
      {
        label: 'Pending', value: String(pending),
        trend: 'awaiting action', trendColor: pending > 0 ? 'text-amber-500' : mutedText.value,
        icon: 'ph:clock-countdown-light', iconColor: 'text-amber-500',
      },
      {
        label: 'On the Way', value: String(transit),
        trend: 'currently moving', trendColor: transit > 0 ? 'text-blue-400' : mutedText.value,
        icon: 'ph:package-light', iconColor: 'text-blue-400',
      },
    ]
  }

  // GLOBAL view
  const { total, in_transit, arrived_at_office, completed } = queueSummary.value
  return [
    {
      label: 'Total Org Docs', value: String(total),
      trend: 'across organisation', trendColor: 'text-candy-orange',
      icon: 'ph:files-light', iconColor: 'text-candy-orange',
    },
    {
      label: 'On the Way', value: String(in_transit),
      trend: 'with messengers', trendColor: in_transit > 0 ? 'text-blue-400' : mutedText.value,
      icon: 'ph:truck-light', iconColor: 'text-blue-400',
    },
    {
      label: 'Received by Office', value: String(arrived_at_office),
      trend: 'awaiting next step', trendColor: arrived_at_office > 0 ? 'text-teal-500' : mutedText.value,
      icon: 'ph:buildings-light', iconColor: 'text-teal-500',
    },
    {
      label: 'Completed', value: String(completed),
      trend: 'fully delivered', trendColor: completed > 0 ? 'text-emerald-500' : mutedText.value,
      icon: 'ph:check-circle-light', iconColor: 'text-emerald-500',
    },
  ]
})

// Pipeline chips for GLOBAL view
const pipelineChips = computed(() => [
  { label: 'Created',   count: queueSummary.value.created,           dot: 'bg-candy-orange' },
  { label: 'Picked Up', count: queueSummary.value.picked_up,         dot: 'bg-purple-400' },
  { label: 'On the Way',count: queueSummary.value.in_transit,        dot: 'bg-blue-400' },
  { label: 'Received by Office', count: queueSummary.value.arrived_at_office, dot: 'bg-teal-400' },
  { label: 'Completed', count: queueSummary.value.completed,         dot: 'bg-emerald-400' },
])

// Queue stats list for right panel
const queueStats = computed(() => [
  { label: 'Created — awaiting pickup',     count: queueSummary.value.created,           dot: 'bg-candy-orange' },
  { label: 'Picked Up',                     count: queueSummary.value.picked_up,         dot: 'bg-purple-400' },
  { label: 'On the Way',                    count: queueSummary.value.in_transit,        dot: 'bg-blue-400' },
  { label: 'Arrived at Office',             count: queueSummary.value.arrived_at_office, dot: 'bg-teal-400' },
  { label: 'Completed',                     count: queueSummary.value.completed,         dot: 'bg-emerald-400' },
])

  return [
    { label: 'Documents in Your Office', value: String(ledger.value.length), icon: 'ph:buildings-light',       to: '/employee/documents' },
    { label: 'Uploaded by You',          value: String(own),                 icon: 'ph:upload-simple-light',   to: '/employee/documents?office=own' },
    { label: 'Waiting for Pickup',       value: String(waiting),             icon: 'ph:clock-countdown-light', to: '/employee/documents?tracking=CREATED' },
    { label: 'Currently Moving',         value: String(moving),              icon: 'ph:truck-light',           to: '/employee/documents?tracking=IN_TRANSIT' },
  ]
})

// ── Helpers ────────────────────────────────────────────────────────────
const formatDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value))
    : '—'

// Single status pill per document — 3-tier language: gray (n/a here), orange (in progress), green (done).
const docStatusMeta = (doc: LedgerDoc) => {
  const status = (doc.status ?? '').toLowerCase()
  if (status === 'rejected') return { label: 'Rejected', class: 'bg-danger/10 text-danger' }
  if (status === 'approved') return { label: 'Approved', class: 'bg-success/10 text-success' }
  if (doc.tracking_status === 'COMPLETED') return { label: 'Completed', class: 'bg-success/10 text-success' }
  if (!doc.tracking_status || doc.tracking_status === 'CREATED') return { label: 'Waiting', class: 'bg-candy-orange/10 text-candy-orange' }
  return { label: 'On the Way', class: 'bg-candy-orange/10 text-candy-orange' }
}

// ── Data fetching ──────────────────────────────────────────────────────
const fetchLedger = async () => {
  ledgerLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: LedgerDoc[] }>('/api/employee/ledger', {
      params: { scope: 'LOCAL', limit: 30 },
    })
    ledger.value = res.data ?? []
  } catch (err) {
    console.error('[EmployeeDashboard] ledger fetch error:', err)
  } finally {
    ledgerLoading.value = false
  }
}

const fetchOffices = async () => {
  const orgId  = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return

  officesLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: OfficeRecord[] }>('/api/employee/my-offices', {
      params: { orgId, userId },
    })
    myOffices.value = res.data ?? []
  } catch (err) {
    console.error('[EmployeeDashboard] offices fetch error:', err)
  } finally {
    officesLoading.value = false
  }
}

const fetchPredictiveData = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: { labels: string[]; values: number[] } }>('/api/employee/predictive-workload', {
      params: { start: forecastStart.value, end: forecastEnd.value }
    })
    if (res.data) {
      predictiveData.value = res.data
    }
  } catch (err) {
    console.error('[EmployeeDashboard] predictive fetch error:', err)
  }
}

// Active work items across the employee's offices — same feed /employee/working uses,
// filtered to non-completed statuses so this card only shows what still needs action.
const fetchQueue = async () => {
  queueLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: LedgerDoc[] }>('/api/tracking/queue', {
      params: { scope: 'LOCAL', status: 'CREATED,PICKED_UP,IN_TRANSIT,ARRIVED_AT_OFFICE', limit: 50 },
    })
    queueItems.value = res.data ?? []
  } catch (err) {
    console.error('[EmployeeDashboard] queue fetch error:', err)
  } finally {
    queueLoading.value = false
  }
}

// ── GSAP Entrance Animation ────────────────────────────────────────────
const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  if (headerEl.value) {
    tl.fromTo(headerEl.value,
      { opacity: 0, y: -18 },
      { opacity: 1, y: 0, duration: 0.5 },
      0
    )
  }
  if (bannerEl.value) {
    tl.fromTo(bannerEl.value,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.45 },
      0.12
    )
  }
  if (kpiEl.value) {
    const cards = kpiEl.value.querySelectorAll(':scope > div')
    tl.fromTo(cards,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.07 },
      0.22
    )
  }
  if (chartDivEl.value) {
    tl.fromTo(chartDivEl.value,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 },
      0.30
    )
  }
  if (mainGridEl.value) {
    const sections = mainGridEl.value.querySelectorAll(':scope > *')
    tl.fromTo(sections,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 },
      0.38
    )
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────
onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  runEntranceAnimation()
  await Promise.all([fetchLedger(), fetchOffices(), fetchQueue(), fetchPredictiveData()])
})
</script>

<style scoped>
.scope-fade-enter-active { transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16,1,0.3,1); }
.scope-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.scope-fade-enter-from   { opacity: 0; transform: translateY(6px); }
.scope-fade-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
