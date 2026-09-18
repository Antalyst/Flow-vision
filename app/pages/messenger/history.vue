<template>
  <div class="space-y-6 pb-20">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
          <Icon name="ph:clock-counter-clockwise-light" class="h-4 w-4 text-amber-500" />
          <span>Messenger Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3" />
          <span class="font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Transaction History</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">History</h1>
        <p class="mt-1 text-sm" :class="mutedClass">Your recent pickups and drop-offs.</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-none border px-4 py-2 text-sm font-semibold transition"
        :class="isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'"
        :disabled="pending"
        @click="refresh()"
      >
        <Icon name="ph:arrows-clockwise-light" class="h-4 w-4" :class="{ 'animate-spin': pending }" />
        Refresh
      </button>
    </div>

    <!-- Stats summary cards -->
    <div class="grid grid-cols-2 gap-4">
      <div class="dashboard-card flex flex-col p-5">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider" :class="mutedClass">Pickups</h3>
          <Icon name="ph:package-light" class="h-5 w-5 text-amber-500" />
        </div>
        <p class="text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ totalPickups }}</p>
      </div>
      <div class="dashboard-card flex flex-col p-5">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider" :class="mutedClass">Drop-offs</h3>
          <Icon name="ph:buildings-light" class="h-5 w-5 text-emerald-500" />
        </div>
        <p class="text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ totalDropoffs }}</p>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-if="error"
      class="rounded-none border border-red-500 bg-transparent px-4 py-3 text-sm text-red-500"
    >
      Failed to load history: {{ error.message }}
    </div>

    <!-- Loading state -->
    <div v-else-if="pending && (!history || history.length === 0)" class="py-10 text-center text-sm" :class="mutedClass">
      <Icon name="ph:spinner-gap-light" class="mx-auto h-6 w-6 animate-spin mb-2" />
      Loading transaction history…
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!history || history.length === 0"
      class="rounded-none border border-dashed px-4 py-12 text-center text-sm"
      :class="isDark ? 'border-zinc-700 text-zinc-500' : 'border-gray-200 text-gray-400'"
    >
      <Icon name="ph:clock-light" class="mx-auto h-8 w-8 mb-3 opacity-50" />
      <p>No transaction history found.</p>
      <p class="mt-1 text-xs">Completed pickups and drop-offs will appear here.</p>
    </div>

    <!-- History list -->
    <div v-else class="space-y-4">
      <div
        v-for="event in history"
        :key="event.id"
        class="dashboard-card flex flex-col gap-4 p-5 md:flex-row md:items-center"
      >
        <!-- Icon based on status -->
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none border" :class="getStatusIconClass(event.status)">
          <Icon :name="getStatusIcon(event.status)" class="h-5 w-5" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[13px] font-bold uppercase tracking-wider" :class="getStatusTextClass(event.status)">
              {{ formatStatus(event.status) }}
            </span>
            <span class="text-xs" :class="mutedClass">&bull; {{ formatTime(event.created_at) }}</span>
          </div>
          
          <h4 class="truncate text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ event.document?.title || 'Unknown Document' }}
          </h4>
          
          <p v-if="event.office_name" class="mt-1 text-xs" :class="mutedClass">
            Location: <span class="font-medium" :class="isDark ? 'text-zinc-300' : 'text-gray-700'">{{ event.office_name }}</span>
          </p>
          
          <p v-if="event.notes" class="mt-1.5 text-xs italic" :class="mutedClass">
            "{{ event.notes }}"
          </p>
        </div>

        <div class="text-right md:min-w-[120px]">
          <span class="text-[13px] font-mono" :class="isDark ? 'text-zinc-500' : 'text-gray-400'">
            ID: {{ event.document?.qr_code_data?.split('-').pop()?.substring(0, 8) || 'N/A' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({ layout: 'messenger' })

const { isDark, mutedClass } = useTheme()

const { data, pending, error, refresh } = useFetch<any>('/api/messenger/history', {
  headers: useRequestHeaders(['cookie']),
  server: false, // Wait for client-side to prevent full page crash on SSR error
})

const history = computed(() => data.value?.data || [])

const totalPickups = computed(() => {
  return history.value.filter((e: any) => e.status === 'PICKED_UP').length
})

const totalDropoffs = computed(() => {
  return history.value.filter((e: any) => e.status === 'ARRIVED_AT_OFFICE' || e.status === 'COMPLETED').length
})

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  })
}

const formatStatus = (status: string) => {
  switch (status) {
    case 'PICKED_UP': return 'Picked Up'
    case 'ARRIVED_AT_OFFICE': return 'Dropped Off'
    case 'COMPLETED': return 'Completed'
    case 'DISCREPANCY_REPORTED': return 'Issue Flagged'
    default: return status.replace(/_/g, ' ')
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PICKED_UP': return 'ph:package-light'
    case 'ARRIVED_AT_OFFICE': return 'ph:buildings-light'
    case 'COMPLETED': return 'ph:check-circle-light'
    case 'DISCREPANCY_REPORTED': return 'ph:warning-circle-light'
    default: return 'ph:info-light'
  }
}

const getStatusIconClass = (status: string) => {
  switch (status) {
    case 'PICKED_UP': return 'border-amber-500 bg-transparent text-amber-500'
    case 'ARRIVED_AT_OFFICE': return 'border-emerald-500 bg-transparent text-emerald-500'
    case 'COMPLETED': return 'border-blue-500 bg-transparent text-blue-500'
    case 'DISCREPANCY_REPORTED': return 'border-red-500 bg-transparent text-red-500'
    default: return 'border-gray-500 bg-transparent text-gray-500'
  }
}

const getStatusTextClass = (status: string) => {
  switch (status) {
    case 'PICKED_UP': return 'text-amber-500'
    case 'ARRIVED_AT_OFFICE': return 'text-emerald-500'
    case 'COMPLETED': return 'text-blue-500'
    case 'DISCREPANCY_REPORTED': return 'text-red-500'
    default: return 'text-gray-500'
  }
}
</script>
