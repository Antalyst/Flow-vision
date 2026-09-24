<script setup>
const props = defineProps({
  officeId: {
    type: String,
    default: null,
  },
})

const documents = ref([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 8
const showFilterMenu = ref(false)
const priorityFilter = ref('All')

async function fetchDocuments() {
  loading.value = true
  try {
    const res = await $fetch('/api/client/dashboard-documents', {
      credentials: 'include',
      query: props.officeId ? { officeId: props.officeId } : undefined,
    })
    documents.value = (res.data ?? []).map((d) => ({ ...d, selected: false }))
    currentPage.value = 1
  } catch (err) {
    console.error('[DocumentTable] fetchDocuments:', err)
    documents.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchDocuments)
watch(() => props.officeId, fetchDocuments)

const selectAll = ref(false)

const toggleSelectAll = () => {
  selectAll.value = !selectAll.value
  filteredDocs.value.forEach(d => d.selected = selectAll.value)
}

const normalizedPriority = (p) => {
  const v = String(p || 'Medium')
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
}

const filteredDocs = computed(() => {
  let rows = documents.value

  if (priorityFilter.value !== 'All') {
    rows = rows.filter(d => normalizedPriority(d.priority) === priorityFilter.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    rows = rows.filter(d =>
      String(d.id).toLowerCase().includes(q) ||
      String(d.title || '').toLowerCase().includes(q) ||
      String(d.uploader_name || '').toLowerCase().includes(q)
    )
  }

  return rows
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredDocs.value.length / pageSize)))

const pagedDocs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredDocs.value.slice(start, start + pageSize)
})

watch(filteredDocs, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})

const getPriorityClass = (priority) => {
  const map = { 'High': 'badge-high', 'Medium': 'badge-medium', 'Low': 'badge-low' }
  return map[normalizedPriority(priority)] || 'badge-medium'
}

const getStatusIcon = (type) => {
  const map = {
    'pending':    { icon: 'ph:clock-fill', color: 'text-candy-orange' },
    'processing': { icon: 'ph:spinner', color: 'text-blue-500' },
    'approved':   { icon: 'ph:check-circle-fill', color: 'text-emerald-500' },
    'rejected':   { icon: 'ph:x-circle-fill', color: 'text-red-500' },
  }
  return map[String(type || 'pending').toLowerCase()] || map['pending']
}

const trackingLabel = (s) => {
  switch (s) {
    case 'COMPLETED':            return 'Completed'
    case 'IN_TRANSIT':           return 'On the Way'
    case 'PICKED_UP':            return 'Picked Up'
    case 'ARRIVED_AT_OFFICE':    return 'Received by Office'
    case 'DISCREPANCY_REPORTED': return 'Issue Reported'
    default:                     return 'Registered'
  }
}

const getAvatarColor = (initials) => {
  const colors = [
    'bg-candy-orange/20 text-candy-orange',
    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  ]
  const index = (initials || '?').charCodeAt(0) % colors.length
  return colors[index]
}

const initialsOf = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

const fmtDate = (v) => {
  if (!v) return '-'
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(v))
}

const shortId = (id) => {
  const s = String(id || '')
  return `#${s.slice(0, 6).toUpperCase()}`
}
</script>

