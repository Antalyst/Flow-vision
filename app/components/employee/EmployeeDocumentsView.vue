<template>
  <section class="w-full space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">

    <!-- ── Page Header ──────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-3 h-1 w-14 rounded-none bg-candy-orange" />
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">My Office Documents</h1>
        <p class="mt-1 text-sm" :class="mutedText">
          Documents registered in or routed through your sub-offices
        </p>
      </div>

      <button
        type="button"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-none bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-candy-orange/25 transition-all duration-200 hover:bg-[#e95a0b] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange/50"
        @click="isUploadOpen = true"
      >
        <Icon name="ph:upload-simple-bold" class="h-4 w-4" />
        Upload Document
      </button>
    </div>

    <!-- ── KPI Strip ─────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div
        v-for="kpi in kpiCards"
        :key="kpi.label"
        class="rounded-none border px-4 py-3 backdrop-blur-sm"
        :class="glassSurface"
      >
        <p class="text-[11px] font-bold uppercase tracking-wider text-candy-orange">{{ kpi.label }}</p>
        <p class="mt-1 text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ kpi.value }}</p>
      </div>
    </div>

    <!-- ── Filter Bar ────────────────────────────────────────────────── -->
    <div
      class="flex flex-col gap-3 rounded-none border p-4 backdrop-blur-sm sm:flex-row sm:items-center"
      :class="glassSurface"
    >
      <!-- Search -->
      <div
        class="flex flex-1 items-center gap-2 rounded-none border px-3 py-2.5 transition-all"
        :class="isDark ? 'border-white/10 bg-onyx-black/40 focus-within:border-candy-orange' : 'border-gray-200 bg-gray-50 focus-within:border-candy-orange'"
      >
        <Icon name="ph:magnifying-glass" class="h-4 w-4 flex-none" :class="mutedText" />
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
        class="rounded-none border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange sm:w-56"
        :class="inputClass"
      >
        <option value="all">All My Offices</option>
        <option value="own">My Uploads Only</option>
        <option
          v-for="office in myOffices"
          :key="office.id"
          :value="String(office.id)"
        >
          {{ office.name }}
        </option>
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
    </div>

    <!-- ── Documents Table ───────────────────────────────────────────── -->
    <article
      class="overflow-hidden rounded-none border shadow-card backdrop-blur-sm"
      :class="cardSurface"
    >
      <!-- Table header -->
      <div class="flex items-center justify-between border-b px-5 py-4" :class="borderClass">
        <div>
          <h2 class="text-base font-bold">Office Documents</h2>
          <p class="mt-0.5 text-xs" :class="mutedText">
            {{ filtered.length }} document{{ filtered.length === 1 ? '' : 's' }} found
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Icon name="ph:files-fill" class="h-5 w-5 text-candy-orange" />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead :class="isDark ? 'bg-onyx-black/50 text-gray-400' : 'bg-gray-50 text-gray-500'">
            <tr>
              <th class="px-5 py-3 text-xs font-semibold uppercase tracking-wide">Document</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Office</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Source</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Tracking</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading -->
            <tr v-if="loading">
              <td colspan="6" class="px-5 py-12 text-center" :class="mutedText">
                <Icon name="ph:spinner-gap" class="mx-auto mb-2 h-6 w-6 animate-spin text-candy-orange" />
                Loading your office documents…
              </td>
            </tr>

            <!-- Rows -->
            <template v-else-if="filtered.length">
              <tr
                v-for="doc in filtered"
                :key="doc.id"
                class="cursor-pointer border-t transition-colors"
                :class="[borderClass, isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50']"
                @click="selectDoc(doc)"
              >
                <!-- Title + desc -->
                <td class="min-w-72 px-5 py-4">
                  <div class="flex items-center gap-2">
                    <div
                      v-if="doc.is_own_upload"
                      class="flex h-5 w-5 flex-none items-center justify-center rounded-none bg-candy-orange/15"
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
                </td>

                <!-- Office -->
                <td class="whitespace-nowrap px-5 py-4 text-xs">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 font-semibold"
                    :class="isDark ? 'border-white/10 bg-white/5 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'"
                  >
                    <Icon name="ph:buildings-fill" class="h-3 w-3 text-candy-orange" />
                    {{ doc.office_label || 'Unassigned' }}
                  </span>
                </td>

                <!-- Source badge -->
                <td class="whitespace-nowrap px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1 rounded-none px-2.5 py-1 text-xs font-semibold"
                    :class="doc.is_own_upload
                      ? 'bg-candy-orange/10 text-candy-orange border border-candy-orange/20'
                      : isDark ? 'bg-white/5 border border-white/10 text-gray-400' : 'bg-gray-100 border border-gray-200 text-gray-600'"
                  >
                    {{ doc.is_own_upload ? 'My Upload' : 'Routed In' }}
                  </span>
                </td>

                <!-- Tracking -->
                <td class="whitespace-nowrap px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 text-xs font-semibold"
                    :class="trackingClass(doc.tracking_status)"
                  >
                    <span class="h-1.5 w-1.5 rounded-none bg-current" />
                    {{ doc.tracking_status || 'CREATED' }}
                  </span>
                </td>

                <!-- Date -->
                <td class="whitespace-nowrap px-5 py-4 text-xs" :class="mutedText">
                  {{ fmtDate(doc.created_at) }}
                </td>

                <!-- Status -->
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
              <td colspan="6" class="px-5 py-16 text-center">
                <Icon name="ph:file-dashed" class="mx-auto mb-3 h-12 w-12 text-candy-orange/40" />
                <p class="font-semibold">No documents found.</p>
                <p class="mt-1 text-xs" :class="mutedText">
                  Upload a document or adjust your office assignment.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <!-- ── Document Detail Side Panel ───────────────────────────────── -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="selectedDoc"
          class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          @click="selectedDoc = null"
        />
      </Transition>

      <Transition name="drawer-slide">
        <aside
          v-if="selectedDoc"
          class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-xl flex-col border-l shadow-2xl"
          :class="isDark ? 'bg-[#111111]/95 backdrop-blur-xl border-white/10' : 'bg-white border-gray-200'"
        >
          <header class="flex items-start justify-between gap-4 border-b px-6 py-5" :class="isDark ? 'border-white/10' : 'border-gray-200'">
            <div class="min-w-0">
              <div class="mb-1 h-0.5 w-8 rounded-none bg-candy-orange" />
              <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">Document Detail</p>
              <h2 class="mt-1 truncate text-lg font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ selectedDoc.title }}
              </h2>
            </div>
            <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-none transition" :class="isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100'" @click="selectedDoc = null">
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </header>

          <div class="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <!-- Badges -->
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-none border px-3 py-1 text-xs font-semibold" :class="trackingClass(selectedDoc.tracking_status)">
                <span class="h-1.5 w-1.5 rounded-none bg-current" />{{ selectedDoc.tracking_status || 'CREATED' }}
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-none border px-3 py-1 text-xs font-semibold" :class="statusClass(selectedDoc.status)">
                {{ selectedDoc.status || 'Pending' }}
              </span>
              <span
                class="inline-flex items-center gap-1 rounded-none px-3 py-1 text-xs font-semibold"
                :class="selectedDoc.is_own_upload ? 'bg-candy-orange/10 border border-candy-orange/20 text-candy-orange' : isDark ? 'bg-white/5 border border-white/10 text-gray-400' : 'bg-gray-100 border border-gray-200 text-gray-600'"
              >
                {{ selectedDoc.is_own_upload ? 'My Upload' : 'Routed In' }}
              </span>
            </div>

            <!-- Meta grid -->
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-none border p-3" :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'">
                <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">Office</p>
                <p class="mt-1 text-sm font-semibold">{{ selectedDoc.office_label || 'Unassigned' }}</p>
              </div>
              <div class="rounded-none border p-3" :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'">
                <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">Registered</p>
                <p class="mt-1 text-sm font-semibold">{{ fmtDate(selectedDoc.created_at) }}</p>
              </div>
              <div class="rounded-none border p-3 col-span-2" :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'">
                <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">QR Code</p>
                <p class="mt-1 font-mono text-xs">{{ selectedDoc.qr_code_data || '—' }}</p>
              </div>
            </div>

            <!-- Description -->
            <div v-if="selectedDoc.description" class="rounded-none border p-4" :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'">
              <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange mb-2">Description</p>
              <p class="text-sm leading-relaxed" :class="mutedText">{{ selectedDoc.description }}</p>
            </div>
          </div>
        </aside>
      </Transition>
    </Teleport>

    <!-- ── Upload Modal ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div v-if="isUploadOpen" class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" @click="isUploadOpen = false" />
      </Transition>

      <Transition name="upload-scale">
        <div
          v-if="isUploadOpen"
          class="fixed inset-0 z-[90] flex items-center justify-center p-4"
          @click.self="isUploadOpen = false"
        >
          <div class="w-full max-w-md rounded-none border shadow-2xl" :class="isDark ? 'bg-[#111111]/95 backdrop-blur-xl border-white/10' : 'bg-white border-gray-200'">
            <header class="flex items-center justify-between border-b px-6 py-5" :class="isDark ? 'border-white/10' : 'border-gray-200'">
              <div>
                <div class="mb-1 h-0.5 w-8 rounded-none bg-candy-orange" />
                <h3 class="text-lg font-bold">Upload Document</h3>
                <p class="mt-0.5 text-xs" :class="mutedText">Registered under your selected office</p>
              </div>
              <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-none transition" :class="isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100'" @click="isUploadOpen = false">
                <Icon name="ph:x-bold" class="h-4 w-4" />
              </button>
            </header>

            <div class="space-y-4 px-6 py-5">
              <!-- Office selector (mandatory for employees) -->
              <label class="block">
                <span class="text-sm font-semibold text-candy-orange">Origin Office <span class="text-red-500">*</span></span>
                <select
                  v-model="uploadForm.origin_office_id"
                  class="mt-2 w-full rounded-none border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                  :class="inputClass"
                  required
                >
                  <option value="">Select your office…</option>
                  <option v-for="o in myOffices" :key="o.id" :value="String(o.id)">{{ o.name }}</option>
                </select>
              </label>

              <!-- File picker -->
              <label class="block">
                <span class="text-sm font-semibold">Document File <span class="text-red-500">*</span></span>
                <div
                  class="mt-2 flex flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed px-4 py-8 text-center transition cursor-pointer"
                  :class="[
                    isDark ? 'border-white/10 hover:border-candy-orange/40' : 'border-gray-200 hover:border-candy-orange/50',
                    uploadFile ? 'border-candy-orange/40 bg-candy-orange/5' : '',
                  ]"
                  @click="triggerFileInput"
                  @dragover.prevent
                  @drop.prevent="handleFileDrop"
                >
                  <Icon name="ph:upload-simple-bold" class="h-8 w-8" :class="uploadFile ? 'text-candy-orange' : mutedText" />
                  <p class="text-sm font-semibold" :class="uploadFile ? 'text-candy-orange' : isDark ? 'text-gray-200' : 'text-gray-700'">
                    {{ uploadFile ? uploadFile.name : 'Drop file here or click to browse' }}
                  </p>
                  <p class="text-xs" :class="mutedText">PDF, DOCX, PNG — max 10 MB</p>
                  <input ref="fileInputRef" type="file" class="hidden" accept=".pdf,.docx,.doc,.png,.jpg" @change="handleFileChange" />
                </div>
              </label>
            </div>

            <footer class="flex justify-end gap-3 border-t px-6 py-4" :class="isDark ? 'border-white/10' : 'border-gray-200'">
              <button type="button" class="rounded-none border px-4 py-2.5 text-sm font-semibold transition" :class="isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'" @click="isUploadOpen = false">
                Cancel
              </button>
              <button
                type="button"
                :disabled="!uploadForm.origin_office_id || !uploadFile || uploading"
                class="inline-flex items-center gap-2 rounded-none bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-candy-orange/25 transition hover:bg-[#e95a0b] disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleUpload"
              >
                <Icon v-if="uploading" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
                {{ uploading ? 'Uploading…' : 'Upload Document' }}
              </button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>

  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const { isDark } = useTheme()

