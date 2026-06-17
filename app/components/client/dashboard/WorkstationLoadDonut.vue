<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import type { ClientDashboardPayload } from '~~/server/utils/dashboardAnalytics'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  load: ClientDashboardPayload['workstationLoad'] | null | undefined
  loading?: boolean
}>()

const chartData = computed(() => {
  const l = props.load
  if (!l) return null
  return {
    labels: ['Busy', 'Available', 'In Transit', 'Idle'],
    datasets: [
      {
        data: [l.busy, l.available, l.inTransit, l.idle],
        backgroundColor: [
          'rgba(245, 158, 11, 0.9)',
          'rgba(52, 211, 153, 0.75)',
          'rgba(255, 98, 12, 0.85)',
          'rgba(113, 113, 122, 0.55)',
        ],
        borderColor: 'rgba(24, 24, 27, 0.9)',
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(24,24,27,0.95)',
      titleColor: '#fff',
      bodyColor: '#a1a1aa',
      borderColor: 'rgba(63,63,70,0.8)',
      borderWidth: 1,
    },
  },
}))

const totalDesks = computed(() => {
  const l = props.load
  if (!l) return 0
  return l.busy + l.available + l.inTransit + l.idle
})

const toneClass: Record<string, string> = {
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
  orange: 'text-orange-400',
  zinc: 'text-zinc-300',
}

const toneDot: Record<string, string> = {
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  orange: 'bg-orange-500',
  zinc: 'bg-zinc-500',
}
</script>

<template>
  <div class="matrix-card flex h-full flex-col p-5 transition-all duration-300 hover:scale-[1.01]">
    <div class="mb-4">
      <p class="text-[10px] font-bold uppercase tracking-widest text-amber-500">Office Status</p>
      <h3 class="mt-1 text-sm font-semibold text-white">Workstation Load Distribution</h3>
      <p class="mt-0.5 text-xs text-zinc-400">Busy vs available desks across your org</p>
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-zinc-500">
      <Icon name="ph:spinner-gap" class="mr-2 h-5 w-5 animate-spin text-amber-500" />
      Loading…
    </div>

    <template v-else>
      <div class="relative mx-auto h-44 w-44">
        <ClientOnly>
          <Doughnut v-if="chartData" :data="chartData" :options="chartOptions" />
        </ClientOnly>
        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-2xl font-bold text-white">{{ totalDesks }}</span>
          <span class="text-[10px] uppercase tracking-wider text-zinc-500">Desks</span>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-3">
        <div
          v-for="item in load?.legend ?? []"
          :key="item.label"
          class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5"
        >
          <div class="mb-1 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full" :class="toneDot[item.tone]" />
            <span class="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{{ item.label }}</span>
          </div>
          <p class="text-lg font-bold" :class="toneClass[item.tone]">{{ item.value }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
