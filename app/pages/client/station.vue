<template>
  <ClientStationQrPage />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Station Terminals',
  description: 'Manage and monitor the hardware terminals, QR scanners, and kiosk interfaces located in your branch offices.'
})
import ClientStationQrPage from '~/components/client/station/ClientStationQrPage.vue'

definePageMeta({ layout: 'client' })
</script>
