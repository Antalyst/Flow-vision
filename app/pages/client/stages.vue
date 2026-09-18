<template>
  <StageView />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Workflow Steps',
  description: 'Set up the checkpoints a document passes through and define the steps it should follow from start to finish.'
})
import StageView from '~/components/client/stages/stageComp.vue'

definePageMeta({ layout: 'client' })
</script>
