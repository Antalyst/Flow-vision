<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'client',
  middleware: () => navigateTo('/client/dashboard'),
})
</script>
