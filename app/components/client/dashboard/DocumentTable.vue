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
        <!-- Menu Dots -->
        <button class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-onyx-card transition">
          <Icon name="ph:dots-three-vertical-bold" class="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
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
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Subject
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Priority
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Assigned To
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Status
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Created Date
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Due
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[14px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="doc in filteredDocs"
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
              <span class="text-xs font-semibold text-gray-900 dark:text-white">{{ doc.id }}</span>
            </td>
            <!-- Subject -->
            <td class="px-5 py-3.5">
              <span class="text-xs text-gray-700 dark:text-gray-300">{{ doc.subject }}</span>
            </td>
            <!-- Priority -->
            <td class="px-5 py-3.5">
              <span class="badge rounded-full" :class="getPriorityClass(doc.priority)">
                <span
                  class="status-dot"
                  :class="{
                    'bg-red-500': doc.priority === 'High',
                    'bg-amber-500': doc.priority === 'Medium',
                    'bg-emerald-500': doc.priority === 'Low',
                  }"
                ></span>
                {{ doc.priority }}
              </span>
            </td>
            <!-- Assigned To -->
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-2.5">
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold"
                  :class="getAvatarColor(doc.assignedTo.avatar)"
                >
                  {{ doc.assignedTo.avatar }}
                </div>
                <span class="text-xs text-gray-700 dark:text-gray-300">{{ doc.assignedTo.name }}</span>
              </div>
            </td>
            <!-- Status -->
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-1.5">
                <Icon
                  :name="getStatusIcon(doc.statusType).icon"
                  class="w-4 h-4"
                  :class="getStatusIcon(doc.statusType).color"
                />
                <span class="text-xs text-gray-700 dark:text-gray-300">{{ doc.status }}</span>
              </div>
            </td>
            <!-- Created Date -->
            <td class="px-5 py-3.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ doc.createdDate }}</span>
            </td>
            <!-- SLA Due -->
            <td class="px-5 py-3.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ doc.slaDue }}</span>
            </td>
            <!-- Actions -->
            <td class="px-5 py-3.5">
              <button class="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-onyx-border transition">
                <Icon name="ph:dots-three-vertical-bold" class="w-4 h-4 text-gray-500" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-center gap-2 p-4 border-t border-gray-200 dark:border-onyx-border">
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

<script setup>
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = 5
const showFilterMenu = ref(false)
const priorityFilter = ref('All')

const documents = ref([
  {
    id: '#2319',
    subject: 'Payment failed on invoice',
    priority: 'High',
    assignedTo: { name: 'John Doe', avatar: 'JD' },
    status: 'In Review',
    statusType: 'review',
    createdDate: '2025-08-18',
    slaDue: '2h left',
    selected: false,
  },
  {
    id: '#2320',
    subject: 'Login issue',
    priority: 'Medium',
    assignedTo: { name: 'Sarah Lee', avatar: 'SL' },
    status: 'Delivered',
    statusType: 'delivered',
    createdDate: '2025-08-19',
    slaDue: '1h left',
    selected: false,
  },
  {
    id: '#2321',
    subject: 'Feature request export',
    priority: 'Low',
    assignedTo: { name: 'John Doe', avatar: 'JD' },
    status: 'In Progress',
    statusType: 'progress',
    createdDate: '2025-08-19',
    slaDue: '1d left',
    selected: false,
  },
  {
    id: '#2322',
    subject: 'Contract renewal issue',
    priority: 'Medium',
    assignedTo: { name: 'Michael Wong', avatar: 'MW' },
    status: 'In Progress',
    statusType: 'progress',
    createdDate: '2025-08-20',
    slaDue: '9h left',
    selected: false,
  },
])

const selectAll = ref(false)

const toggleSelectAll = () => {
  selectAll.value = !selectAll.value
  documents.value.forEach(d => d.selected = selectAll.value)
}

const filteredDocs = computed(() => {
  let rows = documents.value

  if (priorityFilter.value !== 'All') {
    rows = rows.filter(d => d.priority === priorityFilter.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    rows = rows.filter(d =>
      d.id.toLowerCase().includes(q) ||
      d.subject.toLowerCase().includes(q) ||
      d.assignedTo.name.toLowerCase().includes(q)
    )
  }

  return rows
})

const getPriorityClass = (priority) => {
  const map = { 'High': 'badge-high', 'Medium': 'badge-medium', 'Low': 'badge-low' }
  return map[priority] || 'badge-medium'
}

const getStatusIcon = (type) => {
  const map = {
    'review': { icon: 'ph:clock-fill', color: 'text-candy-orange' },
    'delivered': { icon: 'ph:check-circle-fill', color: 'text-emerald-500' },
    'progress': { icon: 'ph:spinner', color: 'text-blue-500' },
  }
  return map[type] || map['progress']
}

const getAvatarColor = (initials) => {
  const colors = [
    'bg-candy-orange/20 text-candy-orange',
    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  ]
  const index = initials.charCodeAt(0) % colors.length
  return colors[index]
}
</script>