<template>
  <div class="dashboard-card rounded-2xl overflow-hidden">
    <!-- Table Header Bar -->
    <div class="flex items-center justify-between p-5 border-b border-gray-200 dark:border-onyx-border">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Recent Documents</h3>
      <div class="flex items-center gap-3">
        <!-- Search -->
        <div class="relative">
          <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            v-model="searchQuery"
            placeholder="Search documents"
            class="pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-onyx-black/30 border border-gray-200 dark:border-onyx-border w-40 outline-none focus:border-candy-orange transition text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
          />
        </div>
        <!-- Filter Button -->
        <div class="relative">
          <button
            type="button"
            class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition"
            :class="priorityFilter !== 'All'
              ? 'border-candy-orange text-candy-orange bg-candy-orange/5'
              : 'border-gray-200 dark:border-onyx-border text-gray-600 dark:text-gray-400 hover:border-candy-orange'"
            @click="showFilterMenu = !showFilterMenu"
          >
            <Icon name="ph:funnel" class="w-4 h-4" />
            Filter
            <span v-if="priorityFilter !== 'All'" class="ml-0.5 rounded-full bg-candy-orange px-1.5 text-[13px] font-bold text-white">1</span>
          </button>

          <Teleport to="body">
            <div v-if="showFilterMenu" class="fixed inset-0 z-40" @click="showFilterMenu = false" />
          </Teleport>
          <div
            v-if="showFilterMenu"
            class="absolute right-0 top-full z-50 mt-2 w-40 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-onyx-border dark:bg-onyx-card"
          >
            <p class="px-2.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Priority</p>
            <button
              v-for="option in ['All', 'High', 'Medium', 'Low']"
              :key="option"
              type="button"
              class="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition"
              :class="priorityFilter === option
                ? 'bg-candy-orange/10 text-candy-orange'
                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-onyx-black/40'"
              @click="priorityFilter = option; showFilterMenu = false"
            >
              {{ option }}
              <Icon v-if="priorityFilter === option" name="ph:check-bold" class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3 p-5">
      <div v-for="n in 5" :key="n" class="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-onyx-black/40" />
    </div>

    <!-- Empty -->
    <div v-else-if="!filteredDocs.length" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-candy-orange/10">
        <Icon name="ph:file-dashed" class="h-6 w-6 text-candy-orange" />
      </div>
      <p class="text-xs font-semibold text-gray-700 dark:text-gray-300">No documents yet</p>
      <p class="mt-1 text-[13px] text-gray-400 dark:text-gray-500">Documents your organisation registers will show up here.</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-onyx-border">
            <th class="px-5 py-3 w-12">
              <input
                type="checkbox"
                :checked="selectAll"
                @change="toggleSelectAll"
                class="w-4 h-4 rounded accent-candy-orange"
              />
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Document ID
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Subject
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Priority
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Uploaded By
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Status
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Created Date
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Tracking
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="doc in pagedDocs"
            :key="doc.id"
            class="border-b border-gray-100 dark:border-onyx-border/50 hover:bg-gray-50 dark:hover:bg-onyx-black/30 transition-colors cursor-pointer group"
          >
            <!-- Checkbox -->
            <td class="px-5 py-3.5">
              <input
                type="checkbox"
                v-model="doc.selected"
                class="w-4 h-4 rounded accent-candy-orange"
              />
            </td>
            <!-- Document ID -->
            <td class="px-5 py-3.5">
              <span class="text-xs font-semibold text-gray-900 dark:text-white">{{ shortId(doc.id) }}</span>
            </td>
            <!-- Subject -->
            <td class="px-5 py-3.5">
              <span class="text-xs text-gray-700 dark:text-gray-300">{{ doc.title || 'Untitled' }}</span>
            </td>
            <!-- Priority -->
            <td class="px-5 py-3.5">
              <span class="badge rounded-full" :class="getPriorityClass(doc.priority)">
                <span
                  class="status-dot"
                  :class="{
                    'bg-red-500': normalizedPriority(doc.priority) === 'High',
                    'bg-amber-500': normalizedPriority(doc.priority) === 'Medium',
                    'bg-emerald-500': normalizedPriority(doc.priority) === 'Low',
                  }"
                ></span>
                {{ normalizedPriority(doc.priority) }}
              </span>
            </td>
            <!-- Uploaded By -->
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-2.5">
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold"
                  :class="getAvatarColor(initialsOf(doc.uploader_name))"
                >
                  {{ initialsOf(doc.uploader_name) }}
                </div>
                <span class="text-xs text-gray-700 dark:text-gray-300">{{ doc.uploader_name || 'Unknown' }}</span>
              </div>
            </td>
            <!-- Status -->
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-1.5">
                <Icon
                  :name="getStatusIcon(doc.status).icon"
                  class="w-4 h-4"
                  :class="getStatusIcon(doc.status).color"
                />
                <span class="text-xs text-gray-700 dark:text-gray-300">{{ doc.status || 'Pending' }}</span>
              </div>
            </td>
            <!-- Created Date -->
            <td class="px-5 py-3.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ fmtDate(doc.created_at) }}</span>
            </td>
            <!-- Tracking -->
            <td class="px-5 py-3.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ trackingLabel(doc.tracking_status) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="filteredDocs.length" class="flex items-center justify-center gap-2 p-4 border-t border-gray-200 dark:border-onyx-border">
      <button
        class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-onyx-card transition disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        <Icon name="ph:caret-left" class="w-4 h-4 text-gray-500" />
      </button>
      <button
        v-for="i in totalPages"
        :key="i"
        @click="currentPage = i"
        class="w-2 h-2 rounded-full transition-colors"
        :class="currentPage === i ? 'bg-candy-orange' : 'bg-gray-300 dark:bg-gray-600'"
      />
      <button
        class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-onyx-card transition disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        <Icon name="ph:caret-right" class="w-4 h-4 text-gray-500" />
      </button>
    </div>
  </div>
</template>
