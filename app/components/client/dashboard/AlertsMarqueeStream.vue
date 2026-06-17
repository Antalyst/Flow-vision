<script setup lang="ts">
import type { ClientDashboardPayload } from '~~/server/utils/dashboardAnalytics'

const props = defineProps<{
  alerts: ClientDashboardPayload['recentAlerts'] | null | undefined
  loading?: boolean
}>()

const toneBorder: Record<string, string> = {
  amber: 'border-amber-500/40',
  orange: 'border-orange-500/40',
  emerald: 'border-emerald-500/40',
  red: 'border-red-500/40',
  zinc: 'border-zinc-600',
}

const toneDot: Record<string, string> = {
  amber: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]',
  orange: 'bg-orange-500 shadow-[0_0_8px_rgba(255,98,12,0.7)]',
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
  zinc: 'bg-zinc-500',
}

const displayAlerts = computed(() => {
  const rows = props.alerts ?? []
  return rows.length > 0 ? [...rows, ...rows] : []
})
</script>

<template>
  <div class="matrix-card flex h-full max-h-[420px] flex-col overflow-hidden p-5 transition-all duration-300 hover:scale-[1.01]">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-amber-500">Live Stream</p>
        <h3 class="mt-1 text-sm font-semibold text-white">Real-Time Alerts</h3>
      </div>
      <span class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
        Live
      </span>
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-zinc-500">
      <Icon name="ph:spinner-gap" class="mr-2 h-5 w-5 animate-spin text-amber-500" />
      Syncing alerts…
    </div>

    <div v-else-if="!alerts?.length" class="flex flex-1 items-center justify-center text-center text-xs text-zinc-500">
      No recent system events for your organisation.
    </div>

    <div v-else class="relative flex-1 overflow-hidden">
      <div class="matrix-marquee space-y-2">
        <div
          v-for="(alert, index) in displayAlerts"
          :key="`${alert.id}-${index}`"
          class="flex gap-3 rounded-xl border bg-zinc-950/50 px-3 py-2.5"
          :class="toneBorder[alert.tone]"
        >
          <span class="mt-1 h-2 w-2 flex-none rounded-full" :class="toneDot[alert.tone]" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-xs font-semibold text-white">{{ alert.title }}</p>
              <span class="flex-none text-[10px] text-zinc-500">{{ alert.time }}</span>
            </div>
            <p class="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-400">{{ alert.message }}</p>
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
