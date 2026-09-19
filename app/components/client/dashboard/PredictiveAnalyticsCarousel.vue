<script setup lang="ts">
import { computed, ref } from 'vue'
import Highcharts from 'highcharts'
import { Chart as HighchartsVue } from 'highcharts-vue'
import type { ClientDashboardPayload } from '~~/server/utils/dashboardAnalytics'

const props = defineProps<{
  charts: ClientDashboardPayload['charts'] | null | undefined
  microSummaries: ClientDashboardPayload['microSummaries'] | null | undefined
  availableYears?: number[]
  year?: number | null
  month?: number | null
  dayOfWeek?: number | null
  loading?: boolean
}>()

const emit = defineEmits<{ (e: 'update:filters', value: { year?: number | null, month?: number | null, dayOfWeek?: number | null }): void }>()

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const MONTH_OPTIONS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
]

const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  const years = new Set(props.availableYears ?? [])
  years.add(current)
  return [...years].sort((a, b) => b - a)
})

function onYearChange(e: Event) {
  const raw = (e.target as HTMLSelectElement).value
  emit('update:filters', { year: raw === '' ? null : Number(raw) })
}

function onMonthChange(e: Event) {
  const raw = (e.target as HTMLSelectElement).value
  emit('update:filters', { month: raw === '' ? null : Number(raw) })
}

function onDayChange(e: Event) {
  const raw = (e.target as HTMLSelectElement).value
  emit('update:filters', { dayOfWeek: raw === '' ? null : Number(raw) })
}

const {
  themeKey,
  candy,
  gridColor,
  tickColor,
  legendColor,
  tooltip,
  isDark,
} = useChartTheme()

const activeChartIndex = ref(0)
const slideDirection = ref<'next' | 'prev'>('next')

const slides = [
  { title: 'Documents Coming In', subtitle: 'Past activity and the next 7 days' },
  { title: 'Office Busyness', subtitle: 'Normal wait time vs. today\'s wait time' },
  { title: 'Courier Pickup Times', subtitle: 'How long pickups take, day by day' },
]

const commonOptions = computed(() => {
  const isD = isDark.value
  return {
    chart: {
      backgroundColor: 'transparent',
      style: { fontFamily: 'Inter, sans-serif' },
      spacing: [10, 0, 10, 0]
    },
    title: { text: '' },
    credits: { enabled: false },
    legend: {
      itemStyle: { color: legendColor.value, fontWeight: '600', fontSize: '13px' },
      itemHoverStyle: { color: isD ? '#ffffff' : '#000000' }
    },
    tooltip: {
      backgroundColor: tooltip.value.backgroundColor,
      borderColor: tooltip.value.borderColor,
      style: { color: tooltip.value.bodyColor, fontSize: '13px' },
      borderRadius: 0,
      borderWidth: 1,
      shadow: false,
      padding: 12
    },
    xAxis: {
      gridLineWidth: 0,
      lineColor: gridColor.value,
      tickColor: gridColor.value,
      labels: { style: { color: tickColor.value, fontSize: '13px', fontWeight: '600' } }
    },
    yAxis: {
      title: { text: '' },
      gridLineColor: gridColor.value,
      gridLineDashStyle: 'Dash',
      labels: { style: { color: tickColor.value, fontSize: '12px' } }
    },
    plotOptions: {
      series: {
        animation: { duration: 800 },
        marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
        states: { hover: { lineWidthPlus: 0 } },
        lineWidth: 2,
        dataLabels: {
          enabled: true,
          style: { fontSize: '12px', fontWeight: '700', textOutline: 'none', color: tickColor.value }
        }
      },
      column: { borderRadius: 6, borderWidth: 0, pointPadding: 0.12, groupPadding: 0.16 },
      bar: { borderRadius: 6, borderWidth: 0, pointPadding: 0.1 },
      spline: { lineWidth: 2 }
    }
  }
})

const trafficChartData = computed(() => {
  const c = props.charts?.trafficForecast
  if (!c) return null
  const labels = [...c.labels, ...c.forecastLabels]
  const historical = [...c.historical, ...Array(c.forecast.length).fill(null)]
  const forecast = [...Array(c.historical.length).fill(null), ...c.forecast]

  return {
    ...commonOptions.value,
    chart: { ...commonOptions.value.chart, type: 'column' },
    xAxis: { ...commonOptions.value.xAxis, categories: labels },
    plotOptions: {
      ...commonOptions.value.plotOptions,
      series: {
        ...commonOptions.value.plotOptions.series,
        dataLabels: {
          ...commonOptions.value.plotOptions.series.dataLabels,
          formatter(this: { y: number | null }) {
            return this.y === null || this.y === undefined ? '' : String(this.y)
          }
        }
      }
    },
    series: [
      {
        name: 'So Far',
        data: historical,
        color: candy.primary
      },
      {
        name: 'Expected Next 7 Days',
        data: forecast,
        color: candy.forecast
      }
    ]
  }
})

