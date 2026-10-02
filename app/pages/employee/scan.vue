<template>
  <OfficeDocumentScanner back-to="/employee/documents" title="Scan Document" :allow-receive="true" />
</template>

<script setup lang="ts">
// Document QR is the only scanner input: receive a delivered document, or pick
// up one assigned to you. Desk / staff / office-wall QR codes are retired.
import OfficeDocumentScanner from '~/components/documents/OfficeDocumentScanner.vue'

definePageMeta({ layout: 'employee' })
useSeoMeta({ title: 'FlowVision | Scan Document' })
</script>
