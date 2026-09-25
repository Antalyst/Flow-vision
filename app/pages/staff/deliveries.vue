<template>
  <LiaisonDeliveriesBoard scan-base-path="/staff/scan" />
</template>

<script setup lang="ts">
import LiaisonDeliveriesBoard from '~/components/documents/LiaisonDeliveriesBoard.vue'

useSeoMeta({
  title: 'FlowVision | My Deliveries',
  description: 'Documents assigned to you for pickup or drop-off, anywhere in your organization.'
})

definePageMeta({ layout: 'staff' })
</script>
