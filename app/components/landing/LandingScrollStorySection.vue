<template>
  <section id="story" ref="sectionRef" class="relative w-full bg-flow-void">
    <template v-if="!prefersReducedMotion">
      <div :style="{ height: `${CHAPTERS.length * 100}vh` }" class="relative">
        <div class="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
          <div class="absolute inset-0">
            <FlowVisionScene ref="sceneRef" initial-state="capture" @ready="onSceneReady" />
          </div>

          <div
            class="pointer-events-none absolute inset-0 bg-gradient-to-b from-flow-void via-transparent to-flow-void"
            aria-hidden="true"
          />

          <div class="relative z-10 mx-auto max-w-2xl px-6 text-center">
            <Transition name="chapter" mode="out-in">
              <div :key="activeIndex">
                <p class="text-xs font-semibold uppercase tracking-[0.35em] text-flow-signal">
                  Chapter {{ String(activeIndex + 1).padStart(2, '0') }}
                </p>
                <h2 class="mt-4 font-primary text-3xl font-semibold leading-tight text-flow-ink sm:text-4xl md:text-5xl">
                  {{ CHAPTERS[activeIndex].title }}
                </h2>
                <p class="mt-4 text-base text-flow-muted sm:text-lg">
                  {{ CHAPTERS[activeIndex].supporting }}
                </p>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div
        v-for="(chapter, index) in CHAPTERS"
        :key="chapter.id"
        class="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.35em] text-flow-signal">
          Chapter {{ String(index + 1).padStart(2, '0') }}
        </p>
        <h2 class="mt-4 font-primary text-3xl font-semibold leading-tight text-flow-ink sm:text-4xl">
          {{ chapter.title }}
        </h2>
        <p class="mt-4 text-base text-flow-muted sm:text-lg">
          {{ chapter.supporting }}
        </p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import FlowVisionScene from './scene/FlowVisionScene.vue'
import type { FlowVisionSceneState } from './scene/useFlowVisionScene'

interface Chapter {
  id: FlowVisionSceneState
  title: string
  supporting: string
}

const CHAPTERS: Chapter[] = [
  {
    id: 'capture',
    title: 'Everything starts with a document.',
    supporting: 'However it arrives, FlowVision brings it into one place.',
  },
  {
    id: 'understand',
    title: 'FlowVision understands what is inside.',
    supporting: 'Content, context, and category — recognized automatically.',
  },
  {
    id: 'route',
    title: 'Send every document where it belongs.',
    supporting: 'The right office, the right person, every time.',
  },
  {
    id: 'monitor',
    title: 'See where everything is.',
    supporting: 'One connected view of every document in motion.',
  },
  {
    id: 'intelligence',
    title: 'Turn document flow into better decisions.',
    supporting: 'Patterns across your organization, ready when you need them.',
  },
]

const { prefersReducedMotion } = useScenePreferences()

const sectionRef = ref<HTMLElement | null>(null)
const sceneRef = ref<InstanceType<typeof FlowVisionScene> | null>(null)
const activeIndex = ref(0)

let mm: ReturnType<typeof gsap.matchMedia> | null = null
let sceneReady = false
let pendingState: FlowVisionSceneState | null = null

function onSceneReady() {
  sceneReady = true
  if (pendingState) {
    sceneRef.value?.setState(pendingState)
    pendingState = null
  }
}

function applyChapter(index: number, localT: number) {
  const chapter = CHAPTERS[index]
  if (!chapter) return

  if (activeIndex.value !== index) activeIndex.value = index

  if (sceneReady) sceneRef.value?.setState(chapter.id)
  else pendingState = chapter.id

  sceneRef.value?.setProgress(localT)
}

onMounted(() => {
  if (!import.meta.client || !sectionRef.value) return

  gsap.registerPlugin(ScrollTrigger)
  mm = gsap.matchMedia()

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.value,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (self.progress <= 0) {
          applyChapter(0, 0)
          return
        }
        const scaled = Math.min(self.progress, 0.999999) * CHAPTERS.length
        const index = Math.floor(scaled)
        applyChapter(index, scaled - index)
      },
      onLeaveBack: () => applyChapter(0, 0),
    })

    return () => trigger.kill()
  })
})

onUnmounted(() => {
  mm?.revert()
  mm = null
})
</script>

<style scoped>
.chapter-enter-active,
.chapter-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.chapter-enter-from,
.chapter-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
