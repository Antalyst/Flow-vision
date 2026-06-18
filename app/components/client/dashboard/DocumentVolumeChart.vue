<script setup lang="ts">
import { ref } from 'vue'
import { useTheme } from '~/composables/useTheme'

const { isDark } = useTheme()

const chartData = ref([
  { day: 'Sun', value: 180 },
  { day: 'Mon', value: 320 },
  { day: 'Tue', value: 584 },
  { day: 'Wed', value: 450 },
  { day: 'Thu', value: 380 },
  { day: 'Fri', value: 520 },
  { day: 'Sat', value: 290 },
])

const totalVolume = '4,790'
const trendPercent = '+8%'
const maxValue = 800
const avgValue = 400

const hoveredIndex = ref(-1)

const yLabels = [
  { label: '800', top: '0%' },
  { label: '600', top: '25%' },
  { label: '400', top: '50%' },
  { label: '200', top: '75%' },
]

const gridLines = ['0%', '25%', '50%', '75%']
</script>

<template>
  <div class="dashboard-card p-6">
    <!-- Header row -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
        Document Volume Trend
      </h3>
      <button
        class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-onyx-border text-sm text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 bg-white dark:bg-onyx-card"
      >
        <Icon name="lucide:calendar" class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
        <span class="font-medium">Last week</span>
        <Icon name="lucide:chevron-down" class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
      </button>
    </div>

    <!-- Summary stats -->
    <div class="mb-8">
      <div class="flex items-baseline gap-3">
        <span class="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
          {{ totalVolume }}
        </span>
        <span class="text-sm font-semibold text-emerald-500">
          {{ trendPercent }}
        </span>
        <span class="text-sm text-white-muted">
          vs last week
        </span>
      </div>
    </div>

    <!-- Chart area -->
    <div class="relative" style="height: 240px">
      <!-- Y-axis labels (right side) -->
      <div
        v-for="item in yLabels"
        :key="item.label"
        class="absolute right-0 text-xs text-gray-400 dark:text-gray-500 font-medium -translate-y-1/2 select-none"
        :style="{ top: item.top }"
      >
        {{ item.label }}
      </div>

      <!-- Grid lines -->
      <div
        v-for="line in gridLines"
        :key="'grid-' + line"
        class="absolute left-0 right-10 border-t border-gray-100 dark:border-onyx-border"
        :style="{ top: line }"
      />

      <!-- Bottom zero line -->
      <div
        class="absolute left-0 right-10 border-t border-gray-200 dark:border-onyx-border"
        style="top: 100%"
      />

      <!-- Average dashed line -->
      <div
        class="absolute left-0 right-10 border-t-2 border-dashed border-candy-orange/40 z-[1]"
        :style="{ top: ((1 - avgValue / maxValue) * 100) + '%' }"
      />

      <!-- Bars container -->
      <div class="flex items-end justify-between h-full pr-10 pb-8">
        <div
          v-for="(item, index) in chartData"
          :key="item.day"
          class="flex flex-col items-center gap-2 flex-1 relative"
          @mouseenter="hoveredIndex = index"
          @mouseleave="hoveredIndex = -1"
        >
          <!-- Tooltip -->
          <div
            v-if="hoveredIndex === index"
            class="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-10 animate-fade-in"
          >
            {{ item.day }}: {{ item.value }}
          </div>

          <!-- Bar -->
          <div
            class="w-full max-w-[48px] rounded-t-lg transition-all duration-300 cursor-pointer"
            :class="hoveredIndex === index
              ? 'bg-candy-orange scale-[1.02]'
              : 'bg-candy-orange/25 dark:bg-candy-orange/20'"
            :style="{ height: (item.value / maxValue * 100) + '%' }"
          />

          <!-- X-axis label -->
          <span class="absolute -bottom-6 text-xs text-gray-500 dark:text-gray-400 font-medium select-none">
            {{ item.day }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
