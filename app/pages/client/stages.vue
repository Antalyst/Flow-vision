<template>
  <StageView />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Pipeline Stages',
  description: 'Configure document checkpoints, design routing workflows, and define the required steps for your document pipelines.'
})
import StageView from '~/components/client/stages/stageComp.vue'

definePageMeta({ layout: 'client' })
</script>
