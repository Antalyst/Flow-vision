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
          {{
            currentScope === 'LOCAL'
              ? 'Documents scoped to your sub-office branches.'
              : 'Organisation-wide document stream and analytics.'
          }}
        </p>
      </div>

      <!-- Right: toggle + upload button -->
      <div class="flex flex-wrap items-center gap-3">

        <!-- ── Premium Perspective Toggle ─────────────────────────── -->
        <div
          class="relative flex items-center gap-1 rounded-none border p-1.5"
          :class="isDark
            ? 'bg-onyx-card border-onyx-border'
            : 'bg-white border-gray-200'"
        >
          <div
            class="absolute inset-y-1.5 rounded-none bg-candy-orange transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            :style="indicatorStyle"
          />
          <button
            v-for="opt in scopeOptions"
            :key="opt.value"
            :ref="(el) => setTabRef(el, opt.value)"
            type="button"
            class="relative z-10 flex items-center gap-2 rounded-none px-3.5 py-2 text-xs font-semibold transition-colors duration-200 select-none"
            :class="currentScope === opt.value
              ? 'text-white'
              : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'"
            @click="setScope(opt.value)"
          >
            <Icon :name="opt.icon" class="h-3.5 w-3.5 flex-none" />
            <span class="whitespace-nowrap">{{ opt.label }}</span>
          </button>
        </div>

        <!-- Scan QR Button -->
        <NuxtLink
          to="/employee/scan"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-none bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 focus:outline-none"
        >
          <Icon name="ph:qr-code-light" class="h-4 w-4" />
          Scan QR
        </NuxtLink>

        <!-- Upload -->
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-none bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 focus:outline-none"
          @click="isUploadOpen = true"
        >
          <Icon name="ph:upload-simple-light" class="h-4 w-4" />
          Upload Document
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- B. Scope Context Banner                                           -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <Transition name="scope-fade" mode="out-in">
      <div
        :key="currentScope"
        class="flex items-center gap-3 rounded-none border px-4 py-3 text-sm"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
      >
        <div class="flex h-8 w-8 flex-none items-center justify-center rounded-none border" :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-gray-50'">
          <Icon
            :name="currentScope === 'LOCAL' ? 'ph:buildings-light' : 'ph:globe-hemisphere-west-light'"
            class="h-4 w-4 text-candy-orange"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[11px] font-bold uppercase tracking-widest text-candy-orange">
            {{ currentScope === 'LOCAL' ? 'Small Picture — Office View' : 'Big Picture — Organisation View' }}
          </p>
          <p class="mt-0.5 text-xs" :class="mutedText">
            {{
              currentScope === 'LOCAL'
                ? `Showing documents scoped to your ${myOffices.length} sub-office${myOffices.length !== 1 ? 's' : ''}.`
                : `Showing all ${docs.length} documents across the entire organisation.`
            }}
          </p>
        </div>
        <span
          class="inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          :class="isDark ? 'border-onyx-border bg-onyx-black text-candy-orange' : 'border-gray-200 bg-white text-candy-orange'"
        >
          <span class="h-1.5 w-1.5 animate-pulse rounded-none bg-candy-orange" />
          Live
        </span>
      </div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- C. KPI Cards                                                      -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <Transition name="scope-fade" mode="out-in">
      <div :key="`kpi-${currentScope}`" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div
          v-for="(card, i) in kpiCards"
          :key="card.label"
          class="flex items-start gap-4 rounded-none border p-5 transition-colors"
          :class="glassSurface"
          :style="{ transitionDelay: `${i * 40}ms` }"
        >
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none border border-current" :class="card.iconBg">
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
    </Transition>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- D. Filter & Search Bar                                            -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div
      class="flex flex-col gap-3 rounded-none border p-4 sm:flex-row sm:items-center transition-colors"
      :class="glassSurface"
    >
      <!-- Search -->
      <div
        class="flex flex-1 items-center gap-2 rounded-none border px-3 py-2.5 transition-colors"
        :class="isDark ? 'border-onyx-border bg-onyx-black focus-within:border-candy-orange' : 'border-gray-200 bg-gray-50 focus-within:border-candy-orange'"
      >
        <Icon name="ph:magnifying-glass-light" class="h-4 w-4 flex-none" :class="mutedText" />
        <input
          v-model="search"
          type="search"
          placeholder="Search by title or description…"
          class="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </div>

      <!-- Office filter -->
      <select
        v-model="officeFilter"
        class="rounded-none border px-3 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange sm:w-56"
        :class="inputClass"
      >
        <option value="all">All My Offices</option>
        <option value="own">My Uploads Only</option>
        <option v-for="o in myOffices" :key="o.id" :value="String(o.id)">{{ o.name }}</option>
      </select>

      <!-- Status filter -->
      <select
        v-model="statusFilter"
        class="rounded-none border px-3 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange sm:w-44"
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
        class="rounded-none border px-3 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange sm:w-44"
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

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- E. Documents Table                                                -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <article
      class="overflow-hidden rounded-none border transition-colors"
      :class="cardSurface"
    >
      <!-- Table header row -->
      <div class="flex items-center justify-between border-b px-5 py-4" :class="borderClass">
        <div>
          <h2 class="text-base font-bold">
            {{ currentScope === 'LOCAL' ? 'Isolated Document Ledger' : 'Organisation Document Directory' }}
          </h2>
          <p class="mt-0.5 text-xs" :class="mutedText">
            {{ filtered.length }} document{{ filtered.length === 1 ? '' : 's' }} in scope
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center gap-1 rounded-none border px-2.5 py-1 text-[10px] font-bold uppercase"
            :class="currentScope === 'LOCAL'
              ? isDark ? 'border-onyx-border bg-onyx-black text-candy-orange' : 'border-gray-200 bg-white text-candy-orange'
              : isDark ? 'border-onyx-border bg-white/5 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'"
          >
            <Icon :name="currentScope === 'LOCAL' ? 'ph:buildings-light' : 'ph:globe-hemisphere-west-light'" class="h-3 w-3" />
            {{ currentScope === 'LOCAL' ? 'Office Scope' : 'Org Scope' }}
          </span>
          <Icon name="ph:files-light" class="h-5 w-5 text-candy-orange" />
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
                  activeDocument?.id === doc.id ? 'border-candy-orange ring-1 ring-inset ring-candy-orange' : '',
                ]"
                @click="openDocumentPreview(doc)"
              >
                <!-- Document title + desc -->
                <td class="min-w-72 px-5 py-4">
                  <div class="flex items-start gap-2">
                    <div
                      v-if="doc.is_own_upload"
                      class="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-none border"
                      :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-gray-50'"
                      title="Your upload"
                    >
                      <Icon name="ph:user-light" class="h-2.5 w-2.5 text-candy-orange" />
                    </div>
                    <div class="min-w-0">
                      <p class="font-semibold">{{ doc.title }}</p>
                      <p class="mt-0.5 line-clamp-1 max-w-xs text-xs" :class="mutedText">
                        {{ doc.description || '—' }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Current office -->
                <td class="whitespace-nowrap px-5 py-4 text-xs">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 font-semibold"
                    :class="isDark ? 'border-onyx-border bg-white/5 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'"
                  >
                    <Icon name="ph:buildings-light" class="h-3 w-3 text-candy-orange" />
                    {{ doc.office_label || doc.current_label || 'Unassigned' }}
                  </span>
                </td>

                <!-- Origin office -->
                <td class="whitespace-nowrap px-5 py-4 text-xs" :class="mutedText">
                  {{ doc.origin_label || '—' }}
                </td>

                <!-- Source badge -->
                <td class="whitespace-nowrap px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1 rounded-none border px-2.5 py-1 text-xs font-semibold"
                    :class="doc.is_own_upload
                      ? isDark ? 'border-onyx-border bg-onyx-black text-candy-orange' : 'border-gray-200 bg-white text-candy-orange'
                      : isDark ? 'bg-white/5 border-onyx-border text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'"
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
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-none border" :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'">
                  <Icon name="ph:file-dashed-light" class="h-8 w-8 text-candy-orange" />
                </div>
                <p class="font-bold">No documents in scope.</p>
                <p class="mt-1 text-xs" :class="mutedText">
                  {{
                    currentScope === 'LOCAL'
                      ? 'Upload a document from your office or adjust the office filter.'
                      : 'No organisation documents found. Try adjusting the search.'
                  }}
                </p>
                <button
                  type="button"
                  class="mt-4 inline-flex items-center gap-2 rounded-none bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 focus:outline-none"
                  @click="isUploadOpen = true"
                >
                  <Icon name="ph:upload-simple-light" class="h-4 w-4" />
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
      :scope="currentScope"
      @close="isUploadOpen = false"
      @uploaded="handleUploadSuccess"
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
const currentScope  = ref<Scope>('LOCAL')
const docs          = ref<LedgerDoc[]>([])
const myOffices     = ref<OfficeRecord[]>([])
const loading       = ref(false)
const isUploadOpen  = ref(false)
const activeDocument = ref<LedgerDoc | null>(null)
const issueChatRef   = ref<InstanceType<typeof DocumentIssueChatPanel> | null>(null)
const search        = ref('')
const officeFilter  = ref<string>('all')
const statusFilter  = ref<string>('all')
const trackingFilter = ref<string>('all')

// ── Scope toggle refs (same pattern as dashboard.vue) ─────────────────
const scopeOptions = [
  { value: 'LOCAL' as Scope,  label: 'Office View',  icon: 'ph:buildings-light' },
  { value: 'GLOBAL' as Scope, label: 'Org View',     icon: 'ph:globe-hemisphere-west-light' },
]
const tabRefs = ref<Record<string, HTMLElement | null>>({})
const indicatorStyle = ref({ left: '6px', width: '120px' })

const setTabRef = (el: any, value: Scope) => {
  tabRefs.value[value] = el as HTMLElement | null
}

const updateIndicator = () => {
  const el = tabRefs.value[currentScope.value]
  if (!el) return
  indicatorStyle.value = { left: `${el.offsetLeft}px`, width: `${el.offsetWidth}px` }
}

const setScope = (scope: Scope) => {
  currentScope.value = scope
  nextTick(updateIndicator)
}

watch(currentScope, () => reloadData())

onMounted(() => {
  nextTick(updateIndicator)
})

// ── Theming ───────────────────────────────────────────────────────────
const glassSurface = computed(() =>
  isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'
)
const cardSurface = computed(() =>
  isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'
)
const borderClass  = computed(() => isDark.value ? 'border-onyx-border' : 'border-gray-100')
const mutedText    = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass   = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

// ── KPI cards ─────────────────────────────────────────────────────────
const kpiCards = computed(() => [
  {
    label: 'Total Docs',
    value: docs.value.length,
    icon: 'ph:files-light',
    iconBg: isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-gray-50',
    iconColor: 'text-candy-orange',
    trend: currentScope.value === 'LOCAL' ? 'In your offices' : 'Org-wide',
    trendColor: 'text-candy-orange',
  },
  {
    label: 'My Uploads',
    value: docs.value.filter((d) => d.is_own_upload).length,
    icon: 'ph:user-light',
    iconBg: isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-gray-50',
    iconColor: 'text-blue-500',
    trend: 'Registered by you',
    trendColor: isDark.value ? 'text-gray-500' : 'text-gray-400',
  },
  {
    label: 'In Transit',
    value: docs.value.filter((d) => d.tracking_status === 'IN_TRANSIT').length,
    icon: 'ph:van-light',
    iconBg: isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-gray-50',
    iconColor: 'text-purple-500',
    trend: 'Moving now',
    trendColor: 'text-purple-500',
  },
  {
    label: 'Completed',
    value: docs.value.filter((d) => d.tracking_status === 'COMPLETED').length,
    icon: 'ph:check-circle-light',
    iconBg: isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-gray-50',
    iconColor: 'text-green-400',
    trend: 'Fully delivered',
    trendColor: 'text-green-400',
  },
])

// ── Filtered docs ─────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return docs.value.filter((doc) => {
    if (officeFilter.value === 'own' && !doc.is_own_upload) return false
    if (officeFilter.value !== 'all' && officeFilter.value !== 'own') {
      const docOff = String(doc.office_id ?? doc.current_office_id ?? '')
      const ori    = String(doc.origin_office_id ?? '')
      if (docOff !== officeFilter.value && ori !== officeFilter.value) return false
    }
    if (statusFilter.value !== 'all' && doc.status !== statusFilter.value) return false
    if (trackingFilter.value !== 'all' && (doc.tracking_status || 'CREATED') !== trackingFilter.value) return false
    if (q && !doc.title?.toLowerCase().includes(q) && !doc.description?.toLowerCase().includes(q)) return false
    return true
  })
})

