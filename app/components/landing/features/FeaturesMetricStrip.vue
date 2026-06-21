<template>
  <section
    ref="sectionRef"
    class="features-metric-strip grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
    aria-label="Platform KPI metrics"
  >
    <div
      v-for="metric in metrics"
      :key="metric.label"
      class="features-metric-card flex flex-col rounded-3xl border p-6 transition-all duration-300 ease-out sm:p-8"
      :class="cardClass"
    >
      <p class="text-xs text-neutral-500">Live metric</p>
      <p
        class="mt-3 font-primary text-2xl font-bold leading-none tracking-tight text-neutral-100 sm:text-3xl"
        :class="!isLandingDark && '!text-zinc-900'"
      >
        {{ metric.value }}
      </p>
      <p class="mt-2 flex-1 text-sm leading-relaxed" :class="descClass">
        {{ metric.label }}
      </p>
      <div class="mt-4 flex items-center justify-between">
        <span class="text-xs font-semibold text-candy-orange">{{ metric.delta }}</span>
        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-candy-orange">
          <Icon :name="metric.icon" class="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { FEATURES_TOP_METRICS } from '~/composables/useFeaturesPage'

const { isLandingDark } = useLandingTheme()

const sectionRef = ref<HTMLElement | null>(null)
const metrics = FEATURES_TOP_METRICS

const cardClass = computed(() =>
  isLandingDark.value
    ? 'border-neutral-800 bg-neutral-900'
    : 'border-zinc-200 bg-white',
)

const descClass = computed(() =>
  isLandingDark.value ? 'text-neutral-400' : 'text-zinc-500',
)

defineExpose({ sectionRef })
</script>
