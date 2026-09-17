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
  isHero: {
    type: Boolean,
    default: false,
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
    class="group relative flex flex-col justify-between overflow-hidden rounded-none p-5 transition-all"
    :class="isHero
      ? 'bg-candy-orange text-white-pure shadow-lg shadow-candy-orange/15 border border-candy-hover'
      : 'bg-white dark:bg-onyx-card border border-zinc-200 dark:border-onyx-border shadow-card hover:border-candy-orange/40 hover:shadow-card-hover'"
  >
    <!-- Header with Title & Arrow Icon (Donezo style) -->
    <div class="relative flex items-center justify-between">
      <span
        class="text-[10px] font-bold uppercase tracking-widest"
        :class="isHero ? 'text-white-pure/90' : 'text-zinc-500 dark:text-white-muted'"
      >
        {{ title }}
      </span>
      <div
        class="flex h-7 w-7 items-center justify-center rounded-none transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        :class="isHero
          ? 'bg-white-pure/20 text-white-pure'
          : 'border border-zinc-200 bg-zinc-50 text-zinc-400 group-hover:border-candy-orange group-hover:text-candy-orange dark:border-onyx-border dark:bg-onyx-black/60 dark:text-white-muted'"
      >
        <Icon name="ph:arrow-up-right-bold" class="h-3.5 w-3.5" />
      </div>
    </div>

    <!-- Value and Trend -->
    <div class="relative mt-5 flex items-end justify-between gap-3">
      <div class="flex flex-col gap-2">
        <p
          class="text-3xl font-extrabold tracking-tight"
          :class="isHero ? 'text-white-pure' : 'text-onyx-black dark:text-white-pure'"
        >
          {{ value }}
        </p>
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-xs font-semibold"
            :class="isHero
              ? 'bg-white-pure/20 text-white-pure'
              : trendUp
                ? 'bg-candy-orange/10 text-candy-orange'
                : 'bg-red-500/10 text-red-400'"
          >
            <Icon :name="trendUp ? 'ph:trend-up-bold' : 'ph:trend-down-bold'" class="h-3 w-3" />
            {{ trend }}
          </span>
          <span
            class="text-[11px]"
            :class="isHero ? 'text-white-pure/80' : 'text-zinc-400 dark:text-white-muted'"
          >
            vs last week
          </span>
        </div>
      </div>

      <!-- Sparkline -->
      <svg
        width="80"
        height="36"
        viewBox="0 0 100 40"
        class="flex-shrink-0 transition-opacity"
        :class="isHero ? 'opacity-90' : 'opacity-70 group-hover:opacity-100'"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              :stop-color="isHero ? '#FFFFFF' : trendUp ? '#F47D2F' : '#EF4444'"
              :stop-opacity="isHero ? '0.35' : '0.25'"
            />
            <stop
              offset="100%"
              :stop-color="isHero ? '#FFFFFF' : trendUp ? '#F47D2F' : '#EF4444'"
              stop-opacity="0"
            />
          </linearGradient>
        </defs>
        <polygon :points="areaPoints" :fill="`url(#${gradientId})`" />
        <polyline
          :points="polylinePoints"
          fill="none"
          :stroke="isHero ? '#FFFFFF' : trendUp ? '#F47D2F' : '#EF4444'"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>
</template>
