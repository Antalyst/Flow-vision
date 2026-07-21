<template>
  <DocumentPreviewDrawer
    :is-open="isOpen"
    :document="document"
    @close="emit('close')"
  />
</template>

<script setup lang="ts">
import DocumentPreviewDrawer from '~/components/documents/DocumentPreviewDrawer.vue'

defineProps<{
  isOpen: boolean
  document: any | null
}>()

const emit = defineEmits<{ (e: 'close'): void }>()
</script>
