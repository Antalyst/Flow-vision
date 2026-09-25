<script setup lang="ts">
interface Alert {
  id: string
  title: string
  message: string
  time: string
  createdAt: string
  tone: 'amber' | 'orange' | 'zinc' | 'emerald' | 'red'
}

const props = defineProps<{
  alerts?: Alert[]
  loading?: boolean
}>()

const toneDotClass: Record<Alert['tone'], string> = {
  amber: 'bg-amber-500',
  orange: 'bg-candy-orange',
  zinc: 'bg-zinc-400',
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
}

const activeTab = ref('today')
const searchQuery = ref('')

function dayBucket(iso: string): 'today' | 'yesterday' | 'week' {
  const now = new Date()
  const d = new Date(iso)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startOfToday.getTime() - startOfDay.getTime()) / 86_400_000)
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  return 'week'
}

const activities = computed(() => (props.alerts ?? []).map((a) => ({
  ...a,
  day: dayBucket(a.createdAt),
})))

const filteredActivities = computed(() => {
  let rows = activities.value

  if (activeTab.value === 'today') {
    rows = rows.filter((a) => a.day === 'today')
  } else if (activeTab.value === 'yesterday') {
    rows = rows.filter((a) => a.day === 'yesterday')
  }
  // 'week' shows everything, today and yesterday included

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    rows = rows.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.message.toLowerCase().includes(query),
    )
  }

  return rows
})

const activityCountLabel = computed(() => {
  if (activeTab.value === 'today') return 'new activities today'
  if (activeTab.value === 'yesterday') return 'activities yesterday'
  return 'activities this week'
})
</script>

<template>
  <div class="dashboard-card rounded-2xl p-5 flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Latest Updates</h3>
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
      <span class="font-bold text-gray-900 dark:text-white">{{ filteredActivities.length }}</span> {{ activityCountLabel }}
    </p>

    <!-- Loading skeleton -->
    <div v-if="loading" class="flex-1 space-y-3">
      <div v-for="n in 4" :key="n" class="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-onyx-black/40" />
    </div>

    <!-- Timeline feed -->
    <div v-else-if="filteredActivities.length" class="flex-1 overflow-y-auto space-y-1">
      <div
        v-for="(activity, index) in filteredActivities"
        :key="activity.id"
        class="flex gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-onyx-black/30 transition-colors cursor-pointer group"
      >
        <!-- Timeline dot -->
        <div class="flex flex-col items-center pt-1">
          <div class="w-2.5 h-2.5 rounded-full" :class="toneDotClass[activity.tone]"></div>
          <div
            v-if="index < filteredActivities.length - 1"
            class="w-px flex-1 bg-gray-200 dark:bg-onyx-border mt-2"
          ></div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-gray-900 dark:text-white">{{ activity.title }}</h4>
            <span class="text-[13px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">{{ activity.time }}</span>
          </div>
          <p class="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{{ activity.message }}</p>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="flex flex-1 flex-col items-center justify-center py-10 text-center">
      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-candy-orange/10">
        <Icon name="ph:pulse" class="h-6 w-6 text-candy-orange" />
      </div>
      <p class="text-xs font-semibold text-gray-700 dark:text-gray-300">No activity yet</p>
      <p class="mt-1 text-[13px] text-gray-400 dark:text-gray-500">Activity will show up here as documents move.</p>
    </div>
  </div>
</template>
