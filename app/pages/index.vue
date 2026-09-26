<template>
  <div class="landing-page w-full">
    <LandingHeroSection />
    <LandingScrollStorySection />
    <LandingFeatureSection />
    <LandingMetricsSection />
    <LandingFinalCta />
  </div>
</template>

<script setup lang="ts">
import LandingHeroSection from '~/components/landing/LandingHeroSection.vue'
import LandingScrollStorySection from '~/components/landing/LandingScrollStorySection.vue'
import LandingFeatureSection from '~/components/landing/LandingFeatureSection.vue'
import LandingMetricsSection from '~/components/landing/LandingMetricsSection.vue'
import LandingFinalCta from '~/components/landing/LandingFinalCta.vue'

definePageMeta({ layout: 'default' })
</script>