const resolveOfficeName = (officeId: string | number | null | undefined) => {
  if (officeId == null) return 'Unknown Office'
  const found = myOffices.value.find((o) => String(o.id) === String(officeId))
  return found?.name || `Office ${String(officeId).slice(0, 6)}`
}

// ── Badge helpers ─────────────────────────────────────────────────────
const statusClass = (s: string) => {
  switch ((s || 'Pending').toLowerCase()) {
    case 'approved':   return isDark.value ? 'border-onyx-border bg-onyx-black text-green-500' : 'border-gray-200 bg-white text-green-600'
    case 'rejected':   return isDark.value ? 'border-onyx-border bg-onyx-black text-red-500' : 'border-gray-200 bg-white text-red-600'
    case 'processing': return isDark.value ? 'border-onyx-border bg-onyx-black text-blue-500' : 'border-gray-200 bg-white text-blue-600'
    case 'in review':  return isDark.value ? 'border-onyx-border bg-onyx-black text-blue-500' : 'border-gray-200 bg-white text-blue-600'
    default:           return isDark.value ? 'border-onyx-border bg-onyx-black text-candy-orange' : 'border-gray-200 bg-white text-candy-orange'
  }
}

const trackingClass = (s?: string) => {
  switch (s) {
    case 'COMPLETED':         return isDark.value ? 'border-onyx-border bg-onyx-black text-green-500' : 'border-gray-200 bg-white text-green-600'
    case 'IN_TRANSIT':        return isDark.value ? 'border-onyx-border bg-onyx-black text-blue-500' : 'border-gray-200 bg-white text-blue-600'
    case 'PICKED_UP':         return isDark.value ? 'border-onyx-border bg-onyx-black text-purple-500' : 'border-gray-200 bg-white text-purple-600'
    case 'ARRIVED_AT_OFFICE': return isDark.value ? 'border-onyx-border bg-onyx-black text-teal-500' : 'border-gray-200 bg-white text-teal-600'
    case 'DISCREPANCY_REPORTED': return isDark.value ? 'border-onyx-border bg-onyx-black text-amber-500' : 'border-gray-200 bg-white text-amber-600'
    default:                  return isDark.value ? 'border-onyx-border bg-onyx-black text-candy-orange' : 'border-gray-200 bg-white text-candy-orange'
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
      params: { orgId, userId, scope: currentScope.value, limit: 200 },
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

const handleIssueUpdated = (payload: { tracking_status: string; issueClosed?: boolean; status?: string; checkpoint_cleared_step?: number | null }) => {
  if (activeDocument.value) {
    activeDocument.value = {
      ...activeDocument.value,
      tracking_status: payload.tracking_status,
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.checkpoint_cleared_step != null ? { checkpoint_cleared_step: payload.checkpoint_cleared_step } : {}),
    }
  }
  const idx = docs.value.findIndex((d) => d.id === activeDocument.value?.id)
  if (idx !== -1) {
    docs.value[idx] = {
      ...docs.value[idx],
      tracking_status: payload.tracking_status,
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.checkpoint_cleared_step != null ? { checkpoint_cleared_step: payload.checkpoint_cleared_step } : {}),
    }
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await Promise.all([fetchMyOffices(), fetchDocs(), stageStore.fetchStages()])
  nextTick(updateIndicator)
  await openDocumentFromQuery()
})

watch(() => route.query.document, async () => {
  if (route.query.document) await openDocumentFromQuery()
  else if (!route.query.document) activeDocument.value = null
})
</script>

<style scoped>
/* Scope toggle transition */
.scope-fade-enter-active, .scope-fade-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.scope-fade-enter-from, .scope-fade-leave-to { opacity: 0; transform: translateY(4px); }
</style>
