<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Chart as ChartJSChart } from 'chart.js'
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

const {
  themeKey,
  candy,
  donutBorderColor,
  buildTooltipPlugin,
  watchChartTheme,
} = useChartTheme()

const donutChartRef = ref<{ chart: ChartJSChart } | null>(null)
watchChartTheme(() => donutChartRef.value?.chart)

const chartData = computed(() => {
  const l = props.load
  if (!l) return null
  return {
    labels: ['Busy', 'Available', 'In Transit', 'Idle'],
    datasets: [
      {
        data: [l.busy, l.available, l.inTransit, l.idle],
        backgroundColor: [
          'rgba(244, 125, 47, 0.9)',
          'rgba(244, 125, 47, 0.35)',
          'rgba(217, 101, 24, 0.85)',
          'rgba(160, 160, 160, 0.45)',
        ],
        borderColor: donutBorderColor.value,
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
    tooltip: buildTooltipPlugin(),
  },
}))

const totalDesks = computed(() => {
  const l = props.load
  if (!l) return 0
  return l.busy + l.available + l.inTransit + l.idle
})

const toneClass: Record<string, string> = {
  amber: 'text-candy-orange',
  emerald: 'text-candy-orange',
  orange: 'text-candy-hover',
  zinc: 'text-zinc-500 dark:text-white-muted',
}

const toneDot: Record<string, string> = {
  amber: 'bg-candy-orange',
  emerald: 'bg-candy-orange/70',
  orange: 'bg-candy-hover',
  zinc: 'bg-white-muted',
}
</script>

<template>
  <div class="matrix-card flex h-full flex-col p-5 transition-all duration-300 hover:scale-[1.01]">
    <div class="mb-4">
      <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">Office Status</p>
      <h3 class="mt-1 text-sm font-semibold text-onyx-black dark:text-white-pure">Workstation Load Distribution</h3>
      <p class="mt-0.5 text-xs text-zinc-500 dark:text-white-muted">Busy vs available desks across your org</p>
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-zinc-500 dark:text-white-muted">
      <Icon name="ph:spinner-gap" class="mr-2 h-5 w-5 animate-spin text-candy-orange" />
      Loading…
    </div>

    <template v-else>
      <div class="relative mx-auto h-44 w-44">
        <ClientOnly>
          <Doughnut
            v-if="chartData"
            :key="themeKey"
            ref="donutChartRef"
            :data="chartData"
            :options="chartOptions"
          />
        </ClientOnly>
        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-2xl font-bold text-onyx-black dark:text-white-pure">{{ totalDesks }}</span>
          <span class="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-white-muted">Desks</span>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-3">
        <div
          v-for="item in load?.legend ?? []"
          :key="item.label"
          class="rounded-xl border border-zinc-200 bg-white-surface px-3 py-2.5 transition-colors duration-300 dark:border-onyx-border dark:bg-onyx-black/60"
        >
          <div class="mb-1 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full" :class="toneDot[item.tone]" />
            <span class="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-white-muted">{{ item.label }}</span>
          </div>
          <p class="text-lg font-bold" :class="toneClass[item.tone]">{{ item.value }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
