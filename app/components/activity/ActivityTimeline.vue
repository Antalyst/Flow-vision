<template>
  <div class="space-y-5">
    <!-- Filters -->
    <div
      class="flex flex-wrap items-end gap-3 rounded-xl border p-3"
      :class="isDark ? 'border-card-border bg-card-dark/40' : 'border-gray-200 bg-gray-50/80'"
    >
      <div class="min-w-[140px]">
        <label class="mb-1 block text-[10px] font-semibold uppercase tracking-wider" :class="mutedClass">Date range</label>
        <select
          v-model="datePreset"
          class="w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none transition focus:ring-1 focus:ring-amber-500/40"
          :class="inputClass"
        >
          <option value="day">Today</option>
          <option value="week">Past week</option>
          <option value="month">Past month</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div class="min-w-[140px]">
        <label class="mb-1 block text-[10px] font-semibold uppercase tracking-wider" :class="mutedClass">Action type</label>
        <select
          v-model="actionType"
          class="w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none transition focus:ring-1 focus:ring-amber-500/40"
          :class="inputClass"
        >
          <option value="all">All</option>
          <option value="upload">Uploads</option>
          <option value="scan">Scans</option>
          <option value="pickup">Pickups</option>
        </select>
      </div>

      <button
        type="button"
        class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
        :class="isDark ? 'border-card-border text-gray-300' : 'border-gray-200 text-gray-600'"
        :disabled="loading"
        @click="fetchLogs"
      >
        Refresh
      </button>
    </div>

    <!-- Loading / error -->
    <div v-if="loading" class="py-8 text-center text-sm" :class="mutedClass">Loading activity…</div>
    <div v-else-if="error" class="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">{{ error }}</div>
    <div v-else-if="!logs.length" class="py-10 text-center text-sm" :class="mutedClass">No activity in this range.</div>

    <!-- Timeline -->
    <ol v-else class="relative ml-3 border-l pl-6" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
      <li
        v-for="entry in logs"
        :key="entry.id"
        class="relative pb-6 last:pb-0"
      >
        <span
          class="absolute -left-[1.65rem] top-1 flex h-3 w-3 rounded-full ring-4"
          :class="[dotClass(entry.action_type), isDark ? 'ring-rich-black' : 'ring-white']"
        />
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <p class="text-sm font-medium" :class="isDark ? 'text-gray-100' : 'text-gray-900'">{{ entry.message }}</p>
          <time class="text-[11px] tabular-nums whitespace-nowrap" :class="mutedClass">{{ formatWhen(entry.created_at) }}</time>
        </div>
        <p class="mt-0.5 text-xs capitalize" :class="mutedClass">
          {{ entry.user_name || 'System' }}
          <span v-if="entry.action_type"> · {{ entry.action_type }}</span>
        </p>
      </li>
    </ol>
  </div>
</template>

<script setup>
const { isDark } = useTheme()
const { logs, loading, error, datePreset, actionType, fetchLogs } = useActivityLogs()

const mutedClass = computed(() => (isDark.value ? 'text-gray-500' : 'text-gray-400'))
const inputClass = computed(() =>
  isDark.value
    ? 'bg-rich-black/50 border-card-border text-gray-200'
    : 'bg-white border-gray-200 text-gray-800',
)

function dotClass(actionType) {
  const map = {
    upload: 'bg-blue-500',
    scan: 'bg-violet-500',
    pickup: 'bg-amber-500',
    dropoff: 'bg-emerald-500',
    claim: 'bg-amber-500',
    system: 'bg-gray-400',
  }
  return map[actionType] ?? 'bg-gray-400'
}

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

onMounted(() => {
  fetchLogs()
})
</script>
