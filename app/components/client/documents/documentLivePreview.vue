<template>
  <div class="relative mx-auto aspect-[1/1.414] max-h-[550px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 text-black shadow-2xl">
    <!-- Top frame badge -->
    <div class="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center">
      <span class="mt-2 rounded-full bg-gray-900/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
        Live Document Preview
      </span>
    </div>

    <!-- Processing overlay -->
    <div
      v-if="isProcessing"
      class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-white/80"
    >
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-rich-orange border-t-transparent"></div>
      <p class="text-xs font-bold uppercase text-rich-orange">Rendering…</p>
    </div>

    <!-- DOCX QR overlay badge (embedded strategy only) -->
    <Transition name="qr-fade">
      <img
        v-if="fileExtension === 'docx' && qrBase64 && printStrategy === 'embedded'"
        :src="qrBase64"
        class="pointer-events-none absolute left-6 top-6 z-50 h-[50px] w-[50px] border-0 shadow-none filter-none"
        alt="Tracking QR"
      />
    </Transition>

    <!-- PDF render (QR embedded into the file via pdf-lib) -->
    <object
      v-if="processedUrl && fileExtension === 'pdf'"
      :data="processedUrl"
      type="application/pdf"
      class="h-full min-h-[450px] w-full"
    ></object>

    <!-- DOCX render target -->
    <div v-show="fileExtension === 'docx'" ref="wordPreviewContainer" class="docx-render-engine"></div>

    <!-- Empty mockup sheet -->
    <div
      v-if="!file"
      class="flex h-full min-h-[450px] flex-col items-center justify-center gap-3 text-center"
    >
      <Icon name="ph:file-text" class="h-16 w-16 text-gray-200" />
      <p class="max-w-[240px] text-sm font-medium italic text-gray-300">
        Subsidy Distribution Report — Sample Document Preview Frame
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { PDFDocument } from 'pdf-lib'
import QRCode from 'qrcode'
import { renderAsync } from 'docx-preview'

const props = withDefaults(
  defineProps<{
    file: File | null
    trackingId: string
    printStrategy?: 'embedded' | 'standalone'
  }>(),
  {
    printStrategy: 'embedded',
  }
)

const isProcessing = ref(false)
const processedUrl = ref<string | null>(null)
const fileExtension = ref('')
const qrBase64 = ref('')
const wordPreviewContainer = ref<HTMLElement | null>(null)

const revokeProcessedUrl = () => {
  if (processedUrl.value) {
    URL.revokeObjectURL(processedUrl.value)
    processedUrl.value = null
  }
}

const processDocument = async () => {
  const file = props.file
  revokeProcessedUrl()

  if (!file) {
    fileExtension.value = ''
    qrBase64.value = ''
    if (wordPreviewContainer.value) wordPreviewContainer.value.innerHTML = ''
    return
  }

  fileExtension.value = file.name.split('.').pop()?.toLowerCase() || ''
  isProcessing.value = true

  try {
    const arrayBuffer = await file.arrayBuffer()
    qrBase64.value = props.trackingId
      ? await QRCode.toDataURL(props.trackingId, { margin: 1, width: 200 })
      : ''

    if (fileExtension.value === 'pdf') {
      const pdfDoc = await PDFDocument.load(arrayBuffer)

      // Bake the QR into the document only when the embedded strategy is selected.
      if (props.printStrategy === 'embedded' && qrBase64.value) {
        const qrImage = await pdfDoc.embedPng(qrBase64.value)
        const qrSize = 50
        const margin = 20
        pdfDoc.getPages().forEach((page) => {
          const { height } = page.getSize()
          page.drawImage(qrImage, { x: margin, y: height - qrSize - margin, width: qrSize, height: qrSize })
        })
      }

      const pdfBytes = await pdfDoc.save()
      processedUrl.value = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }))
    } else if (fileExtension.value === 'docx') {
      if (wordPreviewContainer.value) {
        wordPreviewContainer.value.innerHTML = ''
        await renderAsync(arrayBuffer, wordPreviewContainer.value)
      }
    }
  } catch (error) {
    console.error('[documentLivePreview] render failed:', error)
  } finally {
    isProcessing.value = false
  }
}

watch(
  () => [props.file, props.trackingId, props.printStrategy],
  () => {
    processDocument()
  },
  { immediate: true }
)

onBeforeUnmount(revokeProcessedUrl)
</script>

<style>
.docx-render-engine .docx-wrapper {
  background-color: #ffffff !important;
  padding: 0 !important;
  display: flex !important;
  justify-content: center !important;
}
.docx-render-engine .docx {
  box-shadow: none !important;
  margin: 0 !important;
  background-color: #ffffff !important;
  width: 100% !important;
}
</style>

<style scoped>
.qr-fade-enter-active,
.qr-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.qr-fade-enter-from,
.qr-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
