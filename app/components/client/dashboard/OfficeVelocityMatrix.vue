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
    <div class="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-onyx-border">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">Velocity Matrix</p>
        <h3 class="mt-0.5 text-sm font-semibold text-onyx-black dark:text-white-pure">Top Offices by Processing Speed</h3>
      </div>
      <div class="relative">
        <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 dark:text-white-muted" />
        <input
          v-model="searchQuery"
          placeholder="Filter offices"
          class="w-36 rounded-lg border border-zinc-200 bg-white-surface py-1.5 pl-8 pr-2 text-xs text-onyx-black outline-none transition focus:border-candy-orange/50 dark:border-onyx-border dark:bg-onyx-black/80 dark:text-white-pure"
        />
      </div>
    </div>

    <div v-if="loading" class="px-5 py-12 text-center text-sm text-zinc-500 dark:text-white-muted">
      <Icon name="ph:spinner-gap" class="mx-auto mb-2 h-6 w-6 animate-spin text-candy-orange" />
      Loading office velocity…
    </div>

    <div v-else-if="!filteredOffices.length" class="px-5 py-12 text-center text-sm text-zinc-500 dark:text-white-muted">
      No office velocity data yet.
    </div>

    <div v-else class="divide-y divide-zinc-200 dark:divide-onyx-border/80">
      <div
        v-for="(office, index) in filteredOffices"
        :key="office.id"
        class="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white-surface dark:hover:bg-onyx-black/50"
      >
        <div
          class="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-zinc-200 bg-white-surface text-xs font-bold text-candy-orange dark:border-onyx-border dark:bg-onyx-black"
        >
          {{ String(index + 1).padStart(2, '0') }}
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-onyx-black dark:text-white-pure">{{ office.name }}</p>
          <p class="mt-0.5 text-xs text-zinc-500 dark:text-white-muted">{{ office.activeDocs }} active document{{ office.activeDocs === 1 ? '' : 's' }}</p>
        </div>

        <div class="text-right">
          <p class="text-sm font-bold text-candy-orange">{{ office.velocityLabel }}</p>
          <p class="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-white-muted">cycle time</p>
        </div>

        <div class="hidden h-8 w-16 overflow-hidden rounded-md bg-zinc-200 sm:block dark:bg-onyx-black">
          <div
            class="h-full rounded-md bg-gradient-to-r from-candy-hover/40 to-candy-orange/80 transition-all duration-500 group-hover:from-candy-orange/60 group-hover:to-candy-orange"
            :style="{ width: `${Math.min(100, Math.max(12, 100 - office.avgCycleHours * 8))}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
