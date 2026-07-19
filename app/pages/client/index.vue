<template>
  <div />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Client Portal',
  description: 'Access the FlowVision Client Portal to oversee your organization\'s secure physical document tracking workflows.'
})
definePageMeta({
  layout: 'client',
  middleware: () => navigateTo('/client/dashboard'),
})
</script>
