<template>
  <DocumentPreviewDrawer
    :is-open="isOpen"
    :document="document"
    @close="emit('close')"
    @deleted="emit('deleted', $event)"
  />
</template>

<script setup lang="ts">
import DocumentPreviewDrawer from '~/components/documents/DocumentPreviewDrawer.vue'

defineProps<{
  isOpen: boolean
  document: any | null
}>()

const emit = defineEmits<{ (e: 'close'): void; (e: 'deleted', documentId: string): void }>()
</script>
