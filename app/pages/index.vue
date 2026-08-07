<template>
  <div class="landing-page w-full">
    <LandingHeroSection />
    <LandingAiFeaturesSection />
    <LandingScrollVideoSection />
    <LandingBrandRevealSection />
  </div>
</template>

<script setup lang="ts">
import LandingHeroSection from '~/components/landing/LandingHeroSection.vue'
import LandingAiFeaturesSection from '~/components/landing/LandingAiFeaturesSection.vue'
import LandingScrollVideoSection from '~/components/landing/LandingScrollVideoSection.vue'
import LandingBrandRevealSection from '~/components/landing/LandingBrandRevealSection.vue'

definePageMeta({ layout: 'default' })
</script>
