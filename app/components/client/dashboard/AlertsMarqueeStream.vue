<script setup lang="ts">
import type { ClientDashboardPayload } from '~~/server/utils/dashboardAnalytics'

const props = defineProps<{
  alerts: ClientDashboardPayload['recentAlerts'] | null | undefined
  loading?: boolean
}>()

const toneBorder: Record<string, string> = {
  amber: 'border-candy-orange/40',
  orange: 'border-candy-hover/40',
  emerald: 'border-candy-orange/30',
  red: 'border-red-500/40',
  zinc: 'border-zinc-200 dark:border-onyx-border',
}

const toneDot: Record<string, string> = {
  amber: 'bg-candy-orange shadow-[0_0_8px_rgba(244,125,47,0.7)]',
  orange: 'bg-candy-hover shadow-[0_0_8px_rgba(217,101,24,0.7)]',
  emerald: 'bg-candy-orange/80',
  red: 'bg-red-500',
  zinc: 'bg-white-muted',
}

const displayAlerts = computed(() => {
  const rows = props.alerts ?? []
  return rows.length > 0 ? [...rows, ...rows] : []
})
</script>

<template>
  <div class="relative flex h-full max-h-[420px] flex-col overflow-hidden rounded-none border border-neutral-200 bg-white p-5 shadow-sm transition-all dark:border-white/10 dark:bg-[#111113]">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">Live Stream</p>
        <h3 class="mt-1 text-sm font-semibold text-onyx-black dark:text-white-pure">Real-Time Alerts</h3>
      </div>
      <span class="inline-flex items-center gap-1.5 rounded-full border border-candy-orange/30 bg-candy-orange/10 px-2 py-0.5 text-[13px] font-bold uppercase tracking-wider text-candy-orange">
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-candy-orange" />
        Live
      </span>
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-zinc-500 dark:text-white-muted">
      <Icon name="ph:spinner-gap" class="mr-2 h-5 w-5 animate-spin text-candy-orange" />
      Syncing alerts…
    </div>

    <div v-else-if="!alerts?.length" class="flex flex-1 items-center justify-center text-center text-xs text-zinc-500 dark:text-white-muted">
      No recent system events for your organisation.
    </div>

    <div v-else class="relative flex-1 overflow-hidden">
      <div class="matrix-marquee space-y-2">
        <div
          v-for="(alert, index) in displayAlerts"
          :key="`${alert.id}-${index}`"
          class="flex gap-3 rounded-none border bg-white-surface px-3 py-2.5 transition-colors duration-300 dark:bg-onyx-black/50"
          :class="toneBorder[alert.tone]"
        >
          <span class="mt-1 h-2 w-2 flex-none rounded-full" :class="toneDot[alert.tone]" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-xs font-semibold text-onyx-black dark:text-white-pure">{{ alert.title }}</p>
              <span class="flex-none text-[13px] text-zinc-500 dark:text-white-muted">{{ alert.time }}</span>
            </div>
            <p class="mt-0.5 line-clamp-2 text-[14px] leading-relaxed text-zinc-500 dark:text-white-muted">{{ alert.message }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.matrix-marquee {
  animation: matrix-marquee-scroll 36s linear infinite;
}

.matrix-marquee:hover {
  animation-play-state: paused;
}

@keyframes matrix-marquee-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
</style>
