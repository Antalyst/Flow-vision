<template>
  <div
    class="features-canvas-page relative w-full pb-24 font-dashboard"
    :class="isLandingDark ? 'bg-neutral-950' : 'bg-white-surface'"
  >
    <FeaturesPageHeader ref="heroRef" />

    <div class="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
      <!-- Metrics panel -->
      <section class="space-y-10 pb-16 pt-16">
        <FeaturesSectionHeader
          eyebrow="Telemetry"
          title="Live network performance at a glance"
          description="Real-time KPIs aggregated across every active node in your federated mesh — packets, delivery rates, and SLA health."
        />
        <FeaturesMetricStrip ref="metricsStripRef" />
      </section>

      <!-- Feature modules -->
      <div ref="boardRef" class="features-board space-y-24">
        <section aria-label="AI features">
          <FeaturesSectionHeader
            eyebrow="Artificial Intelligence"
            title="Intelligent document operations"
            description="Edge inference, semantic discovery, and conversational query — AI tooling that scales across every node in your custody network."
          />
          <FeaturesAiFeaturesSection />
        </section>

        <FeaturesArchitecturalSection
          v-for="section in architecturalSections"
          :key="section.id"
          :section="section"
        />

        <FeaturesHeroBanner
          eyebrow="Get Started"
          title="Ready to deploy your node network?"
          description="Start with a single office and scale to a federated mesh — FlowVision grows with your custody volume."
        >
          <template #actions>
            <FeaturesPillButton variant="solid" @click="openRegister">
              Get started
            </FeaturesPillButton>
            <FeaturesPillButton variant="outline" to="/contact">
              Contact sales
            </FeaturesPillButton>
          </template>
        </FeaturesHeroBanner>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { gsap } from 'gsap'
import { FEATURES_ARCHITECTURAL_SECTIONS } from '~/composables/useFeaturesPage'

const { isLandingDark } = useLandingTheme()
const { openRegister } = useAuthModals()

const heroRef = ref<{ sectionRef: HTMLElement | null } | null>(null)
const metricsStripRef = ref<{ sectionRef: HTMLElement | null } | null>(null)
const boardRef = ref<HTMLElement | null>(null)

const architecturalSections = FEATURES_ARCHITECTURAL_SECTIONS

onMounted(() => {
  if (!import.meta.client) return

  const heroEl = heroRef.value?.sectionRef
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

  if (heroEl) {
    tl.from(heroEl, { y: 20, opacity: 0, duration: 0.7 })
  }

  tl.from('.features-metric-card', { y: 16, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.35')
    .from('.features-ai-card, .features-nlq-spotlight, .features-architectural-card', {
      y: 16,
      opacity: 0,
      duration: 0.65,
      stagger: 0.05,
    }, '-=0.2')
})

onUnmounted(() => {
  gsap.killTweensOf('.features-metric-card')
  gsap.killTweensOf('.features-ai-card')
  gsap.killTweensOf('.features-nlq-spotlight')
  gsap.killTweensOf('.features-architectural-card')
})
</script>
