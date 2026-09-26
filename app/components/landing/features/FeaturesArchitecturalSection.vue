<template>
  <section
    :id="`feature-section-${section.id}`"
    class="features-architectural-section"
    :aria-label="section.title"
  >
    <FeaturesSectionHeader
      :eyebrow="section.eyebrow"
      :title="section.title"
      :description="section.description"
    />

    <div
      class="grid grid-cols-1 gap-6"
      :class="section.features.length > 1 ? 'lg:grid-cols-2' : ''"
    >
      <article
        v-for="feature in section.features"
        :key="feature.id"
        :id="`feature-panel-${feature.id}`"
        class="features-architectural-card flex flex-col overflow-hidden rounded-3xl border border-flow-muted/15 bg-flow-void transition-all duration-300 ease-out"
        :class="[
          feature.variant === 'diagram' || feature.variant === 'analytics' ? 'lg:col-span-2' : '',
          isDimmed(feature.id) ? 'pointer-events-none scale-[0.98] opacity-30' : '',
        ]"
      >
        <div class="flex flex-1 flex-col p-8">
          <p class="text-xs text-flow-muted">{{ feature.category }}</p>
          <h3 class="mb-2 mt-2 text-lg font-semibold text-flow-ink">
            {{ feature.title }}
          </h3>
          <p class="text-sm leading-relaxed text-flow-muted">
            {{ feature.description }}
          </p>

          <div v-if="feature.tags?.length" class="mt-5 flex flex-wrap gap-2">
            <span
              v-for="tag in feature.tags"
              :key="tag"
              class="rounded-full border border-flow-muted/20 bg-flow-void px-3 py-1 text-[13px] font-medium uppercase tracking-wider text-flow-muted"
            >
              {{ tag }}
            </span>
          </div>

          <!-- Routing mesh visual -->
          <div
            v-if="feature.id === 'routing'"
            class="relative mt-6 overflow-hidden rounded-2xl border border-flow-muted/10 bg-flow-void"
          >
            <svg viewBox="0 0 400 220" class="h-full min-h-[12rem] w-full p-4" aria-label="Routing mesh architecture">
              <defs>
                <linearGradient :id="`mesh-line-${section.id}`" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#FF6A2A" stop-opacity="0.15" />
                  <stop offset="50%" stop-color="#FF6A2A" stop-opacity="0.85" />
                  <stop offset="100%" stop-color="#FF6A2A" stop-opacity="0.15" />
                </linearGradient>
              </defs>
              <circle cx="200" cy="110" r="30" fill="rgba(255,106,42,0.12)" stroke="#FF6A2A" stroke-width="1.5" />
              <text x="200" y="114" text-anchor="middle" fill="#FF6A2A" font-size="10" font-weight="700" font-family="Inter, sans-serif">HUB</text>
              <g v-for="sat in architectureSatellites" :key="sat.label">
                <path :d="`M 200 110 L ${sat.x} ${sat.y}`" :stroke="`url(#mesh-line-${section.id})`" stroke-width="1.5" stroke-dasharray="5 4" fill="none" />
                <rect
                  :x="sat.x - 38"
                  :y="sat.y - 18"
                  width="76"
                  height="36"
                  rx="8"
                  fill="rgba(5,5,5,0.95)"
                  stroke="rgba(139,139,135,0.35)"
                />
                <text
                  :x="sat.x"
                  :y="sat.y + 4"
                  text-anchor="middle"
                  fill="#8B8B87"
                  font-size="9"
                  font-weight="600"
                  font-family="Inter, sans-serif"
                >{{ sat.label }}</text>
              </g>
              <circle r="3" fill="#FF6A2A">
                <animateMotion dur="4s" repeatCount="indefinite" path="M 200 110 L 80 50 L 200 110 L 320 50 L 200 110 L 340 170 L 200 110 L 60 170 Z" />
              </circle>
            </svg>
          </div>

          <!-- QR checkpoint visual -->
          <div
            v-else-if="feature.variant === 'qr'"
            class="mt-6 flex flex-col items-center rounded-2xl border border-flow-muted/10 bg-flow-void p-8"
          >
            <div class="grid grid-cols-7 gap-1">
              <div
                v-for="n in 49"
                :key="n"
                class="h-3 w-3 rounded-sm"
                :class="qrPattern[n - 1] ? 'bg-flow-signal' : 'bg-flow-muted/20'"
              />
            </div>
            <p class="mt-4 text-center text-xs text-flow-muted">
              A quick scan confirms every pickup and drop-off.
            </p>
          </div>

          <!-- Network topology diagram -->
          <div v-else-if="feature.variant === 'diagram'" class="mt-6 rounded-2xl border border-flow-muted/10 bg-flow-void p-4 sm:p-6">
            <FeaturesTrackingDiagram />
          </div>

          <!-- SLA analytics console -->
          <div v-else-if="feature.variant === 'analytics'" class="mt-6">
            <FeaturesAnalyticsPanel />
          </div>

          <footer
            v-if="feature.variant === 'default'"
            class="mt-6 flex justify-end"
          >
            <FeaturesCircleAction :aria-label="`Explore ${feature.title}`" />
          </footer>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { FeatureSectionGroup } from '~/composables/useFeaturesPage'
import {
  FEATURES_ARCHITECTURE_SATELLITES,
  FEATURES_QR_PATTERN,
  useFeaturesPage,
} from '~/composables/useFeaturesPage'

defineProps<{
  section: FeatureSectionGroup
}>()

const { isDimmed } = useFeaturesPage()

const architectureSatellites = FEATURES_ARCHITECTURE_SATELLITES
const qrPattern = FEATURES_QR_PATTERN
</script>