interface LedgerDoc {
  id: string
  title: string
  description?: string
  status: string
  tracking_status?: string
  qr_code_data?: string
  office_id?: string
  stage_id?: string
  created_at: string
  user_id: string
  office_label?: string
  is_own_upload: boolean
}

interface OfficeRecord {
  id: string
  name: string
  code?: string
}

const docs        = ref<LedgerDoc[]>([])
const myOffices   = ref<OfficeRecord[]>([])
const loading     = ref(false)
const isUploadOpen = ref(false)
const uploading   = ref(false)
const selectedDoc = ref<LedgerDoc | null>(null)
const search      = ref('')
const officeFilter = ref<string>('all')
const statusFilter = ref<string>('all')
const uploadFile  = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadForm  = reactive({ origin_office_id: '' })

// ── Theming ────────────────────────────────────────────────────────────
const glassSurface = computed(() =>
  isDark.value ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-white'
)
const cardSurface = computed(() =>
  isDark.value ? 'border-white/10 bg-[#1A1A1A] shadow-xl shadow-black/30' : 'border-gray-200 bg-white shadow-card'
)
const borderClass = computed(() => isDark.value ? 'border-white/5' : 'border-gray-100')
const mutedText   = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass  = computed(() =>
  isDark.value
    ? 'border-white/10 bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

// ── Computed ───────────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return docs.value.filter((doc) => {
    if (officeFilter.value === 'own' && !doc.is_own_upload) return false
    if (officeFilter.value !== 'all' && officeFilter.value !== 'own' && String(doc.office_id) !== officeFilter.value) return false
    if (statusFilter.value !== 'all' && doc.status !== statusFilter.value) return false
    if (q && !doc.title?.toLowerCase().includes(q) && !doc.description?.toLowerCase().includes(q)) return false
    return true
  })
})

