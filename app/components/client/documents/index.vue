<template>
  <section
    class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8 font-dashboard animate-fade-in"
    :class="isDark ? 'text-white' : 'text-onyx-black'"
  >
    <!-- A. Header & Core Action Row -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange mb-1">Track Documents</p>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">All Documents</h1>
        <p class="mt-1 text-sm" :class="mutedTextClass">
          Upload and keep track of every document in your organization
        </p>
      </div>

      <div class="flex items-center gap-3">
        <NuxtLink
          to="/client/scan"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white dark:bg-onyx-card border px-4 py-2 font-medium transition duration-200 hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange"
          :class="isDark ? 'border-onyx-border text-white' : 'border-gray-200 text-onyx-black'"
        >
          <Icon name="ph:qr-code-bold" class="h-4 w-4 text-candy-orange" />
          Scan QR
        </NuxtLink>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-2 font-medium text-white shadow-sm shadow-candy-orange/20 transition duration-200 hover:bg-candy-hover active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange"
          @click="isUploadModalOpen = true"
        >
          <Icon name="ph:plus-bold" class="h-4 w-4" />
          Upload Document
        </button>
      </div>
    </div>

    <!-- B. Filter & Search Utility Bar -->
    <div
      class="flex flex-col gap-3 rounded-2xl border p-4 shadow-card sm:flex-row sm:items-center"
      :class="surfaceClass"
    >
      <button
        @click="isSemanticSearchOpen = true"
        class="flex flex-1 items-center justify-between gap-2 rounded-xl border px-4 py-2 transition-all text-left"
        :class="isDark ? 'border-onyx-border bg-onyx-black/40 hover:border-candy-orange hover:bg-white/5' : 'border-gray-200 bg-gray-50 hover:border-candy-orange hover:bg-white'"
      >
        <span class="flex items-center gap-2" :class="mutedTextClass">
          <Icon name="ph:sparkle-fill" class="h-4 w-4 text-candy-orange" />
          Ask AI to find a document...
        </span>
        <span class="rounded-full bg-gray-200 dark:bg-white/10 px-2 py-0.5 text-[13px] font-bold text-gray-500 dark:text-gray-400 hidden sm:block">⌘K</span>
      </button>

      <select
        v-model="officeFilter"
        class="rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange sm:w-64"
        :class="inputClass"
      >
        <option value="all">All Offices</option>
        <option v-for="office in officeStore.offices" :key="office.id" :value="String(office.id)">
          {{ office.name }}
        </option>
      </select>
    </div>

    <!-- Active status filter indicator (from a clickable KPI card / AI Digest stat) -->
    <div v-if="statusFilter !== 'all'" class="flex items-center gap-3 bg-candy-orange/10 border border-candy-orange/20 rounded-xl p-3 text-sm animate-fade-in shadow-sm">
      <Icon name="ph:funnel-fill" class="h-5 w-5 text-candy-orange" />
      <span :class="isDark ? 'text-orange-200' : 'text-orange-800'">
        Filtered to <strong>{{ statusFilter === 'processing' ? 'Currently Processing' : statusFilter }}</strong> documents
      </span>
      <button @click="statusFilter = 'all'" class="ml-auto text-candy-orange hover:text-candy-hover font-medium text-xs bg-white dark:bg-candy-orange/20 px-3 py-1.5 rounded-full border border-candy-orange/30 transition-colors">
        Clear Filter
      </button>
    </div>

    <!-- Active Semantic Search Indicator -->
    <div v-if="semanticResults" class="flex items-center gap-3 bg-amber-50 dark:bg-candy-orange/10 border border-amber-200 dark:border-candy-orange/20 rounded-xl p-3 text-sm animate-fade-in shadow-sm">
      <Icon name="ph:sparkle-fill" class="h-5 w-5 text-candy-orange" />
      <span :class="isDark ? 'text-amber-200' : 'text-amber-800'">
        Showing <strong>{{ filteredDocuments.length }}</strong> results for "<span class="italic">{{ semanticQuery }}</span>"
      </span>
      <button @click="semanticResults = null" class="ml-auto text-candy-orange hover:text-candy-hover font-medium text-xs bg-white dark:bg-candy-orange/20 px-3 py-1.5 rounded-full border border-amber-200 dark:border-candy-orange/30 transition-colors">
        Clear Filter
      </button>
    </div>

    <!-- C. Documents Datatable -->
    <article class="overflow-hidden rounded-2xl border shadow-card" :class="surfaceClass">
      <div class="flex items-center justify-between border-b px-5 py-4" :class="borderClass">
        <div>
          <h2 class="text-base font-semibold">Documents</h2>
          <p class="mt-1 text-xs" :class="mutedTextClass">
            {{ filteredDocuments.length }} total
          </p>
        </div>
        <Icon name="ph:files" class="h-5 w-5 text-candy-orange" />
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead :class="isDark ? 'bg-onyx-black/50 text-gray-400' : 'bg-gray-50 text-gray-500'">
            <tr>
              <th class="px-5 py-3 text-xs font-semibold uppercase tracking-wide">Document</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Office</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Uploaded By</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Created</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="documentStore.loading">
              <td colspan="5" class="px-5 py-12 text-center" :class="mutedTextClass">
                <Icon name="ph:spinner-gap" class="mx-auto mb-2 h-6 w-6 animate-spin text-candy-orange" />
                Loading documents…
              </td>
            </tr>

            <template v-else-if="filteredDocuments.length">
              <tr
                v-for="doc in filteredDocuments"
                :key="doc.id"
                class="cursor-pointer border-t transition-colors duration-150"
                :class="[
                  borderClass,
                  isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50',
                  activeDocument?.id === doc.id ? 'bg-candy-orange/5 ring-1 ring-inset ring-candy-orange/30' : '',
                ]"
                @click="openDocumentPreview(doc)"
              >
                <td class="min-w-72 px-5 py-4">
                  <div class="font-semibold">{{ doc.title }}</div>
                  <div class="mt-1 line-clamp-2 max-w-md text-xs" :class="mutedTextClass">
                    {{ doc.description }}
                  </div>
                  <div v-if="getSemanticExplanation(doc.id)" class="mt-3 text-xs font-medium text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-candy-orange/10 p-2.5 rounded-lg flex gap-2 items-start border border-amber-100 dark:border-candy-orange/20">
                    <Icon name="ph:sparkle-fill" class="h-4 w-4 shrink-0 mt-0.5 text-candy-orange" />
                    <span class="leading-relaxed">{{ getSemanticExplanation(doc.id) }}</span>
                  </div>
                </td>
                <td class="whitespace-nowrap px-5 py-4">
                  {{ getOfficeName(doc) }}
                </td>
                <td class="whitespace-nowrap px-5 py-4">
                  {{ doc.uploader_name || 'Unknown' }}
                </td>
                <td class="whitespace-nowrap px-5 py-4" :class="mutedTextClass">
                  {{ formatDate(doc.created_at) }}
                </td>
                <td class="whitespace-nowrap px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                    :class="statusClass(doc.status)"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-current" :class="doc.status === 'Pending' ? 'animate-pulse' : ''"></span>
                    {{ doc.status || 'Pending' }}
                  </span>
                </td>
              </tr>
            </template>

            <!-- D. Empty state -->
            <tr v-else>
              <td colspan="5" class="px-5 py-16 text-center">
                <Icon name="ph:file-dashed" class="mx-auto mb-3 h-12 w-12 text-candy-orange" />
                <p class="font-semibold">No documents found.</p>
                <p class="mt-1 text-xs" :class="mutedTextClass">
                  Click "Upload Document" to get started.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <!-- Upload modal -->
    <DocumentUploadModal
      :is-open="isUploadModalOpen"
      @close="isUploadModalOpen = false"
      @uploaded="handleUploadSuccess"
    />

    <!-- Detail preview drawer -->
    <DocumentPreviewDrawer
      :is-open="!!activeDocument"
      :document="activeDocument"
      @close="closeDocumentPreview"
    />

    <!-- Semantic Search Modal -->
    <SemanticSearchModal
      :is-open="isSemanticSearchOpen"
      :documents="documentStore.documents"
      @close="isSemanticSearchOpen = false"
      @results="handleSemanticResults"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useOfficeStore } from '~/stores/office'
