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
        <div class="mb-3 h-1 w-14 rounded-none bg-candy-orange" />
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Document Management</h1>
        <p class="mt-1 text-sm" :class="mutedText">
          Documents scoped to your sub-office branches.
        </p>
      </div>

      <!-- Right: upload button -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Scan QR Button -->
        <NuxtLink
          to="/employee/scan"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-none bg-white dark:bg-onyx-card border px-4 py-2 text-sm font-semibold transition duration-200 hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange"
          :class="isDark ? 'border-onyx-border text-white' : 'border-gray-200 text-onyx-black'"
        >
          <Icon name="ph:qr-code-bold" class="h-4 w-4" />
          Scan QR
        </NuxtLink>

        <!-- Upload -->
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-none bg-[#F47D2F] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-candy-orange/20 transition duration-200 hover:bg-[#D96518] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange"
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
        <div
          v-for="(card, i) in kpiCards"
          :key="card.label"
          class="flex items-start gap-4 rounded-none border p-5 shadow-card transition-all"
          :class="isDark ? 'border-onyx-border bg-[#1A1A1A]' : 'border-gray-200 bg-white'"
          :style="{ transitionDelay: `${i * 40}ms` }"
        >
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none" :class="card.iconBg">
            <Icon :name="card.icon" class="h-5 w-5" :class="card.iconColor" />
          </span>
          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-wider" :class="mutedText">{{ card.label }}</p>
            <p class="mt-1 text-2xl font-bold">
              <span v-if="loading" class="inline-block h-6 w-12 animate-pulse rounded-none" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
              <span v-else>{{ card.value }}</span>
            </p>
            <p class="mt-0.5 text-[10px]" :class="card.trendColor">{{ card.trend }}</p>
          </div>
        </div>
      </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- D. Filter & Search Bar                                            -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div
      class="flex flex-col gap-3 rounded-none border p-4 shadow-card sm:flex-row sm:items-center"
      :class="isDark ? 'border-onyx-border bg-[#1A1A1A]' : 'border-gray-200 bg-white'"
    >
      <button
        @click="isSemanticSearchOpen = true"
        class="flex flex-1 items-center justify-between gap-2 rounded-none border px-4 py-2 transition-all text-left"
        :class="isDark ? 'border-onyx-border bg-onyx-black/40 hover:border-candy-orange hover:bg-white/5' : 'border-gray-200 bg-gray-50 hover:border-candy-orange hover:bg-white'"
      >
        <span class="flex items-center gap-2" :class="mutedText">
          <Icon name="ph:sparkle-fill" class="h-4 w-4 text-candy-orange" />
          Describe your intent...
        </span>
        <span class="rounded-none bg-gray-200 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 hidden sm:block">⌘K</span>
      </button>

      <!-- Office filter -->
      <select
        v-model="officeFilter"
        class="rounded-none border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange sm:w-56"
        :class="inputClass"
      >
        <option value="all">All My Offices</option>
        <option value="own">My Uploads Only</option>
        <option v-for="o in myOffices" :key="o.id" :value="String(o.id)">{{ o.name }}</option>
      </select>

      <!-- Status filter -->
      <select
        v-model="statusFilter"
        class="rounded-none border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange sm:w-44"
        :class="inputClass"
      >
        <option value="all">All Statuses</option>
        <option value="Pending">Pending</option>
        <option value="Processing">Processing</option>
        <option value="Approved">Approved</option>
        <option value="Rejected">Rejected</option>
      </select>

      <!-- Tracking filter -->
      <select
        v-model="trackingFilter"
        class="rounded-none border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange sm:w-44"
        :class="inputClass"
      >
        <option value="all">All Tracking</option>
        <option value="CREATED">Created</option>
        <option value="PICKED_UP">Picked Up</option>
        <option value="IN_TRANSIT">In Transit</option>
        <option value="ARRIVED_AT_OFFICE">At Office</option>
        <option value="DISCREPANCY_REPORTED">Flagged</option>
        <option value="COMPLETED">Completed</option>
      </select>
    </div>

    <!-- Active Semantic Search Indicator -->
    <div v-if="semanticResults" class="flex items-center gap-3 bg-amber-50 dark:bg-candy-orange/10 border border-amber-200 dark:border-candy-orange/20 rounded-none p-3 text-sm animate-fade-in shadow-sm">
      <Icon name="ph:sparkle-fill" class="h-5 w-5 text-candy-orange" />
      <span :class="isDark ? 'text-amber-200' : 'text-amber-800'">
        Showing <strong>{{ filtered.length }}</strong> results for "<span class="italic">{{ semanticQuery }}</span>"
      </span>
      <button @click="semanticResults = null" class="ml-auto text-candy-orange hover:text-[#D96518] font-medium text-xs bg-white dark:bg-candy-orange/20 px-3 py-1.5 rounded-none border border-amber-200 dark:border-candy-orange/30 transition-colors">
        Clear Filter
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- E. Documents Table                                                -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <article
      class="overflow-hidden rounded-none border shadow-card"
      :class="isDark ? 'border-onyx-border bg-[#1A1A1A]' : 'border-gray-200 bg-white'"
    >
      <!-- Table header row -->
      <div class="flex items-center justify-between border-b px-5 py-4" :class="borderClass">
        <div>
          <h2 class="text-base font-bold">
            Office Documents
          </h2>
          <p class="mt-0.5 text-xs" :class="mutedText">
            {{ filtered.length }} document{{ filtered.length === 1 ? '' : 's' }} found
          </p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead :class="isDark ? 'bg-onyx-black/50 text-gray-400' : 'bg-gray-50 text-gray-500'">
            <tr>
              <th class="px-5 py-3 text-xs font-semibold uppercase tracking-wide">Document</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Office</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Origin</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Source</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Tracking</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading skeleton -->
            <template v-if="loading">
              <tr v-for="n in 5" :key="n" class="border-t" :class="borderClass">
                <td class="px-5 py-4">
                  <div class="h-4 w-48 animate-pulse rounded-none" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
                  <div class="mt-1 h-3 w-32 animate-pulse rounded-none" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
                </td>
                <td v-for="k in 6" :key="k" class="px-5 py-4">
                  <div class="h-4 w-20 animate-pulse rounded-none" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
                </td>
              </tr>
            </template>

            <!-- Rows -->
            <template v-else-if="filtered.length">
              <tr
                v-for="doc in filtered"
                :key="doc.id"
                class="cursor-pointer border-t transition-colors duration-150"
                :class="[
                  borderClass,
                  isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50',
                  activeDocument?.id === doc.id ? 'bg-candy-orange/5 ring-1 ring-inset ring-candy-orange/30' : '',
                ]"
                @click="openDocumentPreview(doc)"
              >
                <!-- Document title + desc -->
                <td class="min-w-72 px-5 py-4">
                  <div class="flex items-start gap-2">
                    <div
                      v-if="doc.is_own_upload"
                      class="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-none bg-candy-orange/15"
                      title="Your upload"
                    >
                      <Icon name="ph:user-fill" class="h-2.5 w-2.5 text-candy-orange" />
                    </div>
                    <div class="min-w-0">
                      <p class="font-semibold">{{ doc.title }}</p>
                      <p class="mt-0.5 line-clamp-1 max-w-xs text-xs" :class="mutedText">
                        {{ doc.description || '—' }}
                      </p>
                    </div>
                  </div>
                  <div v-if="getSemanticExplanation(doc.id)" class="mt-3 text-xs font-medium text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-candy-orange/10 p-2.5 rounded-none flex gap-2 items-start border border-amber-100 dark:border-candy-orange/20">
                    <Icon name="ph:sparkle-fill" class="h-4 w-4 shrink-0 mt-0.5 text-candy-orange" />
                    <span class="leading-relaxed">{{ getSemanticExplanation(doc.id) }}</span>
                  </div>
                </td>

                <!-- Current office -->
                <td class="whitespace-nowrap px-5 py-4 text-xs">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 font-semibold"
                    :class="isDark ? 'border-onyx-border bg-onyx-black/40 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'"
                  >
                    <Icon name="ph:buildings-fill" class="h-3 w-3 text-candy-orange" />
                    {{ formatOfficeName(doc.office_label || doc.current_label) || 'Unassigned' }}
                  </span>
                </td>

                <!-- Origin office -->
                <td class="whitespace-nowrap px-5 py-4 text-xs" :class="mutedText">
                  {{ formatOfficeName(doc.origin_label) }}
                </td>

                <!-- Source badge -->
                <td class="whitespace-nowrap px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1 rounded-none border px-2.5 py-1 text-xs font-semibold"
                    :class="doc.is_own_upload
                      ? 'bg-candy-orange/10 text-candy-orange border-candy-orange/20'
                      : isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'"
                  >
                    {{ doc.is_own_upload ? 'My Upload' : 'Routed In' }}
                  </span>
                </td>

                <!-- Tracking status -->
                <td class="whitespace-nowrap px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 text-xs font-semibold"
                    :class="trackingClass(doc.tracking_status)"
                  >
                    <span class="h-1.5 w-1.5 rounded-none bg-current" :class="doc.tracking_status === 'IN_TRANSIT' ? 'animate-pulse' : ''" />
                    {{ trackingLabel(doc.tracking_status) }}
                  </span>
                </td>

                <!-- Date -->
                <td class="whitespace-nowrap px-5 py-4 text-xs" :class="mutedText">
                  {{ fmtDate(doc.created_at) }}
                </td>

                <!-- Approval status -->
                <td class="whitespace-nowrap px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 text-xs font-semibold"
                    :class="statusClass(doc.status)"
                  >
                    <span class="h-1.5 w-1.5 rounded-none bg-current" :class="doc.status === 'Pending' ? 'animate-pulse' : ''" />
                    {{ doc.status || 'Pending' }}
                  </span>
                </td>
              </tr>
            </template>

            <!-- Empty -->
            <tr v-else>
              <td colspan="7" class="px-5 py-16 text-center">
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-none bg-candy-orange/10">
                  <Icon name="ph:file-dashed" class="h-8 w-8 text-candy-orange" />
                </div>
                <p class="font-bold">No documents found.</p>
                <p class="mt-1 text-xs" :class="mutedText">
                  Upload a document from your office or adjust your search filters.
                </p>
                <button
                  type="button"
                  class="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-none bg-[#F47D2F] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-candy-orange/20 transition duration-200 hover:bg-[#D96518] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange"
                  @click="isUploadOpen = true"
                >
                  <Icon name="ph:upload-simple-bold" class="h-4 w-4" />
                  Upload Document
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

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
}

