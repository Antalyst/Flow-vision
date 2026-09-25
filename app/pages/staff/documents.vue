<template>
  <EmployeeDocumentsPage scan-base-path="/staff/scan" ledger-scope="GLOBAL" />
</template>

<script setup lang="ts">
import EmployeeDocumentsPage from '~/components/employee/documents/index.vue'

useSeoMeta({
  title: 'FlowVision | Documents',
  description: 'Create, upload, and track documents across your organization.'
})

definePageMeta({ layout: 'staff' })
</script>
