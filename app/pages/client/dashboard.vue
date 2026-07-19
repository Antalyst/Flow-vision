<template>
  <DashboardView />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Client Dashboard',
  description: 'Monitor your entire organization\'s physical document routing, track live courier performance, and review high-level security metrics in real-time.'
})
import DashboardView from '~/components/client/dashboard/index.vue'

definePageMeta({ layout: 'client' })
</script>
