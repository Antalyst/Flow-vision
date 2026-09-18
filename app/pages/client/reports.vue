<template>
  <OperationalReportsPanel role="client" />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Reports',
  description: 'Generate detailed audit logs, transit summaries, and official compliance reports for your physical document workflows.'
})
import OperationalReportsPanel from '~/components/reports/OperationalReportsPanel.vue'

definePageMeta({ layout: 'client' })
</script>
