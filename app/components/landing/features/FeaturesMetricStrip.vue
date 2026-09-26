<template>
  <section
    ref="sectionRef"
    class="features-metric-strip grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
    aria-label="Platform KPI metrics"
  >
    <div
      v-for="metric in metrics"
      :key="metric.label"
      class="features-metric-card flex flex-col rounded-3xl border border-flow-muted/15 bg-flow-void p-6 transition-all duration-300 ease-out sm:p-8"
    >
      <p class="text-xs text-flow-muted">Live metric</p>
      <p class="mt-3 font-primary text-2xl font-bold leading-none tracking-tight text-flow-ink sm:text-3xl">
        {{ metric.value }}
      </p>
      <p class="mt-2 flex-1 text-sm leading-relaxed text-flow-muted">
        {{ metric.label }}
      </p>
      <div class="mt-4 flex items-center justify-between">
        <span class="text-xs font-semibold text-flow-signal">{{ metric.delta }}</span>
        <span class="flex h-8 w-8 items-center justify-center rounded-full border border-flow-muted/20 text-flow-signal">
          <Icon :name="metric.icon" class="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { FEATURES_TOP_METRICS } from '~/composables/useFeaturesPage'

const sectionRef = ref<HTMLElement | null>(null)
const metrics = FEATURES_TOP_METRICS

defineExpose({ sectionRef })
</script>