const kpiCards = computed(() => [
  { label: 'Total',     value: docs.value.length },
  { label: 'My Uploads', value: docs.value.filter((d) => d.is_own_upload).length },
  { label: 'In Transit', value: docs.value.filter((d) => d.tracking_status === 'IN_TRANSIT').length },
  { label: 'Completed', value: docs.value.filter((d) => d.tracking_status === 'COMPLETED').length },
])

// ── Helpers ────────────────────────────────────────────────────────────
const fmtDate = (v?: string) => {
  if (!v) return '-'
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(v))
}

const statusClass = (s: string) => {
  switch ((s || 'Pending').toLowerCase()) {
    case 'approved':   return 'text-green-500 border-green-500/30 bg-green-500/10'
    case 'rejected':   return 'text-red-500 border-red-500/30 bg-red-500/10'
    case 'processing': return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
    default:           return 'text-candy-orange border-candy-orange/30 bg-candy-orange/10'
  }
}

const trackingClass = (s?: string) => {
  switch (s) {
    case 'COMPLETED':         return 'text-green-500 border-green-500/30 bg-green-500/10'
    case 'IN_TRANSIT':        return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
    case 'PICKED_UP':         return 'text-purple-400 border-purple-400/30 bg-purple-400/10'
    case 'ARRIVED_AT_OFFICE': return 'text-teal-400 border-teal-400/30 bg-teal-400/10'
    default:                  return 'text-candy-orange border-candy-orange/30 bg-candy-orange/10'
  }
}

