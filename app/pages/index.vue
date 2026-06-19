<template>
  <div class="landing-page w-full">
    <LandingHeroSection />
    <LandingAiFeaturesSection />
    <LandingScrollVideoSection />
  </div>
</template>

<script setup lang="ts">
import LandingHeroSection from '~/components/landing/LandingHeroSection.vue'
import LandingAiFeaturesSection from '~/components/landing/LandingAiFeaturesSection.vue'
import LandingScrollVideoSection from '~/components/landing/LandingScrollVideoSection.vue'

definePageMeta({ layout: 'default' })
</script>
