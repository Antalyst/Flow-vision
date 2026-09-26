<template>
  <section class="relative w-full bg-flow-void px-4 py-24 sm:px-6 lg:px-8">
    <div class="mx-auto flex max-w-5xl flex-col gap-20 sm:gap-28">
      <article
        v-for="(feature, index) in FEATURES"
        :key="feature.title"
        class="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-16"
      >
        <div :class="index % 2 === 1 ? 'md:order-2' : ''">
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-flow-signal">
            {{ String(index + 1).padStart(2, '0') }}
          </p>
          <h3 class="mt-3 font-primary text-2xl font-semibold text-flow-ink sm:text-3xl">
            {{ feature.title }}
          </h3>
          <p class="mt-4 text-base text-flow-muted sm:text-lg">
            {{ feature.description }}
          </p>
        </div>

        <div
          :class="index % 2 === 1 ? 'md:order-1' : ''"
          class="aspect-square w-full overflow-hidden rounded-2xl border border-flow-muted/15"
        >
          <FlowVisionScene
            :ref="(el) => setFeatureRef(el, index)"
            :initial-state="feature.state"
            @ready="onFeatureReady(index)"
          />
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { gsap } from 'gsap'
import FlowVisionScene from './scene/FlowVisionScene.vue'
import type { FlowVisionSceneState } from './scene/useFlowVisionScene'

interface Feature {
  title: string
  description: string
  state: FlowVisionSceneState
}

const FEATURES: Feature[] = [
  {
    title: 'Smart Document Understanding',
    description: 'FlowVision extracts meaning from documents.',
    state: 'understand',
  },
  {
    title: 'Intelligent Routing',
    description: 'Documents automatically move toward the correct destination.',
    state: 'route',
  },
  {
    title: 'Real-Time Monitoring',
    description: 'Teams can see document movement and status.',
    state: 'monitor',
  },
  {
    title: 'AI-Powered Insights',
    description: 'Document activity becomes useful operational information.',
    state: 'intelligence',
  },
]

const { prefersReducedMotion } = useScenePreferences()

const featureRefs = ref<(InstanceType<typeof FlowVisionScene> | null)[]>([])
const tweens: gsap.core.Tween[] = []

function setFeatureRef(el: unknown, index: number) {
  featureRefs.value[index] = el as InstanceType<typeof FlowVisionScene> | null
}

function onFeatureReady(index: number) {
  const scene = featureRefs.value[index]
  if (!scene || prefersReducedMotion.value) return

  const progress = { value: 0 }
  const tween = gsap.to(progress, {
    value: 1,
    duration: 5,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    onUpdate: () => scene.setProgress(progress.value),
  })
  tweens.push(tween)
}

onUnmounted(() => {
  tweens.forEach(t => t.kill())
})
</script>
