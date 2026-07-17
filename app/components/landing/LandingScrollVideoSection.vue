<template>
  <section
    ref="sectionRef"
    class="relative h-[1200vh] bg-transparent xs:bg-transparent sm:bg-transparent w-full overflow-visible font-dashboard"
  >
    <div
      ref="pinWrapperRef"
      class="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden py-14 "
    >
      <div class="relative h-full w-full overflow-hidden">
        <!-- Video: contained + centered on mobile, immersive cover on lg+ -->
        <div
          class="absolute inset-0 z-0 flex items-center justify-center px-4 pb-44 pt-36 sm:px-6 sm:pb-40 sm:pt-32 lg:p-0"
        >
          <video
            ref="videoRef"
            class="block max-h-[min(52vh,calc(100dvh-22rem))] w-full max-w-full origin-center rounded-lg object-contain opacity-0 transition-opacity duration-300 will-change-transform lg:absolute lg:inset-0 lg:max-h-none lg:h-full lg:w-full lg:max-w-none lg:rounded-none lg:object-cover"
            src="/bg/Hero/section-tree/output.mp4"
            muted
            playsinline
            preload="auto"
            aria-label="FlowVision scroll-driven product visual"
            @loadedmetadata="onVideoMetadata"
          />
        </div>

        <div
          class="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#0d0d0d] via-black/50 to-[#0d0d0d] lg:from-[#0d0d0d]/95 lg:via-black/40"
          aria-hidden="true"
        />

        <div
          class="pointer-events-none absolute inset-0 z-30 grid h-full grid-rows-[auto_1fr_auto] gap-3 p-4 sm:gap-4 sm:p-6 lg:flex lg:flex-col lg:justify-between lg:gap-0 lg:p-10 xl:p-12"
        >
          <!-- Chapter hero — top on mobile, upper-left on desktop -->
          <div class="relative w-full min-h-0 lg:min-h-[14rem] lg:max-w-3xl">
            <article
              v-for="(chapter, index) in chapters"
              :key="chapter.title"
              :ref="(el) => setHeroRef(el, index)"
              class="absolute left-0 top-0 w-full max-w-full opacity-0 lg:max-w-2xl xl:max-w-3xl"
            >
              <div class="rounded-xl border border-white/5 bg-black/40 p-4 shadow-lg backdrop-blur-sm sm:p-5 md:p-6 lg:p-8">
                <p class="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-candy-orange sm:mb-3 sm:text-xs md:text-sm">
                  Chapter {{ String(chapter.number).padStart(2, '0') }}
                </p>
                <h2 class="text-xl font-bold leading-tight tracking-tight text-white-pure sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl">
                  {{ chapter.title }}
                </h2>
                <p class="mt-2 text-xs leading-relaxed text-zinc-200 sm:mt-3 sm:text-sm md:mt-4 md:text-base lg:text-lg lg:leading-loose">
                  {{ chapter.description }}
                </p>
              </div>
            </article>
          </div>

          <!-- Spacer row — keeps video visible between overlays on mobile -->
          <div class="min-h-0 lg:hidden" aria-hidden="true" />

          <!-- Bottom cards -->
          <div class="w-full lg:mt-auto lg:pt-0">
            <div
              class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:flex lg:flex-row lg:items-end lg:justify-between lg:gap-6 xl:gap-8"
            >
              <div class="relative min-h-[5.5rem] w-full sm:min-h-[6.5rem] lg:min-h-[8rem] lg:max-w-xs lg:flex-1 xl:max-w-sm">
                <article
                  v-for="(chapter, index) in chapters"
                  :key="`${chapter.title}-left`"
                  :ref="(el) => setBottomLeftRef(el, index)"
                  class="pointer-events-auto absolute inset-x-0 bottom-0 opacity-0 lg:inset-x-auto lg:left-0 lg:w-full"
                >
                  <div class="rounded-xl border border-white/5 bg-black/40 p-3 shadow-lg backdrop-blur-sm sm:p-4 md:p-5 lg:p-6">
                    <p class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                      {{ chapter.bottomLeft.label }}
                    </p>
                    <h3 class="text-xs font-bold leading-snug text-white-pure sm:text-sm md:text-base lg:text-lg">
                      {{ chapter.bottomLeft.title }}
                    </h3>
                    <p class="mt-1.5 text-[11px] leading-relaxed text-zinc-300 sm:mt-2 sm:text-xs md:text-sm">
                      {{ chapter.bottomLeft.body }}
                    </p>
                  </div>
                </article>
              </div>

              <div class="relative min-h-[5.5rem] w-full sm:min-h-[6.5rem] lg:min-h-[8rem] lg:max-w-xs lg:flex-1 xl:max-w-sm">
                <article
                  v-for="(chapter, index) in chapters"
                  :key="`${chapter.title}-right`"
                  :ref="(el) => setBottomRightRef(el, index)"
                  class="pointer-events-auto absolute inset-x-0 bottom-0 opacity-0 lg:inset-x-auto lg:right-0 lg:w-full"
                >
                  <div class="rounded-xl border border-white/5 bg-black/40 p-3 shadow-lg backdrop-blur-sm sm:p-4 md:p-5 lg:p-6">
                    <p class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                      {{ chapter.bottomRight.label }}
                    </p>
                    <h3 class="text-xs font-bold leading-snug text-white-pure sm:text-sm md:text-base lg:text-lg">
                      {{ chapter.bottomRight.title }}
                    </h3>
                    <p class="mt-1.5 text-[11px] leading-relaxed text-zinc-300 sm:mt-2 sm:text-xs md:text-sm">
                      {{ chapter.bottomRight.body }}
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const INITIAL_SCALE = 0.53
const SCALE_DURATION = 0.15
const SCRUB_DURATION = 0.85
const CHAPTER_COUNT = 5
const CHAPTER_DURATION = SCRUB_DURATION / CHAPTER_COUNT
const STEP_FADE = 0.04