import { useStageStore } from '~/stores/stage'
import { useDocumentStore, type DocumentRecord } from '~/stores/document'
import DocumentUploadModal from './documentUploadModal.vue'
import DocumentPreviewDrawer from '~/components/documents/DocumentPreviewDrawer.vue'
import SemanticSearchModal from './SemanticSearchModal.vue'

const authStore = useAuthStore()
const officeStore = useOfficeStore()
const stageStore = useStageStore()
const documentStore = useDocumentStore()
const { isDark } = useTheme()
const route = useRoute()
const router = useRouter()

const isUploadModalOpen = ref(false)
const activeDocument = ref<DocumentRecord | null>(null)
const officeFilter = ref<'all' | string>('all')
const statusFilter = ref<'all' | string>('all')

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

const surfaceClass = computed(() =>
  isDark.value ? 'border-onyx-border bg-[#1A1A1A] shadow-onyx-card' : 'border-gray-200 bg-white'
)
const borderClass = computed(() => (isDark.value ? 'border-onyx-border' : 'border-gray-200'))
const mutedTextClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const inputClass = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-onyx-black placeholder:text-gray-400'
)

const PROCESSING_STATUSES = ['processing', 'in review']

const filteredDocuments = computed(() => {
  return documentStore.documents.filter((doc) => {
    const matchesOffice =
      officeFilter.value === 'all' || String(doc.office_id) === officeFilter.value

    const docStatus = (doc.status || 'Pending').toLowerCase()
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'processing' ? PROCESSING_STATUSES.includes(docStatus) : docStatus === statusFilter.value)

    let matchesSemantic = true
    if (semanticResults.value) {
      matchesSemantic = semanticResults.value.some(r => String(r.id) === String(doc.id))
    }

    return matchesOffice && matchesStatus && matchesSemantic
  })
})

