<template>
  <AiCanvasWorkspace />
</template>

<script setup lang="ts">
import AiCanvasWorkspace from '~/components/ai/AiCanvasWorkspace.vue'

// Immersive, full-screen chat port: no sidebar / nav chrome.
definePageMeta({ layout: false })
</script>