const congestionChartData = computed(() => {
  const c = props.charts?.workstationCongestion
  if (!c) return null

  // Skip offices with no measurable data yet so one real outlier isn't
  // surrounded by a wall of empty bars.
  const keepIndexes = c.labels
    .map((_, i) => i)
    .filter((i) => (c.historicalAvgHours[i] ?? 0) > 0 || (c.currentDelayHours[i] ?? 0) > 0)
  const labels = keepIndexes.length ? keepIndexes.map((i) => c.labels[i]) : c.labels
  const historicalAvgHours = keepIndexes.length ? keepIndexes.map((i) => c.historicalAvgHours[i]) : c.historicalAvgHours
  const currentDelayHours = keepIndexes.length ? keepIndexes.map((i) => c.currentDelayHours[i]) : c.currentDelayHours

  return {
    ...commonOptions.value,
    chart: { ...commonOptions.value.chart, type: 'column' },
    xAxis: {
      ...commonOptions.value.xAxis,
      categories: labels,
      labels: {
        ...commonOptions.value.xAxis.labels,
        rotation: -20,
        formatter(this: { value: string }) {
          const label = String(this.value)
          return label.length > 12 ? `${label.slice(0, 11)}…` : label
        },
      },
    },
    plotOptions: {
      ...commonOptions.value.plotOptions,
      series: {
        ...commonOptions.value.plotOptions.series,
        dataLabels: {
          ...commonOptions.value.plotOptions.series.dataLabels,
          formatter(this: { y: number | null }) {
            return this.y === null || this.y === undefined ? '' : `${this.y}h`
          }
        }
      },
      column: { ...commonOptions.value.plotOptions.column, maxPointWidth: 34 },
    },
    series: [
      {
        name: 'Normal Wait Time',
        data: historicalAvgHours,
        color: candy.strong
      },
      {
        name: "Today's Wait Time",
        data: currentDelayHours,
        color: candy.primary
      }
    ]
  }
})

const messengerChartData = computed(() => {
  const c = props.charts?.messengerLag
  if (!c) return null
  return {
    ...commonOptions.value,
    chart: { ...commonOptions.value.chart, type: 'column' },
    xAxis: { ...commonOptions.value.xAxis, categories: c.labels },
    plotOptions: {
      ...commonOptions.value.plotOptions,
      series: {
        ...commonOptions.value.plotOptions.series,
        dataLabels: {
          ...commonOptions.value.plotOptions.series.dataLabels,
          formatter(this: { y: number | null }) {
            return this.y === null || this.y === undefined ? '' : `${this.y}h`
          }
        }
      }
    },
    series: [
      {
        name: 'Actual Wait Time',
        data: c.waitHours,
        color: candy.primary
      },
      {
        name: 'Expected Wait Time',
        data: c.forecastHours.slice(0, c.labels.length),
        color: candy.forecast
      }
    ]
  }
})

const microBlocks = computed(() => {
  const m = props.microSummaries
  return [
    { label: 'Busiest Hour', value: m?.peakLoadHour ?? '—', icon: 'ph:clock-fill' },
    { label: 'How Busy, on Average', value: m?.avgCongestionIndex?.toFixed(2) ?? '0.00', icon: 'ph:chart-line-up-fill' },
    { label: 'Risk of Delay', value: `${m?.bottleneckRiskRate ?? 0}%`, icon: 'ph:warning-fill' },
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
  <div class="relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all dark:border-white/10 dark:bg-[#111113]">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">
          Forecast · {{ activeChartIndex + 1 }}/{{ slides.length }}
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

    <div class="mb-4 flex flex-wrap items-center gap-2.5">
      <span class="text-xs font-semibold text-zinc-500 dark:text-white-muted">Show me:</span>
      <select
        class="rounded-xl border border-zinc-200 bg-white-pure px-2.5 py-1.5 text-xs font-semibold text-onyx-black outline-none transition focus:border-candy-orange dark:border-onyx-border dark:bg-onyx-black/60 dark:text-white-pure"
        :value="year ?? ''"
        aria-label="Filter by year"
        @change="onYearChange"
      >
        <option value="">Every Year</option>
        <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
      </select>
      <select
        class="rounded-xl border border-zinc-200 bg-white-pure px-2.5 py-1.5 text-xs font-semibold text-onyx-black outline-none transition focus:border-candy-orange dark:border-onyx-border dark:bg-onyx-black/60 dark:text-white-pure"
        :value="month ?? ''"
        aria-label="Filter by month"
        @change="onMonthChange"
      >
        <option value="">Every Month</option>
        <option v-for="m in MONTH_OPTIONS" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
      <select
        class="rounded-xl border border-zinc-200 bg-white-pure px-2.5 py-1.5 text-xs font-semibold text-onyx-black outline-none transition focus:border-candy-orange dark:border-onyx-border dark:bg-onyx-black/60 dark:text-white-pure"
        :value="dayOfWeek ?? ''"
        aria-label="Filter by day of the week"
        @change="onDayChange"
      >
        <option value="">Every Day</option>
        <option v-for="d in DAY_OPTIONS" :key="d.value" :value="d.value">{{ d.label }}s</option>
      </select>
    </div>

    <div
      class="relative overflow-hidden rounded-xl border border-zinc-200 bg-white-pure/60 p-4 backdrop-blur-md transition-colors duration-300 dark:border-onyx-border/80 dark:bg-onyx-black/40"
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
              <HighchartsVue
                v-if="activeChartIndex === 0 && trafficChartData"
                :options="trafficChartData"
                :highcharts="Highcharts"
              />
              <HighchartsVue
                v-else-if="activeChartIndex === 1 && congestionChartData"
                :options="congestionChartData"
                :highcharts="Highcharts"
              />
              <HighchartsVue
                v-else-if="activeChartIndex === 2 && messengerChartData"
                :options="messengerChartData"
                :highcharts="Highcharts"
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
          <span class="text-[13px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-white-muted">{{ block.label }}</span>
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