const chapters = [
  {
    number: 1,
    title: 'Enterprise Document Tracking',
    description:
      'FlowVision unifies physical document logistics with digital precision. Track every physical packet, scan, and office handoff across your organization in real time, ensuring strict SLA compliance.',
    bottomLeft: {
      label: 'Core Infrastructure',
      title: 'Unified Routing Mesh',
      body: 'Documents seamlessly traverse a deterministic graph of offices with live telemetry captured at every hop.',
    },
    bottomRight: {
      label: 'SLA Monitoring',
      title: 'Predictive Dashboards',
      body: 'Identify workflow bottlenecks before they become SLA breaches using AI-driven network topology maps.',
    },
  },
  {
    number: 2,
    title: 'Semantic Search & RAG AI',
    description:
      'Turn your physical archives into an intelligent knowledge base. FlowVision extracts metadata from uploads and creates vectorized embeddings for instant, context-aware querying.',
    bottomLeft: {
      label: 'Discovery',
      title: 'Deep Semantic Search',
      body: 'Find documents instantly using natural language queries instead of relying solely on exact keyword matches.',
    },
    bottomRight: {
      label: 'Intelligence',
      title: 'Contextual AI Assistant',
      body: 'Ask the FlowVision AI complex questions about your documents and receive instant, verifiable answers.',
    },
  },
  {
    number: 3,
    title: 'Automated OCR & Classification',
    description:
      'Eliminate manual data entry. Uploaded PDFs and images are automatically processed by advanced OCR, extracting raw text and categorizing payloads for optimal workflow routing.',
    bottomLeft: {
      label: 'Automation',
      title: 'Intelligent Ingestion',
      body: 'Raw files are parsed instantly, generating machine-readable text and extracting vital metadata automatically.',
    },
    bottomRight: {
      label: 'Security',
      title: 'Cloud Document Storage',
      body: 'Payloads are safely split-stored between relational Postgres databases and secure Supabase blob storage.',
    },
  },
  {
    number: 4,
    title: 'Smart QR Verification',
    description:
      'Authenticate the physical chain of custody effortlessly. Messengers scan document QR codes at every pickup, transit, and drop-off point to eliminate manual logging errors.',
    bottomLeft: {
      label: 'Traceability',
      title: 'Instant Handoff Proof',
      body: 'A single quick scan definitively binds the courier, location, and timestamp to the document custody record.',
    },
    bottomRight: {
      label: 'Trust & Audit',
      title: 'Zero-Ambiguity Status',
      body: 'Clients and internal staff share one verified source of truth for where a physical document is right now.',
    },
  },
  {
    number: 5,
    title: 'Workload & Anomaly Analytics',
    description:
      'Leverage machine learning to anticipate operational stress. FlowVision monitors office queues, predicts messenger delays, and surfaces route anomalies automatically.',
    bottomLeft: {
      label: 'Predictive AI',
      title: 'SLA Breach Forecasting',
      body: 'AI analyzes historical routing times and current load to alert admins of potential delays before they happen.',
    },
    bottomRight: {
      label: 'Operations',
      title: 'Messenger Insights',
      body: 'Optimize team performance with data-driven insights into route efficiency and office-level workload volumes.',
    },
  },
]

const sectionRef = ref<HTMLElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const heroRefs = ref<(HTMLElement | null)[]>([])
const bottomLeftRefs = ref<(HTMLElement | null)[]>([])
const bottomRightRefs = ref<(HTMLElement | null)[]>([])

let masterTimeline: gsap.core.Timeline | null = null
let scrollTriggerInstance: ScrollTrigger | null = null

function setHeroRef(el: Element | ComponentPublicInstance | null, index: number) {
  heroRefs.value[index] = el instanceof HTMLElement ? el : null
}

function setBottomLeftRef(el: Element | ComponentPublicInstance | null, index: number) {
  bottomLeftRefs.value[index] = el instanceof HTMLElement ? el : null
}

