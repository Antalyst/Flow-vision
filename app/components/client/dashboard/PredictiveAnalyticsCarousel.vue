<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar } from 'vue-chartjs'
import type { ClientDashboardPayload } from '~~/server/utils/dashboardAnalytics'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
)

const props = defineProps<{
  charts: ClientDashboardPayload['charts'] | null | undefined
  microSummaries: ClientDashboardPayload['microSummaries'] | null | undefined
  loading?: boolean
}>()

const activeChartIndex = ref(0)
const slideDirection = ref<'next' | 'prev'>('next')

const slides = [
  {
    title: 'Document Traffic Forecast',
    subtitle: 'Historical volume with 7-day linear projection',
  },
  {
    title: 'Workstation Congestion',
    subtitle: 'Historical processing avg vs live desk delay',
  },
  {
    title: 'Messenger Dispatch Lag',
    subtitle: 'Average pickup wait times across the week',
  },
]

const gridColor = 'rgba(255,255,255,0.06)'
const textColor = '#a1a1aa'

const commonScales = computed(() => ({
  x: {
    grid: { color: gridColor },
    ticks: { color: textColor, font: { size: 11 } },
  },
  y: {
    grid: { color: gridColor },
    ticks: { color: textColor, font: { size: 11 } },
    beginAtZero: true,
  },
}))

const trafficChartData = computed(() => {
  const c = props.charts?.trafficForecast
  if (!c) return null

  const histLen = c.historical.length
  const forecastLen = c.forecast.length
  const labels = [...c.labels, ...c.forecastLabels]
  const historical = [...c.historical, ...Array(forecastLen).fill(null)]
  const forecast = [...Array(histLen - 1).fill(null), c.historical[histLen - 1] ?? 0, ...c.forecast]

  return {
    labels,
    datasets: [
      {
        label: 'Historical',
        data: historical,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        tension: 0.35,
        pointRadius: 3,
        fill: false,
      },
      {
        label: 'Forecast',
        data: forecast,
        borderColor: '#fb923c',
        borderDash: [6, 4],
        backgroundColor: 'transparent',
        tension: 0.35,
        pointRadius: 2,
        fill: false,
      },
    ],
  }
})

const congestionChartData = computed(() => {
  const c = props.charts?.workstationCongestion
  if (!c) return null

  return {
    labels: c.labels,
    datasets: [
      {
        label: 'Historical avg (hrs)',
        data: c.historicalAvgHours,
        backgroundColor: 'rgba(245, 158, 11, 0.65)',
        borderRadius: 6,
      },
      {
        label: 'Current delay (hrs)',
        data: c.currentDelayHours,
        backgroundColor: 'rgba(113, 113, 122, 0.55)',
        borderRadius: 6,
      },
    ],
  }
})

const messengerChartData = computed(() => {
  const c = props.charts?.messengerLag
  if (!c) return null

  return {
    labels: c.labels,
    datasets: [
      {
        label: 'Avg pickup wait (hrs)',
        data: c.waitHours,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.22)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
      {
        label: 'Projected (hrs)',
        data: c.forecastHours.slice(0, c.labels.length),
        borderColor: '#fbbf24',
        borderDash: [5, 4],
        backgroundColor: 'rgba(251, 191, 36, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: textColor, boxWidth: 12 },
    },
  },
  scales: commonScales.value,
}))

const congestionOptions = computed(() => ({
  indexAxis: 'y' as const,
  ...chartOptions.value,
}))

const microBlocks = computed(() => {
  const m = props.microSummaries
  return [
    { label: 'Peak Load Hour', value: m?.peakLoadHour ?? '—', icon: 'ph:clock-fill' },
    { label: 'Avg Congestion Index', value: m?.avgCongestionIndex?.toFixed(2) ?? '0.00', icon: 'ph:chart-line-up-fill' },
    { label: 'Bottleneck Risk', value: `${m?.bottleneckRiskRate ?? 0}%`, icon: 'ph:warning-fill' },
  ]
})

function prevSlide() {
  slideDirection.value = 'prev'
  activeChartIndex.value = (activeChartIndex.value + slides.length - 1) % slides.length
}

function nextSlide() {
  slideDirection.value = 'next'
  activeChartIndex.value = (activeChartIndex.value + 1) % slides.length
}

function goToSlide(index: number) {
  slideDirection.value = index > activeChartIndex.value ? 'next' : 'prev'
  activeChartIndex.value = index
}
</script>

<template>
  <div class="matrix-card-glass p-6 transition-all duration-300 hover:scale-[1.005]">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-amber-500">
          Predictive Analytics · {{ activeChartIndex + 1 }}/{{ slides.length }}
        </p>
        <h3 class="mt-1 text-sm font-semibold text-white">
          {{ slides[activeChartIndex]?.title }}
        </h3>
        <p class="mt-0.5 text-xs text-zinc-400">
          {{ slides[activeChartIndex]?.subtitle }}
        </p>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition hover:border-amber-500/50 hover:text-amber-400"
          aria-label="Previous chart"
          @click="prevSlide"
        >
          <Icon name="ph:caret-left-bold" class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition hover:border-amber-500/50 hover:text-amber-400"
          aria-label="Next chart"
          @click="nextSlide"
        >
          <Icon name="ph:caret-right-bold" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div
      class="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 backdrop-blur-md"
    >
      <div v-if="loading" class="flex h-[280px] items-center justify-center text-sm text-zinc-500">
        <Icon name="ph:spinner-gap" class="mr-2 h-5 w-5 animate-spin text-amber-500" />
        Loading predictive charts…
      </div>

      <div v-else class="relative h-[280px]">
        <Transition
          :name="slideDirection === 'next' ? 'chart-slide-next' : 'chart-slide-prev'"
          mode="out-in"
        >
          <div :key="activeChartIndex" class="absolute inset-0">
            <ClientOnly>
              <Line
                v-if="activeChartIndex === 0 && trafficChartData"
                :data="trafficChartData"
                :options="chartOptions"
              />
              <Bar
                v-else-if="activeChartIndex === 1 && congestionChartData"
                :data="congestionChartData"
                :options="congestionOptions"
              />
              <Line
                v-else-if="activeChartIndex === 2 && messengerChartData"
                :data="messengerChartData"
                :options="chartOptions"
              />
              <div v-else class="flex h-full items-center justify-center text-sm text-zinc-500">
                No chart data available yet.
              </div>
            </ClientOnly>
          </div>
        </Transition>
      </div>
    </div>

    <div class="mt-4 flex justify-center gap-2">
      <button
        v-for="(_, index) in slides"
        :key="index"
        type="button"
        class="h-2 rounded-full transition-all duration-300"
        :class="index === activeChartIndex ? 'w-6 bg-amber-500' : 'w-2 bg-zinc-700'"
        :aria-label="`Show chart ${index + 1}`"
        @click="goToSlide(index)"
      />
    </div>

    <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div
        v-for="block in microBlocks"
        :key="block.label"
        class="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 transition-all duration-300 hover:border-amber-500/30"
      >
        <div class="mb-1 flex items-center gap-2">
          <Icon :name="block.icon" class="h-3.5 w-3.5 text-amber-500" />
          <span class="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{{ block.label }}</span>
        </div>
        <p class="text-lg font-bold text-white">{{ block.value }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-slide-next-enter-active,
.chart-slide-next-leave-active,
.chart-slide-prev-enter-active,
.chart-slide-prev-leave-active {
  transition: all 0.45s ease-in-out;
}

.chart-slide-next-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.chart-slide-next-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

.chart-slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}
.chart-slide-prev-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
