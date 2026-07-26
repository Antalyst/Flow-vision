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
  <div
    class="group relative flex flex-col justify-between overflow-hidden rounded-none border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-[#111113]"
  >
    <div class="relative flex items-center justify-between">
      <h3 class="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {{ title }}
      </h3>
    </div>

    <div class="relative mt-6 flex items-end justify-between gap-4">
      <div class="flex flex-col gap-1.5">
        <p class="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {{ value }}
        </p>
        <div class="flex items-center gap-1.5">
          <span
            class="flex items-center gap-0.5 text-xs font-medium"
            :class="trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
          >
            <Icon :name="trendUp ? 'ph:trend-up' : 'ph:trend-down'" class="h-3 w-3" />
            {{ trend }}
          </span>
          <span class="text-xs text-neutral-400 dark:text-neutral-500">vs last week</span>
        </div>
      </div>

      <svg
        width="100"
        height="40"
        viewBox="0 0 100 40"
        class="flex-shrink-0 opacity-80 transition-opacity group-hover:opacity-100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="trendUp ? '#10B981' : '#EF4444'" stop-opacity="0.2" />
            <stop offset="100%" :stop-color="trendUp ? '#10B981' : '#EF4444'" stop-opacity="0" />
          </linearGradient>
        </defs>
        <polygon :points="areaPoints" :fill="`url(#${gradientId})`" />
        <polyline
          :points="polylinePoints"
          fill="none"
          :stroke="trendUp ? '#10B981' : '#EF4444'"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>
</template>
