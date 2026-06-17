<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
        @click="handleClose"
      ></div>
    </Transition>

    <Transition name="drawer-slide">
      <form
        v-if="isOpen"
        class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-5xl flex-col border-l shadow-2xl"
        :class="surfaceClass"
        @submit.prevent="handlePrintAndSubmit"
      >
        <header class="flex items-start justify-between gap-4 border-b px-5 py-5" :class="borderClass">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-rich-orange">Documents</p>
            <h2 class="mt-1 text-xl font-bold" :class="headingClass">Upload & Analyze</h2>
            <p class="mt-1 text-xs" :class="mutedTextClass">
              The file is AI-analyzed, then split-stored across Supabase and blob storage.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg transition hover:text-rich-orange hover:bg-rich-orange/10"
            aria-label="Close"
            @click="handleClose"
          >
            <Icon name="ph:x-bold" class="h-4 w-4" :class="headingClass" />
          </button>
        </header>

        <div class="flex flex-1 flex-col gap-5 overflow-hidden px-5 py-5 lg:flex-row">
          <!-- Left: Live document preview -->
          <div class="w-full overflow-y-auto lg:w-7/12">
            <DocumentLivePreview
              :file="selectedFile"
              :tracking-id="currentTrackingId"
              :print-strategy="selectedStrategy"
            />
          </div>

          <!-- Right: Inputs -->
          <div class="w-full space-y-5 overflow-y-auto lg:w-5/12">
          <!-- RBAC notice -->
          <div
            v-if="!documentStore.canUploadDocuments"
            class="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-500"
          >
            Your account role is not permitted to upload documents.
          </div>

          <!-- Drop zone -->
          <label
            class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition"
            :class="[
              isDragging ? 'border-rich-orange bg-rich-orange/10' : borderClass,
              documentStore.canUploadDocuments ? '' : 'pointer-events-none opacity-50',
            ]"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <Icon name="ph:cloud-arrow-up" class="h-10 w-10 text-rich-orange" />
            <div>
              <p class="text-sm font-semibold" :class="headingClass">
                {{ selectedFile ? selectedFile.name : 'Drop a file here or click to browse' }}
              </p>
              <p class="mt-1 text-xs" :class="mutedTextClass">
                PDF, DOCX, XLSX, TXT, CSV supported
              </p>
            </div>
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.json"
              @change="handleFileChange"
            />
          </label>

          <!-- Target Workflow Stage -->
          <label class="block">
            <span class="text-sm font-semibold" :class="headingClass">Target Workflow Stage</span>
            <select
              v-model="selectedStageId"
              class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"
              :class="inputClass"
              required
            >
              <option value="" disabled :style="optionStyle">Select a workflow stage</option>
              <option
                v-for="stage in stageStore.stages"
                :key="stage.stage_id"
                :value="String(stage.stage_id)"
                :style="optionStyle"
              >
                {{ stage.name }}
              </option>
            </select>
            <p v-if="!stageStore.stages.length" class="mt-2 text-xs" :class="mutedTextClass">
              No stages available. Create a stage first in the Stages workspace.
            </p>
          </label>

          <!-- Selected file meta -->
          <div
            v-if="selectedFile"
            class="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
            :class="isDark ? 'border-card-border bg-rich-black/40' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex min-w-0 items-center gap-3">
              <Icon name="ph:file-text" class="h-5 w-5 flex-none text-rich-orange" />
              <div class="min-w-0">
                <p class="truncate font-semibold" :class="headingClass">{{ selectedFile.name }}</p>
                <p class="text-xs" :class="mutedTextClass">{{ formatSize(selectedFile.size) }}</p>
              </div>
            </div>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10"
              aria-label="Remove file"
              @click="clearFile"
            >
              <Icon name="ph:trash" class="h-4 w-4" />
            </button>
          </div>

          <!-- QR Code Placement Strategy -->
          <div>
            <span class="text-sm font-semibold" :class="headingClass">QR Code Placement Strategy</span>
            <div class="mt-2 space-y-2">
              <label
                class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition"
                :class="selectedStrategy === 'embedded'
                  ? 'border-rich-orange bg-rich-orange/5'
                  : (isDark ? 'border-card-border' : 'border-gray-200')"
              >
                <input v-model="selectedStrategy" type="radio" value="embedded" class="mt-1 accent-[#FF620C]" />
                <span>
                  <span class="block text-sm font-semibold" :class="headingClass">Embed with Document Content</span>
                  <span class="block text-xs" :class="mutedTextClass">
                    Prints tracking metadata directly alongside the document payload.
                  </span>
                </span>
              </label>

              <label
                class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition"
                :class="selectedStrategy === 'standalone'
                  ? 'border-rich-orange bg-rich-orange/5'
                  : (isDark ? 'border-card-border' : 'border-gray-200')"
              >
                <input v-model="selectedStrategy" type="radio" value="standalone" class="mt-1 accent-[#FF620C]" />
                <span>
                  <span class="block text-sm font-semibold" :class="headingClass">Standalone Tracking Trailer Page</span>
                  <span class="block text-xs" :class="mutedTextClass">
                    Keeps document pages clean and appends a dedicated tracking sheet to the end.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <!-- Standalone Trailer QR Size -->
          <label v-if="selectedStrategy === 'standalone'" class="block">
            <span class="text-sm font-semibold" :class="headingClass">Trailer QR Print Size</span>
            <select
              v-model.number="selectedQrSize"
              class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"
              :class="inputClass"
            >
              <option :value="50" :style="optionStyle">Small (50px × 50px)</option>
              <option :value="120" :style="optionStyle">Medium (120px × 120px)</option>
              <option :value="200" :style="optionStyle">Large (200px × 200px)</option>
            </select>
          </label>

          <!-- Error -->
          <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>

          <!-- AI result preview -->
          <div
            v-if="documentStore.lastAnalysis"
            class="rounded-lg border p-4"
            :class="isDark ? 'border-card-border bg-rich-black/40' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex items-center gap-2 text-sm font-semibold text-rich-orange">
              <Icon name="ph:sparkle" class="h-4 w-4" />
              AI Analysis
            </div>
            <p class="mt-2 text-sm font-semibold" :class="headingClass">
              {{ documentStore.lastAnalysis.title }}
            </p>
            <p class="mt-1 text-xs leading-5" :class="mutedTextClass">
              {{ documentStore.lastAnalysis.description }}
            </p>
          </div>
          </div>
        </div>

        <footer class="flex items-center justify-end gap-3 border-t px-5 py-4" :class="borderClass">
          <button
            type="button"
            class="rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5"
            :class="isDark ? 'border-card-border text-white' : 'border-gray-200 text-rich-black'"
            @click="handleClose"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex items-center gap-2 rounded-lg bg-[#FF620C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95a0b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!canSubmit"
          >
            <Icon v-if="documentStore.uploading" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
            <Icon v-else name="ph:printer" class="h-4 w-4" />
            {{ documentStore.uploading ? 'Saving…' : 'Print & Save' }}
          </button>
        </footer>
      </form>
    </Transition>

    <!-- QR-only fallback print template (hidden on screen, isolated during print) -->
    <DocumentPrintCanvas :qr-data-url="printQrDataUrl" />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { PDFDocument } from 'pdf-lib'
import { renderAsync } from 'docx-preview'
import { useDocumentStore } from '~/stores/document'
import { useStageStore } from '~/stores/stage'
import DocumentPrintCanvas from './documentPrintCanvas.vue'
import DocumentLivePreview from './documentLivePreview.vue'

const generateTrackingId = () => `FLOW-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

const props = defineProps<{
  isOpen: boolean
  officeId?: string | number | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'uploaded', metadata: any): void
}>()

const documentStore = useDocumentStore()
const stageStore = useStageStore()
const { isDark } = useTheme()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const selectedStageId = ref<string>('')
const selectedStrategy = ref<'embedded' | 'standalone'>('embedded')
const selectedQrSize = ref<50 | 120 | 200>(120)
const currentTrackingId = ref('')
const isDragging = ref(false)
const errorMessage = ref('')

// Print state
const printQrDataUrl = ref('')

watch(
  () => props.isOpen,
  (open) => {
    if (open && !stageStore.stages.length) {
      stageStore.fetchStages()
    }
  }
)

const surfaceClass = computed(() =>
  isDark.value ? 'border-card-border bg-[#1A1A1A] shadow-card-dark' : 'border-gray-200 bg-white'
)
const borderClass = computed(() => (isDark.value ? 'border-card-border' : 'border-gray-200'))
const mutedTextClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const headingClass = computed(() => (isDark.value ? 'text-white' : 'text-rich-black'))
const inputClass = computed(() =>
  isDark.value
    ? 'border-card-border bg-rich-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-rich-black placeholder:text-gray-400'
)
const optionStyle = computed(() =>
  isDark.value
    ? { backgroundColor: '#1A1A1A', color: '#ffffff' }
    : { backgroundColor: '#ffffff', color: '#121212' }
)

const canSubmit = computed(
  () =>
    documentStore.canUploadDocuments &&
    !!selectedFile.value &&
    !!selectedStageId.value &&
    !documentStore.uploading
)

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] || null
  selectedFile.value = file
  currentTrackingId.value = file ? generateTrackingId() : ''
  errorMessage.value = ''
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    selectedFile.value = file
    currentTrackingId.value = generateTrackingId()
    errorMessage.value = ''
  }
}

const clearFile = () => {
  selectedFile.value = null
  currentTrackingId.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const handleClose = () => {
  if (documentStore.uploading) return
  clearFile()
  selectedStageId.value = ''
  selectedStrategy.value = 'embedded'
  selectedQrSize.value = 120
  printQrDataUrl.value = ''
  errorMessage.value = ''
  documentStore.clearLastAnalysis()
  emit('close')
}

// Fallback: print only the raw QR via the isolated print canvas.
// Used when an uploaded file type cannot be rendered/extended inline.
const printFallbackLabel = async (qrDataUrl: string) => {
  printQrDataUrl.value = qrDataUrl
  await nextTick()
  window.print()
}

// Standalone strategy: leave the original pages untouched and append a dedicated
// high-contrast tracking trailer page as the very last sheet of the bundle.
const printStandaloneDocument = async (file: File, qrDataUrl: string) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const arrayBuffer = await file.arrayBuffer()

  const qrSize = selectedQrSize.value

  if (ext === 'pdf') {
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const qrImage = await pdfDoc.embedPng(qrDataUrl)

    // Append a brand-new blank trailer page and draw ONLY the centered QR matrix.
    const newPage = pdfDoc.addPage()
    const { width, height } = newPage.getSize()
    newPage.drawImage(qrImage, {
      x: (width - qrSize) / 2,
      y: (height - qrSize) / 2,
      width: qrSize,
      height: qrSize,
    })

    const pdfBytes = await pdfDoc.save()
    const url = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }))
    const printWin = window.open(url)
    if (printWin) {
      printWin.onload = () => {
        printWin.focus()
        printWin.print()
      }
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    return
  }

  if (ext === 'docx') {
    const renderTarget = document.createElement('div')
    await renderAsync(arrayBuffer, renderTarget)
    const docHtml = renderTarget.innerHTML

    const printWin = window.open('', '_blank')
    if (printWin) {
      printWin.document.write(`
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 0; background: #fff; }
              .docx-wrapper { background: #fff !important; padding: 0 !important; }
              .docx { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
            </style>
          </head>
          <body>
            ${docHtml}
            <div style="page-break-before: always; clear: both; display: flex; justify-content: center; align-items: center; height: 100vh; background: #ffffff;">
              <img src="${qrDataUrl}" style="width: ${qrSize}px; height: ${qrSize}px; box-shadow: none; border: none; margin: auto;" />
            </div>
          </body>
        </html>
      `)
      printWin.document.close()
      printWin.focus()
      setTimeout(() => {
        printWin.print()
        printWin.close()
      }, 500)
    }
    return
  }

  // Unsupported file type for inline rendering — fall back to the raw QR canvas.
  await printFallbackLabel(qrDataUrl)
}

// Embedded strategy: print the REAL uploaded document pages with a raw 50x50 QR
// stamped at the top-left corner. No metadata text is rendered in this mode.
const printEmbeddedDocument = async (file: File, qrDataUrl: string) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const arrayBuffer = await file.arrayBuffer()

  if (ext === 'pdf') {
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const qrImage = await pdfDoc.embedPng(qrDataUrl)

    const qrSize = 50
    const margin = 20
    pdfDoc.getPages().forEach((page) => {
      const { height } = page.getSize()
      page.drawImage(qrImage, {
        x: margin,
        y: height - qrSize - margin, // Clean placement at the absolute top-left boundary
        width: qrSize,
        height: qrSize,
      })
    })

    const pdfBytes = await pdfDoc.save()
    const url = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }))
    const printWin = window.open(url)
    if (printWin) {
      printWin.onload = () => {
        printWin.focus()
        printWin.print()
      }
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    return
  }

  if (ext === 'docx') {
    const renderTarget = document.createElement('div')
    await renderAsync(arrayBuffer, renderTarget)
    const docHtml = renderTarget.innerHTML

    const printWin = window.open('', '_blank')
    if (printWin) {
      printWin.document.write(`
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 0; background: #fff; }
              .docx-wrapper { background: #fff !important; padding: 0 !important; }
              .docx { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
            </style>
          </head>
          <body>
            <img src="${qrDataUrl}" style="position: absolute; top: 20px; left: 20px; width: 50px; height: 50px; box-shadow: none; border: none; z-index: 9999;" />
            ${docHtml}
          </body>
        </html>
      `)
      printWin.document.close()
      printWin.focus()
      setTimeout(() => {
        printWin.print()
        printWin.close()
      }, 500)
    }
    return
  }

  // Unsupported file type for inline rendering — fall back to the raw QR canvas.
  await printFallbackLabel(qrDataUrl)
}

// Print BEFORE persistence: records only hit the DB after the print routine runs.
const handlePrintAndSubmit = async () => {
  if (!selectedFile.value) {
    errorMessage.value = 'Please select a file to upload.'
    return
  }

  if (!selectedStageId.value) {
    errorMessage.value = 'Please select a target workflow stage.'
    return
  }

  errorMessage.value = ''

  // 1. Reuse the FLOW- identity already shown in the live preview (generate if absent).
  const trackingCode = currentTrackingId.value || generateTrackingId()
  currentTrackingId.value = trackingCode

  // 2. Build the QR matrix, then route printing based on the placement strategy.
  let qrDataUrl = ''
  try {
    qrDataUrl = await QRCode.toDataURL(trackingCode, { margin: 1, width: 320 })
  } catch {
    qrDataUrl = ''
  }

  if (selectedStrategy.value === 'embedded') {
    await printEmbeddedDocument(selectedFile.value, qrDataUrl)
  } else {
    await printStandaloneDocument(selectedFile.value, qrDataUrl)
  }

  // 3. Persist to Supabase + Hostinger MySQL using the printed tracking code.
  const res = await documentStore.uploadDocument(selectedFile.value, {
    officeId: props.officeId ?? null,
    stageId: selectedStageId.value,
    qrCode: trackingCode,
    printStrategy: selectedStrategy.value,
    stickerSize: selectedStrategy.value === 'standalone' ? String(selectedQrSize.value) : null,
  })

  if (res.success) {
    emit('uploaded', res.data)
    clearFile()
    selectedStageId.value = ''
    currentTrackingId.value = ''
    printQrDataUrl.value = ''
    return
  }

  errorMessage.value = typeof res.error === 'string' ? res.error : 'Upload failed.'
  // Partial uploads may have persisted the printed code — allocate a fresh label for retry.
  currentTrackingId.value = generateTrackingId()
}
</script>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.28s ease;
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}
</style>
