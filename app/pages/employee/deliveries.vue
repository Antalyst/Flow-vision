<template>
  <LiaisonDeliveriesBoard scan-base-path="/employee/scan" allow-receive />
</template>

<script setup lang="ts">
import LiaisonDeliveriesBoard from '~/components/documents/LiaisonDeliveriesBoard.vue'

definePageMeta({ layout: 'employee' })
</script>
