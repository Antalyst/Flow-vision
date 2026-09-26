<template>
  <section
    id="hero"
    class="relative flex min-h-screen w-full flex-col overflow-hidden bg-flow-void font-dashboard"
  >
    <div class="absolute inset-0 z-0">
      <FlowVisionScene eager initial-state="idle" />
    </div>

    <div
      class="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-flow-void via-transparent to-flow-void"
      aria-hidden="true"
    />

    <div class="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-4 text-center">
      <p ref="eyebrowRef" class="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-flow-muted sm:text-sm">
        FlowVision
      </p>
      <h1
        ref="titleRef"
        class="max-w-4xl font-primary text-4xl font-semibold leading-[1.1] text-flow-ink sm:text-5xl md:text-6xl lg:text-7xl"
      >
        Intelligence for the movement of your documents.
      </h1>
      <p ref="subtitleRef" class="mt-6 text-base text-flow-muted sm:text-lg">
        Monitor. Understand. Move.
      </p>

      <div ref="actionsRef" class="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          class="rounded-full bg-flow-signal px-7 py-3 text-sm font-semibold text-flow-void transition-colors hover:bg-flow-signal/85"
          @click="openRegister"
        >
          Get started
        </button>
        <button
          type="button"
          class="rounded-full border border-flow-muted/40 px-7 py-3 text-sm font-semibold text-flow-ink transition-colors hover:border-flow-ink"
          @click="scrollToStory"
        >
          See how it works
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { gsap } from 'gsap'
import FlowVisionScene from './scene/FlowVisionScene.vue'

const { openRegister } = useAuthModals()
const { prefersReducedMotion } = useScenePreferences()

const eyebrowRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const subtitleRef = ref<HTMLElement | null>(null)
const actionsRef = ref<HTMLElement | null>(null)

function scrollToStory() {
  document.getElementById('story')?.scrollIntoView({
    behavior: prefersReducedMotion.value ? 'auto' : 'smooth',
  })
}

let entranceTween: gsap.core.Tween | null = null

onMounted(() => {
  if (!import.meta.client || prefersReducedMotion.value) return

  const targets = [eyebrowRef.value, titleRef.value, subtitleRef.value, actionsRef.value].filter(Boolean)
  entranceTween = gsap.from(targets, {
    opacity: 0,
    y: 24,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.12,
    delay: 0.15,
  })
})

onUnmounted(() => {
  entranceTween?.kill()
})
</script>
