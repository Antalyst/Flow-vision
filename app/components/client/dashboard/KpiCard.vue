<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  trend: {
    type: String,
    required: true,
  },
  trendUp: {
    type: Boolean,
    default: true,
  },
  sparklineData: {
    type: Array,
    default: () => [0, 0, 0, 0, 0, 0, 0],
  },
})

const gradientId = computed(() => {
  const slug = props.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `sparkline-gradient-${slug}-${Math.random().toString(36).slice(2, 8)}`
})

const polylinePoints = computed(() => {
  const data = props.sparklineData
  if (!data || data.length < 2) return ''

  const width = 100
  const height = 40
  const padY = 4
  const usableHeight = height - padY * 2

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const stepX = width / (data.length - 1)

  return data
    .map((val, i) => {
      const x = i * stepX
      const y = padY + usableHeight - ((val - min) / range) * usableHeight
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const areaPoints = computed(() => {
  if (!polylinePoints.value) return ''
  const data = props.sparklineData
  const width = 100
  const stepX = width / (data.length - 1)
  const lastX = (data.length - 1) * stepX
  return `${polylinePoints.value} ${lastX.toFixed(1)},40 0,40`
})
</script>

<template>
  <div class="dashboard-card dashboard-card-hover p-5 flex flex-col gap-3 relative overflow-hidden">
    <!-- Top row -->
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {{ title }}
      </h3>
      <button
        type="button"
        class="text-gray-400 hover:text-rich-orange transition-colors duration-200"
      >
        <Icon name="ph:arrows-out-simple" class="w-4 h-4" />
      </button>
    </div>

    <!-- Middle -->
    <div class="flex items-end justify-between gap-4">
      <!-- Left side: value + trend -->
      <div class="flex flex-col gap-1">
        <p class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {{ value }}
        </p>
        <div class="flex items-center gap-1.5">
          <span
            class="text-xs font-semibold"
            :class="trendUp ? 'text-emerald-500' : 'text-red-500'"
          >
            {{ trend }}
          </span>
          <span class="text-xs text-muted">vs last week</span>
        </div>
      </div>

      <!-- Right side: sparkline -->
      <svg
        width="100"
        height="40"
        viewBox="0 0 100 40"
        class="flex-shrink-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FF620C" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#FF620C" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- Filled area under the line -->
        <polygon
          :points="areaPoints"
          :fill="`url(#${gradientId})`"
        />

        <!-- Sparkline -->
        <polyline
          :points="polylinePoints"
          fill="none"
          stroke="#FF620C"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>
</template>
