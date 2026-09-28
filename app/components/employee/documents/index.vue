<template>
  <section
    class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8"
    :class="isDark ? 'text-white' : 'text-gray-900'"
  >

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- A. Header + Scope Toggle                                          -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <!-- Title -->
      <div>
        <div class="mb-3 h-1 w-14 rounded-full bg-candy-orange" />
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Documents</h1>
        <p class="mt-1 text-sm" :class="mutedText">
          {{ props.ledgerScope === 'GLOBAL' ? 'Every document across your organization.' : 'Documents from the offices assigned to you.' }}
        </p>
      </div>

      <!-- Right: upload button -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Scan QR Button -->
        <NuxtLink
          :to="props.scanBasePath"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white dark:bg-onyx-card border px-4 py-2 text-sm font-semibold transition duration-200 hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange"
          :class="isDark ? 'border-onyx-border text-white' : 'border-gray-200 text-onyx-black'"
        >
          <Icon name="ph:qr-code-bold" class="h-4 w-4" />
          Scan QR
        </NuxtLink>

        <!-- Scan Physical Document -->
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-none bg-white dark:bg-onyx-card border px-4 py-2 text-sm font-semibold transition duration-200 hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange"
          :class="isDark ? 'border-onyx-border text-white' : 'border-gray-200 text-onyx-black'"
          @click="isScannerOpen = true"
        >
          <Icon name="ph:camera-fill" class="h-4 w-4 text-candy-orange" />
          Scan Physical Document
        </button>

        <!-- Upload -->
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-candy-hover active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange"
          @click="isUploadOpen = true"
        >
          <Icon name="ph:upload-simple-bold" class="h-4 w-4" />
          Upload Document
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- C. KPI Cards                                                      -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <button
          v-for="(card, i) in kpiCards"
          :key="card.label"
          type="button"
          class="flex items-start gap-4 rounded-2xl border p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-candy-orange/40 focus:outline-none focus:ring-2 focus:ring-candy-orange"
          :class="[
            isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure',
            card.isActive ? 'ring-1 ring-inset ring-candy-orange border-candy-orange/40' : '',
          ]"
          :style="{ transitionDelay: `${i * 40}ms` }"
          @click="applyKpiFilter(card)"
        >
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" :class="card.iconBg">
            <Icon :name="card.icon" class="h-5 w-5" :class="card.iconColor" />
          </span>
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-wider" :class="mutedText">{{ card.label }}</p>
            <p class="mt-1 text-2xl font-bold">
              <span v-if="loading" class="inline-block h-6 w-12 animate-pulse rounded-md" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
              <span v-else>{{ card.value }}</span>
            </p>
            <p class="mt-0.5 text-xs" :class="card.trendColor">{{ card.trend }}</p>
          </div>
        </button>
      </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- D. Filter & Search Bar                                            -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          @click="isSemanticSearchOpen = true"
          class="flex flex-1 items-center justify-between gap-2 rounded-xl border px-4 py-2.5 shadow-card transition-all text-left"
          :class="isDark ? 'border-onyx-border bg-onyx-card hover:border-candy-orange' : 'border-gray-200 bg-white-pure hover:border-candy-orange'"
        >
          <span class="flex items-center gap-2" :class="mutedText">
            <Icon name="ph:sparkle-fill" class="h-4 w-4 text-candy-orange" />
            Describe your intent...
          </span>
          <span class="rounded-full bg-gray-200 dark:bg-white/10 px-2 py-0.5 text-xs font-bold text-gray-500 dark:text-gray-400 hidden sm:block">⌘K</span>
        </button>

        <!-- Office filter -->
        <select
          v-model="officeFilter"
          class="rounded-xl border px-3 py-2.5 text-sm shadow-card outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange sm:w-56"
          :class="inputClass"
        >
          <option value="all">All My Offices</option>
          <option value="own">My Uploads Only</option>
          <option v-for="o in myOffices" :key="o.id" :value="String(o.id)">{{ o.name }}</option>
        </select>

        <!-- Tracking filter -->
        <select
          v-model="trackingFilter"
          class="rounded-xl border px-3 py-2.5 text-sm shadow-card outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange sm:w-44"
          :class="inputClass"
        >
          <option value="all">All Tracking</option>
          <option value="CREATED">Registered</option>
          <option value="PICKED_UP">Picked Up</option>
          <option value="IN_TRANSIT">On the Way</option>
          <option value="ARRIVED_AT_OFFICE">Received by Office</option>
          <option value="DISCREPANCY_REPORTED">Issue Reported</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <!-- Status quick filter pills -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="s in statusPills"
          :key="s.value"
          type="button"
          class="rounded-full px-4 py-2 text-sm font-semibold shadow-card transition-colors"
          :class="statusFilter === s.value
            ? 'bg-candy-orange text-white'
            : isDark ? 'bg-onyx-card text-gray-300 hover:text-white' : 'bg-white-pure text-gray-600 hover:text-gray-900'"
          @click="statusFilter = s.value"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <!-- Active Semantic Search Indicator -->
    <div v-if="semanticResults" class="flex items-center gap-3 bg-candy-orange/10 border border-candy-orange/20 rounded-xl p-3 text-sm animate-fade-in shadow-sm">
      <Icon name="ph:sparkle-fill" class="h-5 w-5 text-candy-orange" />
      <span :class="isDark ? 'text-candy-orange/90' : 'text-candy-hover'">
        Showing <strong>{{ filtered.length }}</strong> results for "<span class="italic">{{ semanticQuery }}</span>"
      </span>
      <button @click="semanticResults = null" class="ml-auto text-candy-orange hover:text-candy-hover font-medium text-xs bg-white dark:bg-candy-orange/20 px-3 py-1.5 rounded-full border border-candy-orange/30 transition-colors">
        Clear Filter
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- E. Documents List                                                 -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div>
      <div class="flex items-center justify-between px-1">
        <h2 class="text-base font-bold">Office Documents</h2>
        <p class="text-xs" :class="mutedText">
          {{ filtered.length }} document{{ filtered.length === 1 ? '' : 's' }} found
        </p>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="mt-3 space-y-3">
        <div
          v-for="n in 5" :key="n"
          class="rounded-2xl border p-4 shadow-card"
          :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure'"
        >
          <div class="h-4 w-48 animate-pulse rounded-md" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
          <div class="mt-2 h-3 w-32 animate-pulse rounded-md" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
        </div>
      </div>

      <!-- Cards -->
      <div v-else-if="filtered.length" class="mt-3 space-y-3">
        <div
          v-for="doc in filtered"
          :key="doc.id"
          class="cursor-pointer rounded-2xl border p-4 shadow-card transition-colors duration-150"
          :class="[
            isDark ? 'border-onyx-border bg-onyx-card hover:border-candy-orange/30' : 'border-gray-200 bg-white-pure hover:border-candy-orange/30',
            activeDocument?.id === doc.id ? 'ring-1 ring-inset ring-candy-orange/30' : '',
          ]"
          @click="openDocumentPreview(doc)"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <!-- Title + desc -->
            <div class="flex min-w-0 flex-1 items-start gap-2">
              <div
                v-if="doc.is_own_upload"
                class="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-candy-orange/15"
                title="Your upload"
              >
                <Icon name="ph:user-fill" class="h-2.5 w-2.5 text-candy-orange" />
              </div>
              <Icon v-else name="ph:file-text-light" class="mt-0.5 h-5 w-5 flex-none text-gray-400" />
              <div class="min-w-0">
                <p class="font-semibold">{{ doc.title }}</p>
                <p class="mt-0.5 line-clamp-1 text-xs" :class="mutedText">
                  {{ doc.description || '—' }}
                </p>
              </div>
            </div>

            <!-- Status + tracking badges -->
            <div class="flex flex-none flex-col items-end gap-1.5">
              <span
                class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                :class="statusClass(doc.status)"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-current" :class="doc.status === 'Pending' ? 'animate-pulse' : ''" />
                {{ doc.status || 'Pending' }}
              </span>
              <span
                class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                :class="trackingClass(doc.tracking_status)"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-current" :class="doc.tracking_status === 'IN_TRANSIT' ? 'animate-pulse' : ''" />
                {{ trackingLabel(doc.tracking_status) }}
              </span>
            </div>
          </div>

          <div v-if="getSemanticExplanation(doc.id)" class="mt-3 flex items-start gap-2 rounded-lg border border-candy-orange/20 bg-candy-orange/10 p-2.5 text-xs font-medium text-candy-hover dark:text-candy-orange/90">
            <Icon name="ph:sparkle-fill" class="h-4 w-4 shrink-0 mt-0.5 text-candy-orange" />
            <span class="leading-relaxed">{{ getSemanticExplanation(doc.id) }}</span>
          </div>

          <!-- Meta row -->
          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold"
              :class="isDark ? 'border-onyx-border bg-onyx-black/40 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'"
            >
              <Icon name="ph:buildings-fill" class="h-3 w-3 text-candy-orange" />
              {{ formatOfficeName(doc.office_label || doc.current_label) || 'Unassigned' }}
            </span>
            <span v-if="formatOfficeName(doc.origin_label) !== '—'" :class="mutedText">
              from {{ formatOfficeName(doc.origin_label) }}
            </span>
            <span
              class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold"
              :class="doc.is_own_upload
                ? 'bg-candy-orange/10 text-candy-orange border-candy-orange/20'
                : isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'"
            >
              {{ doc.is_own_upload ? 'My Upload' : 'Routed In' }}
            </span>
            <span class="ml-auto" :class="mutedText">{{ fmtDate(doc.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else
        class="mt-3 rounded-2xl border p-16 text-center shadow-card"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure'"
      >
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-candy-orange/10">
          <Icon name="ph:file-dashed" class="h-8 w-8 text-candy-orange" />
        </div>
        <p class="font-bold">No documents found.</p>
        <p class="mt-1 text-xs" :class="mutedText">
          Upload a document from your office or adjust your search filters.
        </p>
        <button
          type="button"
          class="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-candy-hover active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange"
          @click="isUploadOpen = true"
        >
          <Icon name="ph:upload-simple-bold" class="h-4 w-4" />
          Upload Document
        </button>
      </div>
    </div>

    <!-- Document preview drawer -->
    <DocumentPreviewDrawer
      :is-open="!!activeDocument"
      :document="activeDocument"
      show-compliance-actions
      show-completion-actions
      pipeline-messaging-enabled
      :messaging-offices="myOffices"
      width-class="lg:w-[60%] lg:max-w-4xl"
      :office-resolver="resolveOfficeName"
      @close="closeDocumentPreview"
      @flag-issue="issueChatRef?.openReportForm()"
      @compliance-updated="handleIssueUpdated"
      @liaison-assigned="handleLiaisonAssigned"
      @deleted="handleDocumentDeleted"
    >
      <template #footer>
        <DocumentIssueChatPanel
          v-if="activeDocument"
          ref="issueChatRef"
          :document="activeDocument"
          :offices="myOffices"
          @updated="handleIssueUpdated"
        />
      </template>
    </DocumentPreviewDrawer>

    <!-- Upload modal -->
    <EmployeeDocUploadModal
      :is-open="isUploadOpen"
      :offices="myOffices"
      scope="LOCAL"
      @close="isUploadOpen = false"
      @uploaded="handleUploadSuccess"
    />

    <!-- Scan Physical Document modal -->
    <DocumentScannerModal
      :is-open="isScannerOpen"
      :role="scannerRole"
      @close="isScannerOpen = false"
      @registered="handleUploadSuccess"
    />

    <!-- Semantic Search Modal -->
    <SemanticSearchModal
      :is-open="isSemanticSearchOpen"
      :documents="docs"
      @close="isSemanticSearchOpen = false"
      @results="handleSemanticResults"
    />

  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useStageStore } from '~/stores/stage'
import EmployeeDocUploadModal from './EmployeeDocUploadModal.vue'
import DocumentPreviewDrawer from '~/components/documents/DocumentPreviewDrawer.vue'
import DocumentScannerModal from '~/components/documents/DocumentScannerModal.vue'
import DocumentIssueChatPanel from './DocumentIssueChatPanel.vue'
import SemanticSearchModal from '~/components/client/documents/SemanticSearchModal.vue'

// ── Types ─────────────────────────────────────────────────────────────
type Scope = 'LOCAL' | 'GLOBAL'

interface LedgerDoc {
  id: string
  title: string
  description?: string
  status: string
  tracking_status?: string
  qr_code_data?: string
  office_id?: string
  stage_id?: string | number
  origin_office_id?: string
  current_office_id?: string
  created_at: string
  user_id: string
  office_label?: string
  origin_label?: string
  current_label?: string
  is_own_upload: boolean
  priority?: string
  uploader_name?: string | null
  assigned_messenger_id?: string | null
  messenger_name?: string | null
  current_desk_id?: string | null
  current_handler_id?: string | null
  checkpoint_cleared_step?: number | null
  current_step?: number
}

interface OfficeRecord { id: string; name: string; code?: string }

// ── Props ─────────────────────────────────────────────────────────────
// Lets the Staff portal reuse this exact view (org-wide ledger, own scan page)
// without duplicating 600+ lines — same pattern as LiaisonDeliveriesBoard's
// scanBasePath prop.
const props = withDefaults(defineProps<{
  scanBasePath?: string
  ledgerScope?: Scope
}>(), {
  scanBasePath: '/employee/scan',
  ledgerScope: 'LOCAL',
})

// ── Stores & composables ──────────────────────────────────────────────
const auth       = useAuthStore()
const route      = useRoute()
const router     = useRouter()
const stageStore = useStageStore()
const { isDark } = useTheme()

// ── Reactive state ────────────────────────────────────────────────────
const docs          = ref<LedgerDoc[]>([])
const myOffices     = ref<OfficeRecord[]>([])
const loading       = ref(false)
const isUploadOpen  = ref(false)
const isScannerOpen = ref(false)
// Employees own their sub-office directly; sub-users are assigned to one —
// DocumentScannerModal handles the office-resolution difference internally.
const scannerRole = computed<'employee' | 'employee_sub_user'>(() =>
  auth.user?.role === 'employee_sub_user' ? 'employee_sub_user' : 'employee',
)
const activeDocument = ref<LedgerDoc | null>(null)
const issueChatRef   = ref<InstanceType<typeof DocumentIssueChatPanel> | null>(null)
// Pre-filter from a deep link (e.g. the dashboard's KPI cards): ?office=own, ?tracking=IN_TRANSIT
const officeFilter  = ref<string>(String(route.query.office ?? 'all'))
const statusFilter  = ref<string>('all')
const trackingFilter = ref<string>(String(route.query.tracking ?? 'all'))

const isSemanticSearchOpen = ref(false)
const semanticResults = ref<{ id: string, explanation: string }[] | null>(null)
const semanticQuery = ref('')

function handleSemanticResults(results: any[], query: string) {
  semanticResults.value = results
  semanticQuery.value = query
}

function getSemanticExplanation(docId: string | number) {
  if (!semanticResults.value) return null
  const match = semanticResults.value.find(r => String(r.id) === String(docId))
  return match ? match.explanation : null
}

// ── Theming ───────────────────────────────────────────────────────────
const mutedText    = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass   = computed(() =>
  isDark.value
    ? 'border-white/10 bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

// ── Status quick filter pills ──────────────────────────────────────────
const statusPills = [
  { value: 'all', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Processing', label: 'Processing' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
]

// ── KPI cards ─────────────────────────────────────────────────────────
// Each card carries the filter state it represents so clicking it can
// drive the same office/tracking filters used by the dashboard deep links.
const kpiCards = computed(() => [
  {
    label: 'Total Docs',
    value: docs.value.length,
    icon: 'ph:files-fill',
    iconBg: 'bg-candy-orange/10',
    iconColor: 'text-candy-orange',
    trend: 'In your offices',
    trendColor: 'text-candy-orange',
    office: 'all',
    tracking: 'all',
    isActive: officeFilter.value === 'all' && trackingFilter.value === 'all',
  },
  {
    label: 'My Uploads',
    value: docs.value.filter((d) => d.is_own_upload).length,
    icon: 'ph:user-fill',
    iconBg: 'bg-candy-orange/10',
    iconColor: 'text-candy-orange',
    trend: 'Registered by you',
    trendColor: isDark.value ? 'text-gray-400' : 'text-white-muted',
    office: 'own',
    tracking: 'all',
    isActive: officeFilter.value === 'own',
  },
  {
    label: 'On the Way',
    value: docs.value.filter((d) => d.tracking_status === 'IN_TRANSIT').length,
    icon: 'ph:van-fill',
    iconBg: 'bg-candy-orange/10',
    iconColor: 'text-candy-orange',
    trend: 'Moving now',
    trendColor: 'text-candy-orange',
    office: 'all',
    tracking: 'IN_TRANSIT',
    isActive: officeFilter.value === 'all' && trackingFilter.value === 'IN_TRANSIT',
  },
  {
    label: 'Completed',
    value: docs.value.filter((d) => d.tracking_status === 'COMPLETED').length,
    icon: 'ph:check-circle-fill',
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    trend: 'Fully delivered',
    trendColor: 'text-success',
    office: 'all',
    tracking: 'COMPLETED',
    isActive: officeFilter.value === 'all' && trackingFilter.value === 'COMPLETED',
  },
])

const applyKpiFilter = (card: { office: string; tracking: string }) => {
  officeFilter.value = card.office
  trackingFilter.value = card.tracking
  router.replace({ query: { ...route.query, office: card.office, tracking: card.tracking } })
}

// ── Filtered docs ─────────────────────────────────────────────────────
const filtered = computed(() => {
  return docs.value.filter((doc) => {
    if (officeFilter.value === 'own' && !doc.is_own_upload) return false
    if (officeFilter.value !== 'all' && officeFilter.value !== 'own') {
      const docOff = String(doc.office_id ?? doc.current_office_id ?? '')
      const ori    = String(doc.origin_office_id ?? '')
      if (docOff !== officeFilter.value && ori !== officeFilter.value) return false
    }
    if (statusFilter.value !== 'all' && doc.status !== statusFilter.value) return false
    if (trackingFilter.value !== 'all' && (doc.tracking_status || 'CREATED') !== trackingFilter.value) return false
    
    if (semanticResults.value) {
      if (!semanticResults.value.some(r => String(r.id) === String(doc.id))) return false
    }

    return true
  })
})

const resolveOfficeName = (officeId: string | number | null | undefined) => {
  if (officeId == null) return 'Unknown Office'
  const found = myOffices.value.find((o) => String(o.id) === String(officeId))
  return found?.name || `Office ${String(officeId).slice(0, 6)}`
}

const formatOfficeName = (val?: string) => {
  if (!val) return '—'
  return val.replace(/\s*\(OFF-[A-Z0-9]+\)\s*/i, '').trim()
}

// ── Badge helpers ─────────────────────────────────────────────────────
const statusClass = (s: string) => {
  switch ((s || 'Pending').toLowerCase()) {
    case 'approved':   return 'text-success border-success/30 bg-success/10'
    case 'rejected':   return 'text-danger border-danger/30 bg-danger/10'
    case 'processing':
    case 'in review':  return 'text-candy-orange border-candy-orange/30 bg-candy-orange/10'
    case 'pending':
    default:           return 'text-warning border-warning/30 bg-warning/10'
  }
}

const trackingClass = (s?: string) => {
  switch (s) {
    case 'COMPLETED':         return 'text-success border-success/30 bg-success/10'
    case 'IN_TRANSIT':
    case 'PICKED_UP':
    case 'ARRIVED_AT_OFFICE': return 'text-candy-orange border-candy-orange/30 bg-candy-orange/10'
    case 'DISCREPANCY_REPORTED': return 'text-danger border-danger/30 bg-danger/10'
    default:                  return (isDark.value ? 'text-gray-400 border-white/10 bg-white/5' : 'text-gray-500 border-gray-200 bg-gray-100')
  }
}

const trackingLabel = (s?: string) => {
  switch (s) {
    case 'COMPLETED':         return 'Completed'
    case 'IN_TRANSIT':        return 'On the Way'
    case 'PICKED_UP':         return 'Picked Up'
    case 'ARRIVED_AT_OFFICE': return 'Received by Office'
    case 'DISCREPANCY_REPORTED': return 'Issue Reported'
    default:                  return 'Registered'
  }
}

const fmtDate = (v?: string) => {
  if (!v) return '-'
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(v))
}

// ── Detail drawer open ────────────────────────────────────────────────
const openDocumentPreview = (doc: LedgerDoc) => {
  activeDocument.value = doc
  router.replace({ query: { ...route.query, document: doc.id } })
}

const closeDocumentPreview = () => {
  activeDocument.value = null
  const query = { ...route.query }
  delete query.document
  router.replace({ query })
}

const handleDocumentDeleted = (documentId: string) => {
  docs.value = docs.value.filter((d) => d.id !== documentId)
}

const openDocumentFromQuery = async () => {
  const documentId = String(route.query.document ?? '').trim()
  if (!documentId) return

  const existing = docs.value.find((d) => String(d.id) === documentId)
  if (existing) {
    activeDocument.value = existing
    return
  }

  if (!docs.value.length) await fetchDocs()
  const match = docs.value.find((d) => String(d.id) === documentId)
  if (match) {
    activeDocument.value = match
  }
}

// ── Data fetching ─────────────────────────────────────────────────────
const fetchDocs = async () => {
  const orgId  = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: LedgerDoc[] }>('/api/employee/ledger', {
      params: { orgId, userId, scope: props.ledgerScope, limit: 200 },
    })
    docs.value = res.data ?? []
  } catch (err) {
    console.error('[EmployeeDocs] fetchDocs:', err)
  } finally {
    loading.value = false
  }
}

const fetchMyOffices = async () => {
  const orgId  = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return
  try {
    const res = await $fetch<{ success: boolean; data: OfficeRecord[] }>('/api/employee/my-offices', {
      params: { orgId, userId },
    })
    myOffices.value = res.data ?? []
  } catch { /* silent */ }
}

const reloadData = () => {
  fetchDocs()
}

const handleUploadSuccess = () => {
  isUploadOpen.value = false
  fetchDocs()
}

// Patch the already-open drawer + list row immediately with the new
// assignment, instead of only kicking off a background refetch — a full
// fetchDocs() replaces `docs.value` with new object references, but never
// touched `activeDocument`, so the drawer kept showing the pre-assignment
// (stale) document until it was closed and reopened.
const handleLiaisonAssigned = (payload: { document_id: string; liaison_user_id: string; liaison_name: string | null }) => {
  if (activeDocument.value && activeDocument.value.id === payload.document_id) {
    activeDocument.value = {
      ...activeDocument.value,
      assigned_messenger_id: payload.liaison_user_id,
      messenger_name: payload.liaison_name,
    }
  }
  const idx = docs.value.findIndex((d) => d.id === payload.document_id)
  if (idx !== -1) {
    docs.value[idx] = {
      ...docs.value[idx],
      assigned_messenger_id: payload.liaison_user_id,
      messenger_name: payload.liaison_name,
    }
  }
  fetchDocs()
}

const handleIssueUpdated = (data: { tracking_status: string; issueClosed?: boolean; status?: string; checkpoint_cleared_step?: number | null }) => {
  if (activeDocument.value) {
    activeDocument.value = {
      ...activeDocument.value,
      tracking_status: data.tracking_status,
      ...(data.status ? { status: data.status } : {}),
      ...(data.checkpoint_cleared_step != null ? { checkpoint_cleared_step: data.checkpoint_cleared_step } : {}),
    }
  }
  const idx = docs.value.findIndex((d) => d.id === activeDocument.value?.id)
  if (idx !== -1) {
    docs.value[idx] = {
      ...docs.value[idx],
      tracking_status: data.tracking_status,
      ...(data.status ? { status: data.status } : {}),
      ...(data.checkpoint_cleared_step != null ? { checkpoint_cleared_step: data.checkpoint_cleared_step } : {}),
    }
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await Promise.all([fetchMyOffices(), fetchDocs(), stageStore.fetchStages()])
  await openDocumentFromQuery()
})

watch(() => route.query.document, async () => {
  if (route.query.document) await openDocumentFromQuery()
  else if (!route.query.document) activeDocument.value = null
})
</script>

<style scoped>
</style>