// ── Data fetching ──────────────────────────────────────────────────────
const fetchDocs = async () => {
  const orgId  = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return

  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: LedgerDoc[] }>('/api/employee/ledger', {
      params: { orgId, userId, limit: 100 },
    })
    docs.value = res.data ?? []
  } catch (err) {
    console.error('[EmployeeDocs] ledger error:', err)
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

// ── Upload ─────────────────────────────────────────────────────────────
const triggerFileInput = () => fileInputRef.value?.click()

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  uploadFile.value = target.files?.[0] ?? null
}

const handleFileDrop = (e: DragEvent) => {
  uploadFile.value = e.dataTransfer?.files?.[0] ?? null
}

const handleUpload = async () => {
  if (!uploadFile.value || !uploadForm.origin_office_id || uploading.value) return

  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', uploadFile.value, uploadFile.value.name)
    fd.append('origin_office_id', uploadForm.origin_office_id)
    fd.append('user_id', String(auth.user?.user_id ?? ''))
    fd.append('org_id', String(auth.user?.org_id ?? ''))
    fd.append('office_id', uploadForm.origin_office_id)

    await $fetch('/api/documents/upload', { method: 'POST', body: fd })
    isUploadOpen.value = false
    uploadFile.value   = null
    uploadForm.origin_office_id = ''
    await fetchDocs()
  } catch (err) {
    console.error('[EmployeeDocs] upload error:', err)
  } finally {
    uploading.value = false
  }
}

const selectDoc = (doc: LedgerDoc) => { selectedDoc.value = doc }

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await Promise.all([fetchMyOffices(), fetchDocs()])
})
</script>

<style scoped>
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.2s ease; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }

.drawer-slide-enter-active, .drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }

.upload-scale-enter-active, .upload-scale-leave-active { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.upload-scale-enter-from, .upload-scale-leave-to { opacity: 0; transform: scale(0.95); }
</style>
