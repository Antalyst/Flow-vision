<template>
  <section
    ref="rootRef"
    class="relative w-full pb-8 pt-4 font-dashboard md:pb-12 md:pt-6"
    :class="atmosphereBaseClass"
  >
    <!-- Subtle background grid -->
    <div
      ref="gridRef"
      class="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
   
      aria-hidden="true"
    />

    <div class="relative z-10 mx-auto w-full max-w-[1800px]">
      <!-- Hero typography -->
      <div class="mb-8 text-center md:mb-10">
        <h1
          ref="titleRef"
          class="font-primary text-5xl font-extrabold uppercase tracking-tight text-white-pure md:text-7xl lg:text-8xl"
          :class="!isLandingDark && '!text-zinc-900'"
        >
          Flow Vision
        </h1>
        <p
          ref="subtitleRef"
          class="mx-auto mt-3 max-w-2xl text-sm font-medium tracking-wide md:text-lg"
          :class="heroSubtitleClass"
        >
          AI Powered Document Monitoring Framework
        </p>
      </div>

      <!-- 12-column metrics + center visual -->
      <div class="grid grid-cols-12 items-center gap-4 md:gap-6">
        <!-- Left metrics -->
        <div class="col-span-3 hidden flex-col gap-3 lg:flex">
          <div
            v-for="(metric, idx) in leftMetrics"
            :key="`left-${idx}`"
            class="metric-card-left p-5"
            :class="metricCardClass"
          >
            <p
              class="font-primary text-3xl font-extrabold leading-none tracking-tight text-white-pure xl:text-4xl"
              :class="!isLandingDark && '!text-zinc-900'"
            >
              {{ metric.value }}
            </p>
            <p class="mt-2 text-xs leading-snug text-white-muted">{{ metric.label }}</p>
          </div>
        </div>

        <!-- Center 3D visual -->
        <div class="col-span-12 flex justify-center lg:col-span-6">
          <img
            src="/bg/Hero/section-one/herobg.png"
            alt="FlowVision abstract routing visual"
            class="hero-center-image h-auto w-full max-w-[560px] object-contain lg:max-w-[640px]"
            width="750"
            height="750"
          >
        </div>

        <!-- Right metrics -->
        <div class="col-span-3 hidden flex-col gap-3 lg:flex">
          <div
            v-for="(metric, idx) in rightMetrics"
            :key="`right-${idx}`"
            class="metric-card-right p-5"
            :class="metricCardClass"
          >
            <p
              class="font-primary text-3xl font-extrabold leading-none tracking-tight text-white-pure xl:text-4xl"
              :class="!isLandingDark && '!text-zinc-900'"
            >
              {{ metric.value }}
            </p>
            <p class="mt-2 text-xs leading-snug text-white-muted">{{ metric.label }}</p>
          </div>
        </div>
      </div>

      <!-- Mobile / tablet metrics -->
      <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
        <div
          v-for="(metric, idx) in allMetrics"
          :key="`mobile-${idx}`"
          class="metric-card-mobile p-4"
          :class="metricCardClass"
        >
          <p
            class="font-primary text-2xl font-extrabold text-white-pure"
            :class="!isLandingDark && '!text-zinc-900'"
          >
            {{ metric.value }}
          </p>
          <p class="mt-1.5 text-[10px] leading-snug text-white-muted">{{ metric.label }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { gsap } from 'gsap'

const {
  isLandingDark,
  atmosphereBaseClass,
  metricCardClass,
  heroSubtitleClass,
} = useLandingTheme()

const rootRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const subtitleRef = ref<HTMLElement | null>(null)

const leftMetrics = [
  { value: '99.4%', label: 'SLA Compliance Processing Rate' },
  { value: '+15,000', label: 'Documents Processed Safely' },
  { value: '< 45s', label: 'Average Station Transit Time' },
]

const rightMetrics = [
  { value: '48', label: 'Active Local Government Offices Connected' },
  { value: '0%', label: 'Physical Packet Loss Rate' },
  { value: '24/7', label: 'AI Checkpoint Tracking Availability' },
]

const allMetrics = [...leftMetrics, ...rightMetrics]

let activeTweens: gsap.core.Tween[] = []

onMounted(() => {
  if (!import.meta.client) return

  const textTargets = [titleRef.value, subtitleRef.value].filter(Boolean)
  activeTweens.push(
    gsap.from(textTargets, {
      opacity: 0,
      y: 30,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.12,
      delay: 0.1,
    }),
    gsap.from('.metric-card-left, .metric-card-right, .metric-card-mobile', {
      opacity: 0,
      y: 24,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.08,
      delay: 0.35,
    }),
    gsap.from('.hero-center-image', {
      opacity: 0,
      scale: 0.92,
      duration: 1.2,
      ease: 'power3.out',
      delay: 0.25,
    }),
    gsap.to('.metric-card-left', {
      y: '-=8',
      duration: 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      stagger: 0.2,
    }),
    gsap.to('.metric-card-right', {
      y: '+=8',
      duration: 3.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      stagger: 0.25,
    }),
  )
})

onUnmounted(() => {
  activeTweens.forEach((t) => t.kill())
  activeTweens = []
  gsap.killTweensOf('.metric-card-left, .metric-card-right, .metric-card-mobile, .hero-center-image')
})
</script>

<style scoped>
.landing-grid-light {
  background-image:
    linear-gradient(to right, rgb(228 228 231 / 0.55) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(228 228 231 / 0.55) 1px, transparent 1px);
  background-size: 100px 100px;
}

.landing-grid-dark {
  background-image:
    linear-gradient(to right, rgb(255 255 255 / 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / 0.06) 1px, transparent 1px);
  background-size: 100px 100px;
}
</style>
