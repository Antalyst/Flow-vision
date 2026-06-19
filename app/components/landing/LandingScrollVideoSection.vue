<template>
  <section
    ref="sectionRef"
    class="relative h-[1200vh] w-full overflow-visible bg-[#0d0d0d] font-dashboard"
  >
    <div
      ref="pinWrapperRef"
      class="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden"
    >
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
        <div
          class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-black/50 to-[#0d0d0d]"
          aria-hidden="true"
        />
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

const sectionRef = ref<HTMLElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)

let masterTimeline: gsap.core.Timeline | null = null
let scrollTriggerInstance: ScrollTrigger | null = null

function applyInitialScale(video: HTMLVideoElement) {
  gsap.set(video, {
    scale: INITIAL_SCALE,
    opacity: 0,
    transformOrigin: 'center center',
    force3D: true,
  })
}

function resetVideoBaseline() {
  const video = videoRef.value
  if (!video) return

  video.pause()
  video.currentTime = 0
  applyInitialScale(video)
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
        }
      },
    },
  })

  // Fade in as scroll animation begins
  masterTimeline.to(video, { opacity: 1, duration: 0.1 }, 0)

  // Phase 1 — first 15% of track: scale entrance while sticky holds viewport center
  masterTimeline.fromTo(
    video,
    { scale: INITIAL_SCALE, transformOrigin: 'center center' },
    { scale: 1, ease: 'none', duration: SCALE_DURATION, immediateRender: false },
    0,
  )

  // Phase 2 — remaining 85%: playback scrub
  masterTimeline.fromTo(
    video,
    { currentTime: 0 },
    { currentTime: duration, ease: 'none', duration: SCRUB_DURATION, immediateRender: false },
    SCALE_DURATION,
  )

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

  initScrollAnimation()
}

onMounted(() => {
  if (videoRef.value) {
    applyInitialScale(videoRef.value)
  }

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
})
</script>
