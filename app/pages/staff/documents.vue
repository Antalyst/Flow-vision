<template>
  <EmployeeDocumentsPage scan-base-path="/staff/scan" ledger-scope="LOCAL" own-uploads-only />
</template>

<script setup lang="ts">
import EmployeeDocumentsPage from '~/components/employee/documents/index.vue'

useSeoMeta({
  title: 'FlowVision | Documents',
  description: 'Documents you created.'
})

definePageMeta({ layout: 'staff' })
</script>
