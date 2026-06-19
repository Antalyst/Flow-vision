<template>
  <div class="landing-page w-full">
    <LandingHeroSection />
    <LandingAiFeaturesSection />
  </div>
</template>

<script setup lang="ts">
import LandingHeroSection from '~/components/landing/LandingHeroSection.vue'
import LandingAiFeaturesSection from '~/components/landing/LandingAiFeaturesSection.vue'

definePageMeta({ layout: 'default' })
</script>
