<template>
  <section
    ref="sectionRef"
    class="relative h-[1200vh] w-full overflow-visible bg-[#0d0d0d] font-dashboard"
  >
    <div
      ref="pinWrapperRef"
      class="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden"
    >
      <div class="relative flex h-full w-full items-center justify-center overflow-hidden">
        <div class="relative inline-block max-w-full overflow-hidden">
          <video
            ref="videoRef"
            class="block h-auto w-[1800px] max-w-none origin-center rounded-lg object-contain opacity-0 transition-opacity duration-300 will-change-transform"
            src="/bg/Hero/section-tree/output.mp4"
            muted
            playsinline
            preload="auto"
            aria-label="FlowVision scroll-driven product visual"
            @loadedmetadata="onVideoMetadata"
          />
        </div>

        <div
          class="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#0d0d0d] via-black/50 to-[#0d0d0d]"
          aria-hidden="true"
        />

        <div
          class="pointer-events-none absolute inset-0 z-30 flex flex-col p-6 md:p-12"
        >
          <!-- Upper-left chapter hero -->
          <div class="relative min-h-[12rem] w-full md:min-h-[16rem] md:max-w-3xl">
            <article
              v-for="(chapter, index) in chapters"
              :key="chapter.title"
              :ref="(el) => setHeroRef(el, index)"
              class="absolute left-0 top-0 w-full max-w-xl opacity-0 md:max-w-3xl"
            >
              <p class="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-candy-orange md:mb-4 md:text-sm">
                Chapter {{ String(chapter.number).padStart(2, '0') }}
              </p>
              <h2 class="text-3xl font-bold leading-[1.05] tracking-tight text-white-pure sm:text-4xl md:text-5xl lg:text-6xl">
                {{ chapter.title }}
              </h2>
              <p class="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300 md:mt-6 md:text-lg md:leading-loose">
                {{ chapter.description }}
              </p>
            </article>
          </div>

          <!-- Bottom card row -->
          <div class="mt-auto w-full">
            <div
              class="flex flex-col items-stretch gap-4 md:flex-row md:items-end md:justify-between md:gap-8"
            >
              <div class="relative min-h-[7.5rem] w-full md:min-h-[8.5rem] md:max-w-sm md:flex-1">
                <article
                  v-for="(chapter, index) in chapters"
                  :key="`${chapter.title}-left`"
                  :ref="(el) => setBottomLeftRef(el, index)"
                  class="pointer-events-auto absolute inset-x-0 bottom-0 opacity-0 md:inset-x-auto md:left-0 md:w-full"
                >
                  <div class="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-md md:p-6">
                    <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      {{ chapter.bottomLeft.label }}
                    </p>
                    <h3 class="text-base font-bold leading-snug text-white-pure md:text-lg">
                      {{ chapter.bottomLeft.title }}
                    </h3>
                    <p class="mt-2 text-sm leading-relaxed text-zinc-400">
                      {{ chapter.bottomLeft.body }}
                    </p>
                  </div>
                </article>
              </div>

              <div class="relative min-h-[7.5rem] w-full md:min-h-[8.5rem] md:max-w-sm md:flex-1">
                <article
                  v-for="(chapter, index) in chapters"
                  :key="`${chapter.title}-right`"
                  :ref="(el) => setBottomRightRef(el, index)"
                  class="pointer-events-auto absolute inset-x-0 bottom-0 opacity-0 md:inset-x-auto md:right-0 md:w-full"
                >
                  <div class="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-md md:p-6">
                    <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      {{ chapter.bottomRight.label }}
                    </p>
                    <h3 class="text-base font-bold leading-snug text-white-pure md:text-lg">
                      {{ chapter.bottomRight.title }}
                    </h3>
                    <p class="mt-2 text-sm leading-relaxed text-zinc-400">
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
    title: 'Structural Overview',
    description:
      'FlowVision unifies offices, couriers, and clients into a single architectural spine—every packet, scan, and status update flows through one coherent system designed for scale.',
    bottomLeft: {
      label: 'Core Layer',
      title: 'Unified Routing Mesh',
      body: 'Documents traverse a deterministic graph of offices with live SLA telemetry at every hop.',
    },
    bottomRight: {
      label: 'Visibility',
      title: 'Real-Time Topology',
      body: 'Operators see the full network map—bottlenecks surface before they become failures.',
    },
  },
  {
    number: 2,
    title: 'Collaborative Brainstorming',
    description:
      'Cross-functional teams coordinate in real time. Handoffs, escalations, and routing decisions stay visible so nothing slips between silos.',
    bottomLeft: {
      label: 'Teams',
      title: 'Shared Decision Rooms',
      body: 'Messengers, clerks, and clients collaborate on the same live custody thread.',
    },
    bottomRight: {
      label: 'Signals',
      title: 'Priority Intelligence',
      body: 'AI-ranked urgency flags keep critical packets ahead of routine volume.',
    },
  },
  {
    number: 3,
    title: 'Document Infrastructure',
    description:
      'Versioned ingestion pipelines classify, encrypt, and archive every file—from first scan through long-term retention—with full audit lineage.',
    bottomLeft: {
      label: 'Pipeline',
      title: 'Ingest & Classify',
      body: 'OCR, metadata extraction, and policy checks run automatically at intake.',
    },
    bottomRight: {
      label: 'Storage',
      title: 'Immutable Archives',
      body: 'Checksum-sealed records satisfy compliance without slowing daily operations.',
    },
  },
  {
    number: 4,
    title: 'Smart QR Verification',
    description:
      'QR checkpoints authenticate custody at every physical touchpoint—pickup, transit, drop-off—closing the loop between digital state and physical reality.',
    bottomLeft: {
      label: 'Scan',
      title: 'Instant Handoff Proof',
      body: 'A single scan binds courier, location, and timestamp to the chain of custody.',
    },
    bottomRight: {
      label: 'Trust',
      title: 'Zero-Ambiguity Status',
      body: 'Clients and staff share one source of truth for where a document is right now.',
    },
  },
  {
    number: 5,
    title: 'Decentralized AI Node Cloud',
    description:
      'Edge AI nodes analyze patterns locally—predicting delays, surfacing anomalies, and responding in seconds without waiting on a central bottleneck.',
    bottomLeft: {
      label: 'Edge',
      title: 'Local Inference',
      body: 'Each office runs lightweight models tuned to its workload and geography.',
    },
    bottomRight: {
      label: 'Scale',
      title: 'Federated Learning',
      body: 'Insights propagate across the network while sensitive data stays on-premise.',
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
    { scale: INITIAL_SCALE, transformOrigin: 'center center' },
    { scale: 1, ease: 'none', duration: SCALE_DURATION, immediateRender: false },
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