const orgFallbackName = computed(() =>
  String(authStore.currentOrg?.name || authStore.currentOrg?.code || authStore.user?.org_id || 'Organization')
)

const getOfficeName = (doc: DocumentRecord) => {
  const officeId = doc.office_id
  if (officeId == null || officeId === '') return orgFallbackName.value
  return (
    officeStore.offices.find((office) => String(office.id) === String(officeId))?.name ||
    orgFallbackName.value
  )
}

const formatDate = (value?: string) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

const statusClass = (status: string) => {
  switch ((status || 'Pending').toLowerCase()) {
    case 'approved':
      return 'text-success border-success/30 bg-success/10'
    case 'rejected':
      return 'text-danger border-danger/30 bg-danger/10'
    case 'processing':
    case 'in review':
      return 'text-candy-orange border-candy-orange/30 bg-candy-orange/10'
    case 'pending':
    default:
      return 'text-warning border-warning/30 bg-warning/10'
  }
}

const openDocumentPreview = (doc: DocumentRecord) => {
  activeDocument.value = doc
}

const closeDocumentPreview = () => {
  activeDocument.value = null
  if (route.query.id || route.query.document) {
    router.replace({ query: { ...route.query, id: undefined, document: undefined } })
  }
}

const handleUploadSuccess = () => {
  isUploadModalOpen.value = false
  documentStore.fetchDocuments()
}

onMounted(async () => {
  if (!authStore.currentOrg && authStore.user?.user_id) {
    await authStore.fetchMyOrg()
  }

  await Promise.all([
    officeStore.fetchOffices(),
    stageStore.fetchStages(),
    documentStore.fetchDocuments(),
  ])

  const checkRouteForDocument = () => {
    const routeId = route.query.id || route.query.document
    if (routeId) {
      const doc = documentStore.documents.find(d => String(d.id) === String(routeId))
      if (doc) activeDocument.value = doc
    }
  }

  watch(() => route.query, checkRouteForDocument, { deep: true, immediate: true })

  // Arriving here from a clickable KPI card / AI Digest stat pre-applies its filter.
  if (route.query.officeId) officeFilter.value = String(route.query.officeId)
  if (route.query.status) statusFilter.value = String(route.query.status)
})
</script>
