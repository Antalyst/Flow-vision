<template>
  <section class="features-capability-grid" aria-label="AI capabilities">
    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <article
        v-for="cap in capabilities"
        :key="cap.id"
        :id="`feature-panel-${cap.id}`"
        class="group flex flex-col overflow-hidden rounded-3xl transition-all duration-300 ease-out"
        :class="[cardClass, isDimmed(cap.id) ? 'pointer-events-none scale-[0.98] opacity-30' : '']"
      >
        <div class="relative aspect-[4/3] overflow-hidden">
          <img
            :src="cap.image"
            :alt="cap.title"
            class="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            loading="lazy"
          >
          <div
            class="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/20 to-transparent"
            aria-hidden="true"
          />
        </div>

        <div class="flex flex-1 flex-col p-6 sm:p-8">
          <p class="text-xs text-neutral-500">AI Capability</p>
          <h3 class="mb-2 mt-2 text-lg font-semibold text-neutral-100" :class="!isLandingDark && '!text-zinc-900'">
            {{ cap.title }}
          </h3>
          <p class="flex-1 text-sm leading-relaxed" :class="descClass">
            {{ cap.description }}
          </p>
          <footer class="mt-6 flex justify-end">
            <FeaturesCircleAction :aria-label="`Learn about ${cap.title}`" />
          </footer>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { FEATURES_CAPABILITIES, useFeaturesPage } from '~/composables/useFeaturesPage'

const { isLandingDark } = useLandingTheme()
const { isDimmed } = useFeaturesPage()

const capabilities = FEATURES_CAPABILITIES

const cardClass = computed(() =>
  isLandingDark.value ? 'bg-neutral-900' : 'bg-white border border-zinc-200',
)

const descClass = computed(() =>
  isLandingDark.value ? 'text-neutral-400' : 'text-zinc-600',
)
</script>
