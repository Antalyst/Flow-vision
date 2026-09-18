<template>
  <DocumentsView />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | All Documents',
  description: 'Search and manage every document in your organization, past and present.'
})
import DocumentsView from '~/components/client/documents/index.vue'

definePageMeta({ layout: 'client' })
</script>
