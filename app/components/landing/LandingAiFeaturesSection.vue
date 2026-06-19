<template>
  <section class="ai-features-section relative w-full pt-0 font-dashboard">
    <div class="relative z-10 pb-6">
      <div ref="headerRef" class="ai-features-header mb-6 text-center md:mb-8">
        <h2
          class="font-primary text-3xl font-extrabold uppercase tracking-[0.15em] text-white-pure md:text-4xl"
          :class="!isLandingDark && '!text-zinc-900'"
        >
          AI Features
        </h2>
      </div>

      <div class="flex w-full flex-col gap-5">
        <!-- Row 1: Core triple-feature trilogy -->
        <div class="grid w-full grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="feature in topFeatures"
            :key="feature.title"
            class="ai-bento-card flex h-full flex-col"
            :class="featureCardClass"
          >
            <div
              class="mb-4 aspect-[4/3] w-full shrink-0 overflow-hidden rounded-card"
              :class="imageWellClass"
            >
              <img
                :src="feature.image"
                class="h-full w-full object-cover object-center"
                :alt="feature.imageAlt"
                loading="lazy"
              >
            </div>
            <div class="flex flex-1 flex-col p-5 md:p-6">
              <h3 class="font-primary mb-2 text-lg font-bold leading-tight tracking-tight text-candy-orange md:text-xl">
                {{ feature.title }}
              </h3>
              <p class="max-w-prose flex-1 text-sm leading-relaxed text-white-muted">
                {{ feature.description }}
              </p>
              <div class="mt-auto flex flex-wrap gap-2 pt-4">
                <span
                  v-for="tag in feature.tags"
                  :key="tag"
                  class="rounded-full px-2.5 py-1"
                  :class="feature.useDarkPills ? pillBadgeDarkClass : pillBadgeClass"
                >{{ tag }}</span>
              </div>
            </div>
          </article>
        </div>

        <!-- Row 2: NLQ full-width baseline -->
        <article
          class="ai-bento-card ai-nlq-card flex w-full flex-col md:flex-row md:items-center md:gap-6"
          :class="featureCardClass"
        >
          <div
            class="mb-4 aspect-[4/3] w-full shrink-0 overflow-hidden rounded-card md:mb-0 md:w-[280px] md:shrink-0 lg:w-[320px]"
            :class="imageWellClass"
          >
            <img
              :src="ASSETS.naturalLanguageQuery"
              class="h-full w-full object-cover object-center"
              alt="NLQ Speech Bubble Graphic Asset"
              loading="lazy"
            >
          </div>
          <div class="flex min-w-0 flex-1 flex-col justify-center p-5 md:p-6">
            <h3 class="font-primary mb-2 text-xl font-extrabold tracking-tight text-candy-orange md:text-2xl">
              Natural Language Query (NLQ)
            </h3>
            <p class="mb-4 max-w-prose text-sm leading-relaxed text-white-muted">
              Bridge the gap between raw data and decision-making. Using conversational commands, FlowVision instantly synthesizes complex database records into organized, printable reports without manual configuration.
            </p>
            <div class="grid gap-3 border-t border-onyx-border pt-4 sm:grid-cols-3">
              <div v-for="item in nlqFeatures" :key="item.title" class="flex flex-col gap-1">
                <span class="w-fit rounded px-2.5 py-0.5" :class="nlqTagClass">{{ item.title }}</span>
                <p class="text-xs leading-relaxed text-white-muted">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const {
  isLandingDark,
  featureCardClass,
  imageWellClass,
  pillBadgeClass,
  pillBadgeDarkClass,
  nlqTagClass,
} = useLandingTheme()

const ASSETS = {
  smartSummarization: '/bg/Hero/section-two/smart  sumarization.png',
  predictive: '/bg/Hero/section-two/predective.png',
  contextualDiscovery: '/bg/Hero/section-two/Contextual Document DiscoveryDescription.png',
  naturalLanguageQuery: '/bg/Hero/section-two/Natural Language Query.png',
}

const topFeatures = [
  {
    title: 'Smart Summarization',
    description: 'Instantly generate non-sensitive overviews of lengthy documents, allowing officials to grasp the context of a file without reading every page.',
    image: ASSETS.smartSummarization,
    imageAlt: 'Smart Summarization Asset',
    tags: ['Trend Forecasting', 'Privacy-First'],
    useDarkPills: true,
  },
  {
    title: 'Predictive Bottleneck Analysis',
    description: 'Leverage historical processing data to forecast approval durations. The system identifies potential delays before they happen, allowing for smarter office workload re-balancing and faster document turnaround.',
    image: ASSETS.predictive,
    imageAlt: 'Predictive Bottleneck Asset',
    tags: ['Trend Forecasting', 'Route Optimization', 'Delay Alerts'],
    useDarkPills: false,
  },
  {
    title: 'Contextual Document Discovery',
    description: 'Eliminate the search for keywords. Describe your intent in natural language, and our semantic engine retrieves the exact document by understanding the underlying context and meaning.',
    image: ASSETS.contextualDiscovery,
    imageAlt: 'Contextual Discovery Asset',
    tags: ['Intent Recognition', 'Cross-Document Linking', 'Natural Discovery'],
    useDarkPills: false,
  },
]

const nlqFeatures = [
  {
    title: 'Conversational Reporting',
    description: 'Generate complex datasets using plain English commands.',
  },
  {
    title: 'Visual Synthesis',
    description: 'Automatically transforms raw database results into clean, printable PDF reports.',
  },
  {
    title: 'Zero-Technical Barrier',
    description: 'Empowers non-technical staff to perform advanced data queries without SQL knowledge.',
  },
]

const headerRef = ref<HTMLElement | null>(null)
let scrollTriggers: ScrollTrigger[] = []

onMounted(() => {
  if (!import.meta.client) return

  gsap.registerPlugin(ScrollTrigger)

  const section = document.querySelector('.ai-features-section')
  if (!section) return

  if (headerRef.value) {
    const headerTween = gsap.from(headerRef.value, {
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
    })
    if (headerTween.scrollTrigger) scrollTriggers.push(headerTween.scrollTrigger)
  }

  const cardsTween = gsap.from('.ai-bento-card', {
    scrollTrigger: {
      trigger: section,
      start: 'top 75%',
      toggleActions: 'play none none reverse',
    },
    y: 50,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power2.out',
  })
  if (cardsTween.scrollTrigger) scrollTriggers.push(cardsTween.scrollTrigger)

  nextTick(() => ScrollTrigger.refresh())
})

onUnmounted(() => {
  scrollTriggers.forEach((st) => st.kill())
  scrollTriggers = []
  gsap.killTweensOf('.ai-bento-card')
})
</script>
