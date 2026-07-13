<template>
  <Teleport to="body">
    <div class="print-root">
      <div class="print-canvas mx-auto flex items-center justify-center bg-white p-4">
        <img
          v-if="qrDataUrl"
          :src="qrDataUrl"
          alt="Tracking QR code"
          :style="{ width: `${qrSize || 224}px`, height: `${qrSize || 224}px` }"
        />
        <div v-else class="flex items-center justify-center border border-black text-xs" :style="{ width: `${qrSize || 224}px`, height: `${qrSize || 224}px` }">
          QR UNAVAILABLE
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  qrDataUrl: string
  qrSize?: number
}>()
</script>

<!-- Global (non-scoped) print isolation: hide the entire dashboard, show only the QR. -->
<style>
.print-root {
  display: none;
}

@media print {
  @page {
    margin: 0;
  }

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
