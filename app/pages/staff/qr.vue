<template>
  <div />
</template>

<script setup lang="ts">
// Retired: staff and desk QR codes are no longer used — the document's own QR
// identifies it, and the signed-in account identifies who scanned it.
definePageMeta({
  layout: 'staff',
  middleware: () => navigateTo('/staff/scan', { replace: true }),
})
</script>
