<script setup lang="ts">
import type { ClientDashboardPayload } from '~~/server/utils/dashboardAnalytics'

const props = defineProps<{
  offices: ClientDashboardPayload['topOfficesByVelocity'] | null | undefined
  loading?: boolean
}>()

const searchQuery = ref('')
const filteredOffices = computed(() => {
  const rows = props.offices ?? []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((o) => o.name.toLowerCase().includes(q))
})
</script>

<template>
  <div class="matrix-card overflow-hidden transition-all duration-300 hover:scale-[1.005]">
    <div class="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-amber-500">Velocity Matrix</p>
        <h3 class="mt-0.5 text-sm font-semibold text-white">Top Offices by Processing Speed</h3>
      </div>
      <div class="relative">
        <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input
          v-model="searchQuery"
          placeholder="Filter offices"
          class="w-36 rounded-lg border border-zinc-800 bg-zinc-950/80 py-1.5 pl-8 pr-2 text-xs text-zinc-300 outline-none transition focus:border-amber-500/50"
        />
      </div>
    </div>

    <div v-if="loading" class="px-5 py-12 text-center text-sm text-zinc-500">
      <Icon name="ph:spinner-gap" class="mx-auto mb-2 h-6 w-6 animate-spin text-amber-500" />
      Loading office velocity…
    </div>

    <div v-else-if="!filteredOffices.length" class="px-5 py-12 text-center text-sm text-zinc-500">
      No office velocity data yet.
    </div>

    <div v-else class="divide-y divide-zinc-800/80">
      <div
        v-for="(office, index) in filteredOffices"
        :key="office.id"
        class="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-zinc-950/50"
      >
        <div
          class="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-xs font-bold text-amber-400"
        >
          {{ String(index + 1).padStart(2, '0') }}
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-white">{{ office.name }}</p>
          <p class="mt-0.5 text-xs text-zinc-500">{{ office.activeDocs }} active document{{ office.activeDocs === 1 ? '' : 's' }}</p>
        </div>

        <div class="text-right">
          <p class="text-sm font-bold text-amber-400">{{ office.velocityLabel }}</p>
          <p class="text-[10px] uppercase tracking-wide text-zinc-500">cycle time</p>
        </div>

        <div class="hidden h-8 w-16 overflow-hidden rounded-md bg-zinc-900 sm:block">
          <div
            class="h-full rounded-md bg-gradient-to-r from-amber-600/40 to-amber-400/80 transition-all duration-500 group-hover:from-amber-500/60 group-hover:to-amber-300"
            :style="{ width: `${Math.min(100, Math.max(12, 100 - office.avgCycleHours * 8))}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
