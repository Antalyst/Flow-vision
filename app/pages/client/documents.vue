<template>
  <DocumentsView />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Document Ledger',
  description: 'Search, trace, and manage all historical and active physical documents within your organization.'
})
import DocumentsView from '~/components/client/documents/index.vue'

definePageMeta({ layout: 'client' })
</script>
