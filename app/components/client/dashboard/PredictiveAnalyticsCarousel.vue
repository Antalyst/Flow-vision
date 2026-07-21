<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Chart as ChartJSChart } from 'chart.js'
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

const {
  themeKey,
  candy,
  buildCartesianScales,
  buildLegendPlugin,
  buildTooltipPlugin,
  watchChartTheme,
} = useChartTheme()

const activeChartIndex = ref(0)
const slideDirection = ref<'next' | 'prev'>('next')

const trafficChartRef = ref<{ chart: ChartJSChart } | null>(null)
const barChartRef = ref<{ chart: ChartJSChart } | null>(null)
const messengerChartRef = ref<{ chart: ChartJSChart } | null>(null)

watchChartTheme(() => {
  if (activeChartIndex.value === 0) return trafficChartRef.value?.chart
  if (activeChartIndex.value === 1) return barChartRef.value?.chart
  return messengerChartRef.value?.chart
})

const slides = [
  { title: 'Document Traffic Forecast', subtitle: 'Historical volume with 7-day linear projection' },
  { title: 'Workstation Congestion', subtitle: 'Historical processing avg vs live desk delay' },
  { title: 'Messenger Dispatch Lag', subtitle: 'Average pickup wait times across the week' },
]

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: buildLegendPlugin(),
    tooltip: buildTooltipPlugin(),
  },
  scales: buildCartesianScales(),
}))

const congestionOptions = computed(() => ({
  ...chartOptions.value,
  indexAxis: 'y' as const,
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
        borderColor: candy.primary,
        backgroundColor: candy.soft,
        tension: 0.35,
        pointRadius: 3,
        fill: false,
      },
      {
        label: 'Forecast',
        data: forecast,
        borderColor: candy.forecast,
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
        backgroundColor: candy.strong,
        borderRadius: 6,
      },
      {
        label: 'Current delay (hrs)',
        data: c.currentDelayHours,
        backgroundColor: 'rgba(160, 160, 160, 0.45)',
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
        borderColor: candy.primary,
        backgroundColor: candy.medium,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
      {
        label: 'Projected (hrs)',
        data: c.forecastHours.slice(0, c.labels.length),
        borderColor: candy.forecast,
        borderDash: [5, 4],
        backgroundColor: candy.soft,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  }
})

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
        <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">
          Predictive Analytics · {{ activeChartIndex + 1 }}/{{ slides.length }}
        </p>
        <h3 class="mt-1 text-sm font-semibold text-onyx-black dark:text-white-pure">
          {{ slides[activeChartIndex]?.title }}
        </h3>
        <p class="mt-0.5 text-xs text-zinc-500 dark:text-white-muted">
          {{ slides[activeChartIndex]?.subtitle }}
        </p>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-candy-orange/50 hover:text-candy-orange dark:border-onyx-border dark:text-white-muted"
          aria-label="Previous chart"
          @click="prevSlide"
        >
          <Icon name="ph:caret-left-bold" class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-candy-orange/50 hover:text-candy-orange dark:border-onyx-border dark:text-white-muted"
          aria-label="Next chart"
          @click="nextSlide"
        >
          <Icon name="ph:caret-right-bold" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div
      class="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white-pure/60 p-4 backdrop-blur-md transition-colors duration-300 dark:border-onyx-border/80 dark:bg-onyx-black/40"
    >
      <div v-if="loading" class="flex h-[280px] items-center justify-center text-sm text-zinc-500 dark:text-white-muted">
        <Icon name="ph:spinner-gap" class="mr-2 h-5 w-5 animate-spin text-candy-orange" />
        Loading predictive charts…
      </div>

      <div v-else class="relative h-[280px]">
        <Transition
          :name="slideDirection === 'next' ? 'chart-slide-next' : 'chart-slide-prev'"
          mode="out-in"
        >
          <div :key="`${activeChartIndex}-${themeKey}`" class="absolute inset-0">
            <ClientOnly>
              <Line
                v-if="activeChartIndex === 0 && trafficChartData"
                ref="trafficChartRef"
                :data="trafficChartData"
                :options="chartOptions"
              />
              <Bar
                v-else-if="activeChartIndex === 1 && congestionChartData"
                ref="barChartRef"
                :data="congestionChartData"
                :options="congestionOptions"
              />
              <Line
                v-else-if="activeChartIndex === 2 && messengerChartData"
                ref="messengerChartRef"
                :data="messengerChartData"
                :options="chartOptions"
              />
              <div v-else class="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-white-muted">
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
        :class="index === activeChartIndex ? 'w-6 bg-candy-orange' : 'w-2 bg-zinc-300 dark:bg-onyx-border'"
        :aria-label="`Show chart ${index + 1}`"
        @click="goToSlide(index)"
      />
    </div>

    <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div
        v-for="block in microBlocks"
        :key="block.label"
        class="rounded-xl border border-zinc-200 bg-white-surface px-4 py-3 transition-all duration-300 hover:border-candy-orange/30 dark:border-onyx-border dark:bg-onyx-black/70"
      >
        <div class="mb-1 flex items-center gap-2">
          <Icon :name="block.icon" class="h-3.5 w-3.5 text-candy-orange" />
          <span class="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-white-muted">{{ block.label }}</span>
        </div>
        <p class="text-lg font-bold text-onyx-black dark:text-white-pure">{{ block.value }}</p>
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
