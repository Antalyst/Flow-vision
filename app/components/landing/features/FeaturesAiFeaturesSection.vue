<template>
  <section class="features-ai-section" aria-label="AI features">
    <!-- Three capability cards -->
    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <article
        v-for="cap in capabilities"
        :key="cap.id"
        :id="`feature-panel-${cap.id}`"
        class="features-ai-card group flex flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 transition-all duration-300 ease-out"
        :class="isDimmed(cap.id) ? 'pointer-events-none scale-[0.98] opacity-30' : ''"
      >
        <div class="relative aspect-[4/3] overflow-hidden">
          <img
            :src="cap.image"
            :alt="cap.title"
            class="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            loading="lazy"
          >
          <div
            class="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/30 to-transparent"
            aria-hidden="true"
          />
        </div>

        <div class="flex flex-1 flex-col p-8">
          <p class="text-xs text-neutral-500">AI Capability</p>
          <h3 class="mb-2 mt-2 text-lg font-semibold text-neutral-100">
            {{ cap.title }}
          </h3>
          <p class="flex-1 text-sm leading-relaxed text-neutral-400">
            {{ cap.description }}
          </p>
          <div v-if="cap.tags?.length" class="mt-5 flex flex-wrap gap-2">
            <span
              v-for="tag in cap.tags"
              :key="tag"
              class="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400"
            >
              {{ tag }}
            </span>
          </div>
          <footer class="mt-6 flex justify-end">
            <FeaturesCircleAction :aria-label="`Explore ${cap.title}`" />
          </footer>
        </div>
      </article>
    </div>

    <!-- NLQ spotlight panel -->
    <article
      :id="`feature-panel-${nlq.id}`"
      class="features-nlq-spotlight mt-6 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 transition-all duration-300 ease-out lg:mt-8"
      :class="isDimmed(nlq.id) ? 'pointer-events-none scale-[0.98] opacity-30' : ''"
    >
      <div class="grid grid-cols-1 lg:grid-cols-2">
        <div class="flex flex-col justify-center p-8 lg:p-10">
          <p class="text-xs text-neutral-500">{{ nlq.category }}</p>
          <h3 class="mb-2 mt-2 text-2xl font-bold text-white lg:text-3xl">
            {{ nlq.title }}
          </h3>
          <p class="text-sm leading-relaxed text-neutral-400">
            {{ nlq.description }}
          </p>

          <div class="mt-6 space-y-3">
            <div class="rounded-2xl bg-neutral-950 p-4">
              <p class="mb-2 text-xs text-neutral-500">Query input</p>
              <p class="font-mono text-xs leading-relaxed text-neutral-300">
                <span class="text-candy-orange">&gt;</span> {{ nlq.query }}
              </p>
            </div>
            <div class="rounded-2xl bg-neutral-950 p-4">
              <p class="mb-2 text-xs text-neutral-500">Result preview</p>
              <p class="text-sm leading-relaxed text-neutral-400">{{ nlq.result }}</p>
            </div>
          </div>

          <div v-if="nlq.tags?.length" class="mt-5 flex flex-wrap gap-2">
            <span
              v-for="tag in nlq.tags"
              :key="tag"
              class="rounded-full border border-candy-orange/30 bg-candy-orange/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-candy-orange"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div class="relative min-h-[16rem] overflow-hidden lg:min-h-0">
          <img
            :src="nlq.image"
            :alt="nlq.title"
            class="h-full w-full object-cover object-center"
            loading="lazy"
          >
          <div
            class="pointer-events-none absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900/40 to-transparent lg:from-neutral-900/80"
            aria-hidden="true"
          />
        </div>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import {
  FEATURES_AI_CAPABILITIES,
  FEATURES_NLQ_SPOTLIGHT,
  useFeaturesPage,
} from '~/composables/useFeaturesPage'

const { isDimmed } = useFeaturesPage()

const capabilities = FEATURES_AI_CAPABILITIES
const nlq = FEATURES_NLQ_SPOTLIGHT
</script>