interface OfficeRecord { id: string; name: string; code?: string }

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
const activeDocument = ref<LedgerDoc | null>(null)
const issueChatRef   = ref<InstanceType<typeof DocumentIssueChatPanel> | null>(null)
const officeFilter  = ref<string>('all')
const statusFilter  = ref<string>('all')
const trackingFilter = ref<string>('all')

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
const glassSurface = computed(() =>
  isDark.value ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-white'
)
const cardSurface = computed(() =>
  isDark.value ? 'border-white/10 bg-[#1A1A1A] shadow-xl shadow-black/30' : 'border-gray-200 bg-white shadow-card'
)
const borderClass  = computed(() => isDark.value ? 'border-white/5' : 'border-gray-100')
const mutedText    = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass   = computed(() =>
  isDark.value
    ? 'border-white/10 bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

// ── KPI cards ─────────────────────────────────────────────────────────
const kpiCards = computed(() => [
  {
    label: 'Total Docs',
    value: docs.value.length,
    icon: 'ph:files-fill',
    iconBg: 'bg-candy-orange/10',
    iconColor: 'text-candy-orange',
    trend: 'In your offices',
    trendColor: 'text-candy-orange',
  },
  {
    label: 'My Uploads',
    value: docs.value.filter((d) => d.is_own_upload).length,
    icon: 'ph:user-fill',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    trend: 'Registered by you',
    trendColor: isDark.value ? 'text-gray-500' : 'text-gray-400',
  },
  {
    label: 'In Transit',
    value: docs.value.filter((d) => d.tracking_status === 'IN_TRANSIT').length,
    icon: 'ph:van-fill',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    trend: 'Moving now',
    trendColor: 'text-purple-400',
  },
  {
    label: 'Completed',
    value: docs.value.filter((d) => d.tracking_status === 'COMPLETED').length,
    icon: 'ph:check-circle-fill',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    trend: 'Fully delivered',
    trendColor: 'text-green-400',
  },
])

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
    case 'approved':   return 'text-green-500 border-green-500/30 bg-green-500/10'
    case 'rejected':   return 'text-red-500 border-red-500/30 bg-red-500/10'
    case 'processing': return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
    case 'in review':  return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
    default:           return 'text-candy-orange border-candy-orange/30 bg-candy-orange/10'
  }
}

const trackingClass = (s?: string) => {
  switch (s) {
    case 'COMPLETED':         return 'text-green-500 border-green-500/30 bg-green-500/10'
    case 'IN_TRANSIT':        return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
    case 'PICKED_UP':         return 'text-purple-400 border-purple-400/30 bg-purple-400/10'
    case 'ARRIVED_AT_OFFICE': return 'text-teal-400 border-teal-400/30 bg-teal-400/10'
    case 'DISCREPANCY_REPORTED': return 'text-amber-400 border-amber-400/30 bg-amber-400/10'
    default:                  return 'text-candy-orange border-candy-orange/30 bg-candy-orange/10'
  }
}

const trackingLabel = (s?: string) => {
  switch (s) {
    case 'COMPLETED':         return 'Completed'
    case 'IN_TRANSIT':        return 'In Transit'
    case 'PICKED_UP':         return 'Picked Up'
    case 'ARRIVED_AT_OFFICE': return 'At Office'
    case 'DISCREPANCY_REPORTED': return 'Discrepancy'
    default:                  return 'Created'
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
      params: { orgId, userId, scope: 'LOCAL', limit: 200 },
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