function setBottomRightRef(el: Element | ComponentPublicInstance | null, index: number) {
  bottomRightRefs.value[index] = el instanceof HTMLElement ? el : null
}

function applyInitialScale(video: HTMLVideoElement) {
  gsap.set(video, {
    scale: INITIAL_SCALE,
    opacity: 0,
    transformOrigin: 'center center',
    force3D: true,
    borderRadius: '999px',
  })
}

function resetOverlay() {
  const resetEl = (el: HTMLElement | null, fromY = 16) => {
    if (!el) return
    gsap.set(el, { opacity: 0, y: fromY, force3D: true })
  }

  heroRefs.value.forEach(el => resetEl(el, 20))
  bottomLeftRefs.value.forEach(el => resetEl(el, 24))
  bottomRightRefs.value.forEach(el => resetEl(el, 24))
}

function resetVideoBaseline() {
  const video = videoRef.value
  if (!video) return

  video.pause()
  video.currentTime = 0
  applyInitialScale(video)
  resetOverlay()
}

function addChapterSteps(tl: gsap.core.Timeline) {
  chapters.forEach((_, index) => {
    const hero = heroRefs.value[index]
    const bottomLeft = bottomLeftRefs.value[index]
    const bottomRight = bottomRightRefs.value[index]
    if (!hero || !bottomLeft || !bottomRight) return

    const chapterStart = SCALE_DURATION + index * CHAPTER_DURATION
    const chapterEnd = chapterStart + CHAPTER_DURATION

    const layers = [
      { el: hero, fromY: 20 },
      { el: bottomLeft, fromY: 28 },
      { el: bottomRight, fromY: 28 },
    ]

    layers.forEach(({ el, fromY }) => {
      tl.set(el, { opacity: 0, y: fromY, force3D: true }, chapterStart)
      tl.to(
        el,
        { opacity: 1, y: 0, duration: STEP_FADE, ease: 'power2.out', immediateRender: false },
        chapterStart,
      )
      tl.to(
        el,
        { opacity: 0, y: -fromY / 2, duration: STEP_FADE, ease: 'power2.in', immediateRender: false },
        chapterEnd - STEP_FADE,
      )
    })
  })
}

function initScrollAnimation() {
  if (!import.meta.client) return
  if (!sectionRef.value || !videoRef.value) return

  const video = videoRef.value
  const section = sectionRef.value

  const duration = Number.isFinite(video.duration) ? video.duration : 0
  if (duration <= 0) return

  gsap.registerPlugin(ScrollTrigger)

  masterTimeline?.kill()
  scrollTriggerInstance?.kill()

  applyInitialScale(video)
  resetOverlay()
  video.pause()
  video.currentTime = 0

  masterTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 2,
      invalidateOnRefresh: true,
      onLeaveBack: () => resetVideoBaseline(),
      onUpdate: (self) => {
        if (self.progress <= 0) {
          applyInitialScale(video)
          resetOverlay()
        }
      },
    },
  })

  masterTimeline.to(video, { opacity: 1, duration: 0.1 }, 0)

  masterTimeline.fromTo(
    video,
    { scale: INITIAL_SCALE, transformOrigin: 'center center', borderRadius: '50rem' },
    { 
      scale: 1, 
      borderRadius: '0rem', 
      ease: 'none', 
      duration: SCALE_DURATION, 
      immediateRender: false 
    },
    0,
  )

  masterTimeline.fromTo(
    video,
    { currentTime: 0 },
    { currentTime: duration, ease: 'none', duration: SCRUB_DURATION, immediateRender: false },
    SCALE_DURATION,
  )

  addChapterSteps(masterTimeline)

  scrollTriggerInstance = masterTimeline.scrollTrigger ?? null

  nextTick(() => ScrollTrigger.refresh())
}

function onVideoMetadata() {
  const video = videoRef.value
  if (!video) return

  gsap.set(video, {
    scale: INITIAL_SCALE,
    opacity: 0,
    transformOrigin: 'center center',
    force3D: true,
  })

  nextTick(() => initScrollAnimation())
}

onMounted(() => {
  if (videoRef.value) {
    applyInitialScale(videoRef.value)
  }

  resetOverlay()

  if (videoRef.value?.readyState >= 1 && Number.isFinite(videoRef.value.duration)) {
    onVideoMetadata()
  }
})

onUnmounted(() => {
  masterTimeline?.kill()
  scrollTriggerInstance?.kill()
  masterTimeline = null
  scrollTriggerInstance = null

  if (videoRef.value) {
    gsap.set(videoRef.value, { clearProps: 'transform,scale,opacity' })
  }

  ;[...heroRefs.value, ...bottomLeftRefs.value, ...bottomRightRefs.value].forEach((el) => {
    if (el) gsap.set(el, { clearProps: 'transform,opacity' })
  })
})
</script>
