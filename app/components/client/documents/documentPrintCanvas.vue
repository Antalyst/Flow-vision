<template>
  <Teleport to="body">
    <div class="print-root">
      <div class="print-canvas mx-auto flex items-center justify-center bg-white p-4">
        <img
          v-if="qrDataUrl"
          :src="qrDataUrl"
          alt="Tracking QR code"
          class="h-56 w-56"
        />
        <div v-else class="flex h-56 w-56 items-center justify-center border border-black text-xs">
          QR UNAVAILABLE
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  qrDataUrl: string
}>()
</script>

<!-- Global (non-scoped) print isolation: hide the entire dashboard, show only the QR. -->
<style>
.print-root {
  display: none;
}

@media print {
  body * {
    visibility: hidden !important;
  }

  .print-root {
    display: block !important;
    visibility: visible !important;
    position: absolute;
    inset: 0;
    margin: 0;
    padding: 0;
    background: #ffffff;
  }

  .print-root * {
    visibility: visible !important;
  }

  .print-canvas,
  .print-canvas img {
    box-shadow: none !important;
    border: none !important;
    filter: none !important;
  }
}
</style>
