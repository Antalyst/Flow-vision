<script setup lang="ts">
const activeTab = ref('today')
const searchQuery = ref('')

const activities = ref([
  {
    id: 1,
    title: 'Document Updated',
    description: 'Document #2319 SLA updated',
    time: '11:20 AM',
    type: 'update',
    color: 'bg-candy-orange',
    iconColor: 'text-candy-orange',
  },
  {
    id: 2,
    title: 'New Client Added',
    description: 'PT. Alpha Indonesia registered',
    time: '11:15 AM',
    type: 'client',
    color: 'bg-blue-500',
    iconColor: 'text-blue-500',
  },
  {
    id: 3,
    title: 'Agent Reassigned',
    description: 'Document #2322 moved to Michael Wong',
    time: '11:00 AM',
    type: 'reassign',
    color: 'bg-purple-500',
    iconColor: 'text-purple-500',
  },
  {
    id: 4,
    title: 'SLA Breach Risk',
    description: 'Document #2320 "Login issue"',
    time: '10:45 AM',
    type: 'risk',
    color: 'bg-red-500',
    iconColor: 'text-red-500',
  },
  {
    id: 5,
    title: 'Knowledge Base',
    description: 'New article published: "Login Troubleshooting"',
    time: '10:30 AM',
    type: 'knowledge',
    color: 'bg-emerald-500',
    iconColor: 'text-emerald-500',
  },
  {
    id: 6,
    title: 'Customer Feedback',
    description: '"Great support response, thanks Sarah!"',
    time: '10:30 AM',
    type: 'feedback',
    color: 'bg-teal-500',
    iconColor: 'text-teal-500',
  },
])

const filteredActivities = computed(() => {
  if (!searchQuery.value.trim()) return activities.value
  const query = searchQuery.value.toLowerCase().trim()
  return activities.value.filter(
    (a) =>
      a.title.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query),
  )
})
</script>

<template>
  <div class="dashboard-card p-5 flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Latest Updates</h3>
      <button class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-onyx-black/40 transition-colors">
        <Icon name="ph:dots-three-bold" class="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </button>
    </div>

    <!-- Tab pills -->
    <div class="flex bg-gray-100 dark:bg-onyx-black/50 p-1 rounded-xl mb-4">
      <button
        @click="activeTab = 'today'"
        :class="activeTab === 'today' ? 'bg-white dark:bg-onyx-card text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'"
        class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
      >
        Today
      </button>
      <button
        @click="activeTab = 'yesterday'"
        :class="activeTab === 'yesterday' ? 'bg-white dark:bg-onyx-card text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'"
        class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
      >
        Yesterday
      </button>
      <button
        @click="activeTab = 'week'"
        :class="activeTab === 'week' ? 'bg-white dark:bg-onyx-card text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'"
        class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
      >
        This week
      </button>
    </div>

    <!-- Search input -->
    <div class="relative mb-4">
      <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        v-model="searchQuery"
        placeholder="Search activities"
        class="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-onyx-black/30 border border-gray-200 dark:border-onyx-border text-gray-700 dark:text-gray-300 placeholder:text-gray-400 outline-none focus:border-candy-orange transition"
      />
    </div>

    <!-- Activity count -->
    <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
      <span class="font-bold text-gray-900 dark:text-white">{{ filteredActivities.length }}</span> new activities today
    </p>

    <!-- Timeline feed -->
    <div class="flex-1 overflow-y-auto space-y-1">
      <div
        v-for="(activity, index) in filteredActivities"
        :key="activity.id"
        class="flex gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-onyx-black/30 transition-colors cursor-pointer group"
      >
        <!-- Timeline dot -->
        <div class="flex flex-col items-center pt-1">
          <div class="w-2.5 h-2.5 rounded-full" :class="activity.color"></div>
          <div
            v-if="index < filteredActivities.length - 1"
            class="w-px flex-1 bg-gray-200 dark:bg-onyx-border mt-2"
          ></div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-gray-900 dark:text-white">{{ activity.title }}</h4>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">{{ activity.time }}</span>
          </div>
          <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{{ activity.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
