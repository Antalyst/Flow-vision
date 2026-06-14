<template>
  <div class="dashboard-card overflow-hidden">
    <!-- Table Header Bar -->
    <div class="flex items-center justify-between p-5 border-b border-gray-200 dark:border-card-border">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Document Monitoring</h3>
      <div class="flex items-center gap-3">
        <!-- Search -->
        <div class="relative">
          <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            v-model="searchQuery"
            placeholder="Document"
            class="pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-rich-black/30 border border-gray-200 dark:border-card-border w-40 outline-none focus:border-rich-orange transition text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
          />
        </div>
        <!-- Filter Button -->
        <button class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-card-border text-gray-600 dark:text-gray-400 hover:border-rich-orange transition">
          <Icon name="ph:funnel" class="w-4 h-4" />
          Filter
        </button>
        <!-- Menu Dots -->
        <button class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-card-dark transition">
          <Icon name="ph:dots-three-vertical-bold" class="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-card-border">
            <th class="px-5 py-3 w-12">
              <input
                type="checkbox"
                :checked="selectAll"
                @change="toggleSelectAll"
                class="w-4 h-4 rounded accent-rich-orange"
              />
            </th>
            <th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Document ID
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Subject
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Priority
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Assigned To
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Status
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Created Date
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              SLA Due
              <Icon name="ph:arrows-down-up" class="w-3 h-3 inline ml-1 text-gray-400" />
            </th>
            <th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="doc in filteredDocs"
            :key="doc.id"
            class="border-b border-gray-100 dark:border-card-border/50 hover:bg-gray-50 dark:hover:bg-rich-black/30 transition-colors cursor-pointer group"
          >
            <!-- Checkbox -->
            <td class="px-5 py-3.5">
              <input
                type="checkbox"
                v-model="doc.selected"
                class="w-4 h-4 rounded accent-rich-orange"
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
              <span class="badge" :class="getPriorityClass(doc.priority)">
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
                  class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
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
              <button class="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-card-border transition">
                <Icon name="ph:dots-three-vertical-bold" class="w-4 h-4 text-gray-500" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-center gap-2 p-4 border-t border-gray-200 dark:border-card-border">
      <button
        class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-card-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
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
        :class="currentPage === i ? 'bg-rich-orange' : 'bg-gray-300 dark:bg-gray-600'"
      />
      <button
        class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-card-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
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
  if (!searchQuery.value) return documents.value
  const q = searchQuery.value.toLowerCase()
  return documents.value.filter(d =>
    d.id.toLowerCase().includes(q) ||
    d.subject.toLowerCase().includes(q) ||
    d.assignedTo.name.toLowerCase().includes(q)
  )
})

const getPriorityClass = (priority) => {
  const map = { 'High': 'badge-high', 'Medium': 'badge-medium', 'Low': 'badge-low' }
  return map[priority] || 'badge-medium'
}

const getStatusIcon = (type) => {
  const map = {
    'review': { icon: 'ph:clock-fill', color: 'text-rich-orange' },
    'delivered': { icon: 'ph:check-circle-fill', color: 'text-emerald-500' },
    'progress': { icon: 'ph:spinner', color: 'text-blue-500' },
  }
  return map[type] || map['progress']
}

const getAvatarColor = (initials) => {
  const colors = [
    'bg-rich-orange/20 text-rich-orange',
    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  ]
  const index = initials.charCodeAt(0) % colors.length
  return colors[index]
}
</script>
