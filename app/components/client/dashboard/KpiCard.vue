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
    class="matrix-card group relative overflow-hidden p-5 transition-all duration-300 hover:scale-[1.02]"
  >
    <div class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-candy-orange/10 blur-2xl opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

    <div class="relative flex items-center justify-between">
      <h3 class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-white-muted">
        {{ title }}
      </h3>
      <span class="h-2 w-2 rounded-full bg-candy-orange shadow-[0_0_8px_rgba(244,125,47,0.8)]" />
    </div>

    <div class="relative mt-4 flex items-end justify-between gap-4">
      <div class="flex flex-col gap-1">
        <p class="text-3xl font-bold tracking-tight text-onyx-black dark:text-white-pure">
          {{ value }}
        </p>
        <div class="flex items-center gap-1.5">
          <span
            class="text-xs font-semibold"
            :class="trendUp ? 'text-candy-orange' : 'text-red-500'"
          >
            {{ trend }}
          </span>
          <span class="text-xs text-zinc-500 dark:text-white-muted">vs last week</span>
        </div>
      </div>

      <svg
        width="100"
        height="40"
        viewBox="0 0 100 40"
        class="flex-shrink-0 opacity-90"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#F47D2F" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#F47D2F" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        <polygon :points="areaPoints" :fill="`url(#${gradientId})`" />
        <polyline
          :points="polylinePoints"
          fill="none"
          stroke="#F47D2F"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>
</template>
