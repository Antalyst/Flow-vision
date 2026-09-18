<template>
  <ClientStationQrPage />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | QR Terminals',
  description: 'Manage the QR scanners and check-in terminals located at your branch offices.'
})
import ClientStationQrPage from '~/components/client/station/ClientStationQrPage.vue'

definePageMeta({ layout: 'client' })
</script>
