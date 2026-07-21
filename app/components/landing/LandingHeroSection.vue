<template>
  <section
    ref="rootRef"
    class="relative flex  min-h-screen bg-transparent sm:bg-transparent xs:bg-transparent w-full flex-col justify-between overflow-hidden font-dashboard mb-10"
    :class="atmosphereBaseClass"
  >
    <!-- Background visual layer -->
    <div class="absolute inset-0 z-0 h-full w-full z-10">
      <img
        src="/bg/Hero/section-one/herobg.png"
        alt="FlowVision abstract routing visual"
        class="hero-center-image h-full w-full origin-center object-contain object-bottom lg:object-cover"
        width="1440"
        height="1440"
      >
    </div>

    <!-- Bottom ambient glow -->
    <div
      class="pointer-events-none absolute bottom-0 left-1/2 z-[1] h-[1000px] w-[1500px] -translate-x-1/2 translate-y-1/2 rounded-t-full bg-orange-500/20 blur-[50px] -z-10"
      aria-hidden="true"
    />

    <!-- Overlay: title + metric panels -->
    <div
      class="relative z-10 flex h-full min-h-screen w-full flex-col justify-between pointer-events-none px-4 pb-12 pt-28 sm:px-6 md:pb-24 md:pt-32 lg:px-8"
    >
      <!-- Top: hero typography -->
      <div class="mx-auto w-full max-w-[1800px] shrink-0 text-center">
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

      <!-- Bottom: metric card grids -->
      <div class="mx-auto w-full max-w-[1800px] shrink-0">
        <!-- Desktop side panels -->
        <div class="hidden grid-cols-12 items-end gap-4 lg:grid md:gap-6">
          <div class="col-span-3 flex flex-col gap-3">
            <div
              v-for="(metric, idx) in leftMetrics"
              :key="`left-${idx}`"
              class="metric-card-left pointer-events-auto origin-center p-5"
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

          <!-- Center spacer — visual shows through from background layer -->
          <div class="col-span-6" aria-hidden="true" />

          <div class="col-span-3 flex flex-col gap-3">
            <div
              v-for="(metric, idx) in rightMetrics"
              :key="`right-${idx}`"
              class="metric-card-right pointer-events-auto origin-center p-5"
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
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
          <div
            v-for="(metric, idx) in allMetrics"
            :key="`mobile-${idx}`"
            class="metric-card-mobile pointer-events-auto origin-center p-4"
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
      scale: 0.96,
      transformOrigin: 'center center',
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
