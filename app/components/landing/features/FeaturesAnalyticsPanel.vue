<template>
  <div class="features-analytics-panel flex h-full flex-col gap-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-2xl p-5"
        :class="wellClass"
      >
        <p class="text-xs text-neutral-500">{{ stat.label }}</p>
        <p class="mt-2 text-xl font-bold text-neutral-100" :class="!isLandingDark && '!text-zinc-900'">
          {{ stat.value }}
        </p>
        <p class="mt-1.5 text-xs font-medium text-candy-orange">{{ stat.delta }}</p>
      </div>
    </div>

    <div class="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="flex flex-col overflow-hidden rounded-2xl" :class="wellClass">
        <div class="flex items-center justify-between px-5 py-4">
          <span class="text-xs text-neutral-500">7-day compliance trend</span>
          <span class="text-xs font-semibold text-candy-orange">+8.2%</span>
        </div>
        <div class="flex flex-1 items-end gap-1.5 px-5 pb-5" style="min-height: 8rem">
          <div
            v-for="(bar, i) in slaBars"
            :key="i"
            class="flex-1 rounded-t-md bg-gradient-to-t from-candy-orange/30 to-candy-orange"
            :style="{ height: `${bar}%` }"
          />
        </div>
      </div>

      <div class="flex flex-col overflow-hidden rounded-2xl" :class="wellClass">
        <div class="flex items-center justify-between px-5 py-4">
          <span class="text-xs text-neutral-500">Throughput</span>
          <span class="flex items-center gap-1.5 text-xs font-medium text-candy-orange">
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-candy-orange" />
            Live
          </span>
        </div>
        <div class="flex flex-1 items-end gap-1 px-5 pb-5" style="min-height: 8rem">
          <div
            v-for="(h, i) in throughputBars"
            :key="i"
            class="flex-1 rounded-t bg-gradient-to-t from-candy-orange/25 to-candy-orange"
            :style="{ height: `${h}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FEATURES_DASHBOARD_STATS, FEATURES_SLA_BARS, FEATURES_THROUGHPUT_BARS } from '~/composables/useFeaturesPage'

const { isLandingDark } = useLandingTheme()

const stats = FEATURES_DASHBOARD_STATS
const slaBars = FEATURES_SLA_BARS
const throughputBars = FEATURES_THROUGHPUT_BARS

const wellClass = computed(() =>
  isLandingDark.value ? 'bg-neutral-950' : 'bg-zinc-50 border border-zinc-200',
)
</script>
