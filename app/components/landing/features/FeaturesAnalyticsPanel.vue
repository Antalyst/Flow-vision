<template>
  <div class="features-analytics-panel flex h-full flex-col gap-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-2xl border border-flow-muted/15 bg-flow-void p-5"
      >
        <p class="text-xs text-flow-muted">{{ stat.label }}</p>
        <p class="mt-2 text-xl font-bold text-flow-ink">
          {{ stat.value }}
        </p>
        <p class="mt-1.5 text-xs font-medium text-flow-signal">{{ stat.delta }}</p>
      </div>
    </div>

    <div class="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="flex flex-col overflow-hidden rounded-2xl border border-flow-muted/15 bg-flow-void">
        <div class="flex items-center justify-between px-5 py-4">
          <span class="text-xs text-flow-muted">7-day compliance trend</span>
          <span class="text-xs font-semibold text-flow-signal">+8.2%</span>
        </div>
        <div class="flex flex-1 items-end gap-1.5 px-5 pb-5" style="min-height: 8rem">
          <div
            v-for="(bar, i) in slaBars"
            :key="i"
            class="flex-1 rounded-t-md bg-gradient-to-t from-flow-signal/30 to-flow-signal"
            :style="{ height: `${bar}%` }"
          />
        </div>
      </div>

      <div class="flex flex-col overflow-hidden rounded-2xl border border-flow-muted/15 bg-flow-void">
        <div class="flex items-center justify-between px-5 py-4">
          <span class="text-xs text-flow-muted">Throughput</span>
          <span class="flex items-center gap-1.5 text-xs font-medium text-flow-signal">
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-flow-signal" />
            Live
          </span>
        </div>
        <div class="flex flex-1 items-end gap-1 px-5 pb-5" style="min-height: 8rem">
          <div
            v-for="(h, i) in throughputBars"
            :key="i"
            class="flex-1 rounded-t bg-gradient-to-t from-flow-signal/25 to-flow-signal"
            :style="{ height: `${h}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FEATURES_DASHBOARD_STATS, FEATURES_SLA_BARS, FEATURES_THROUGHPUT_BARS } from '~/composables/useFeaturesPage'

const stats = FEATURES_DASHBOARD_STATS
const slaBars = FEATURES_SLA_BARS
const throughputBars = FEATURES_THROUGHPUT_BARS
</script>
