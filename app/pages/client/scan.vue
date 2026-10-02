<template>
  <OfficeDocumentScanner back-to="/client/documents" title="Scan to Pick Up" :allow-receive="false" />
</template>

<script setup lang="ts">
// Document QR is the only scanner input: receive a delivered document, or pick
// up one assigned to you. Desk / staff / office-wall QR codes are retired.
import OfficeDocumentScanner from '~/components/documents/OfficeDocumentScanner.vue'

definePageMeta({ layout: 'client' })
useSeoMeta({ title: 'FlowVision | Scan Document' })
</script>
