<template>
  <AiCanvasWorkspace />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | AI Insights',
  description: 'Analyze your organization\'s document flows using predictive AI to optimize courier routes and branch efficiency.'
})
import AiCanvasWorkspace from '~/components/ai/AiCanvasWorkspace.vue'

// Immersive, full-screen chat port: no sidebar / nav chrome.
definePageMeta({ layout: false })
</script>
