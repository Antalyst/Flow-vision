<template>
  <section
    class="rounded-xl border p-4"
    :class="isDark
      ? 'border-onyx-border bg-onyx-black'
      : 'border-zinc-200 bg-white-pure'"
  >
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Icon name="ph:file-magnifying-glass-fill" class="h-5 w-5 text-candy-orange" />
        <h3
          class="text-sm font-bold"
          :class="isDark ? 'text-white-pure' : 'text-onyx-black'"
        >
          Live File Preview
        </h3>
      </div>
      <span
        v-if="fileName"
        class="truncate text-[10px] font-mono uppercase tracking-wide"
        :class="isDark ? 'text-white-muted' : 'text-gray-500'"
      >
        {{ fileName }}
      </span>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8"
      :class="isDark ? 'border-onyx-border text-white-muted' : 'border-zinc-200 text-gray-500'"
    >
      <Icon name="ph:spinner-gap" class="h-8 w-8 animate-spin text-candy-orange" />
      <p class="text-sm font-medium">Loading file from storage…</p>
    </div>

    <!-- No blob (metadata-only registration) -->
    <div
      v-else-if="noBlob"
      class="rounded-lg border border-dashed p-6 text-center"
      :class="isDark ? 'border-onyx-border bg-onyx-card text-white-muted' : 'border-zinc-200 bg-white-surface text-gray-500'"
    >
      <Icon name="ph:file-dashed" class="mx-auto mb-3 h-10 w-10 text-candy-orange/60" />
      <p class="text-sm font-semibold" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
        No digital file attached
      </p>
      <p class="mt-1 text-xs">
        This record tracks a physical hard-copy only. Use the routing slip below for QR tracking.
      </p>
    </div>

    <!-- Error -->
    <div
      v-else-if="errorMessage"
      class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-500"
    >
      {{ errorMessage }}
    </div>

    <!-- Preview viewport -->
    <template v-else-if="fileObjectURL">
      <div
        class="max-h-[420px] overflow-auto rounded-lg border"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-zinc-200 bg-white-surface'"
      >
        <!-- PDF -->
        <object
          v-if="previewKind === 'pdf'"
          :data="fileObjectURL"
          type="application/pdf"
          class="h-[400px] w-full"
        />

        <!-- DOCX — container must stay mounted before renderAsync runs -->
        <div
          v-else-if="previewKind === 'docx'"
          class="relative"
        >
          <div
            v-if="docxRendering"
            class="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-onyx-black/80"
          >
            <Icon name="ph:spinner-gap" class="h-8 w-8 animate-spin text-candy-orange" />
          </div>
          <div
            ref="docxPreviewContainer"
            class="docx-live-preview w-full max-h-[400px] overflow-y-auto rounded-lg border border-onyx-border bg-white p-4 text-sm text-black dark:bg-zinc-950 dark:text-zinc-200"
          />
        </div>

        <!-- XLSX grid -->
        <div v-else-if="previewKind === 'xlsx'" class="overflow-x-auto p-2">
          <div v-if="sheetNames.length > 1" class="mb-3 flex flex-wrap gap-2">
            <button
              v-for="name in sheetNames"
              :key="name"
              type="button"
              class="rounded-lg border px-3 py-1 text-xs font-semibold transition"
              :class="activeSheet === name
                ? 'border-candy-orange bg-candy-orange text-white-pure'
                : isDark
                  ? 'border-onyx-border text-white-muted hover:border-candy-orange/50'
                  : 'border-zinc-200 text-gray-600 hover:border-candy-orange/50'"
              @click="setActiveSheet(name)"
            >
              {{ name }}
            </button>
          </div>
          <table
            class="min-w-full border-collapse text-left text-xs"
            :class="isDark ? 'text-white-pure' : 'text-onyx-black'"
          >
            <tbody>
              <tr
                v-for="(row, rowIdx) in sheetRows"
                :key="rowIdx"
                :class="rowIdx === 0
                  ? isDark ? 'bg-onyx-sidebar font-semibold' : 'bg-gray-100 font-semibold'
                  : isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'"
              >
                <td
                  v-for="(cell, cellIdx) in row"
                  :key="cellIdx"
                  class="border px-2.5 py-1.5 whitespace-nowrap"
                  :class="isDark ? 'border-onyx-border' : 'border-zinc-200'"
                >
                  {{ cell ?? '' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Text / CSV -->
        <pre
          v-else-if="previewKind === 'text'"
          class="max-h-[400px] overflow-auto p-4 text-xs leading-relaxed"
          :class="isDark ? 'text-white-muted' : 'text-gray-700'"
        >{{ textContent }}</pre>

        <!-- Generic embed fallback -->
        <div
          v-else
          class="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8 text-center"
          :class="isDark ? 'text-white-muted' : 'text-gray-500'"
        >
          <Icon name="ph:file" class="h-12 w-12 text-candy-orange" />
          <p class="text-sm">
            Inline preview is not available for this file type.
          </p>
          <p class="text-xs font-mono">{{ fileName }}</p>
        </div>
      </div>

      <button
        type="button"
        class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-candy-orange bg-candy-orange/10 px-4 py-3 text-sm font-semibold text-candy-orange transition hover:bg-candy-orange hover:text-white-pure"
        @click="downloadFile"
      >
        <Icon name="ph:download-simple-bold" class="h-4 w-4" />
        Download File
      </button>
    </template>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { renderAsync } from 'docx-preview'
import * as XLSX from 'xlsx'

const props = defineProps<{
  documentId: string | null | undefined
  active: boolean
}>()

const { isDark } = useTheme()

const loading = ref(false)
const noBlob = ref(false)
const errorMessage = ref('')
const fileObjectURL = ref<string | null>(null)
const fileName = ref('')
const mimeType = ref('')
const previewKind = ref<'pdf' | 'docx' | 'xlsx' | 'text' | 'unknown'>('unknown')
const docxPreviewContainer = ref<HTMLElement | null>(null)
const docxRendering = ref(false)
const textContent = ref('')
const sheetNames = ref<string[]>([])
const activeSheet = ref('')
const sheetRows = ref<string[][]>([])
let blobBuffer: ArrayBuffer | null = null

const revokeObjectUrl = () => {
  if (fileObjectURL.value) {
    URL.revokeObjectURL(fileObjectURL.value)
    fileObjectURL.value = null
  }
}

const resetState = () => {
  revokeObjectUrl()
  loading.value = false
  noBlob.value = false
  errorMessage.value = ''
  fileName.value = ''
  mimeType.value = ''
  previewKind.value = 'unknown'
  textContent.value = ''
  sheetNames.value = []
  activeSheet.value = ''
  sheetRows.value = []
  blobBuffer = null
  docxRendering.value = false
  if (docxPreviewContainer.value) docxPreviewContainer.value.innerHTML = ''
}

const inferPreviewKind = (name: string, type: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const normalizedType = type.toLowerCase()

  if (ext === 'pdf' || normalizedType.includes('pdf')) return 'pdf'
  if (
    ext === 'docx'
    || ext === 'doc'
    || normalizedType.includes('wordprocessingml')
    || normalizedType.includes('msword')
  ) {
    return 'docx'
  }
  if (ext === 'xlsx' || ext === 'xls' || type.includes('spreadsheetml') || type.includes('ms-excel')) {
    return 'xlsx'
  }
  if (['txt', 'csv', 'json', 'md', 'log'].includes(ext) || type.startsWith('text/')) return 'text'
  return 'unknown'
}

const parseXlsxSheet = (name: string) => {
  if (!blobBuffer) return
  const workbook = XLSX.read(blobBuffer, { type: 'array' })
  const target = name || workbook.SheetNames[0]
  if (!target) return

  const sheet = workbook.Sheets[target]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
  })

  sheetRows.value = rows.slice(0, 200).map((row) =>
    row.map((cell) => (cell == null ? '' : String(cell))),
  )
}

const setActiveSheet = (name: string) => {
  activeSheet.value = name
  parseXlsxSheet(name)
}

const renderDocx = async () => {
  if (!blobBuffer || !docxPreviewContainer.value) return false

  docxRendering.value = true
  try {
    const bufferCopy = blobBuffer.slice(0)
    docxPreviewContainer.value.innerHTML = ''
    await renderAsync(bufferCopy, docxPreviewContainer.value, undefined, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
    })
    return true
  } catch (err) {
    console.error('[DocumentLiveFilePreview] docx render failed:', err)
    errorMessage.value = 'Could not render Word document preview.'
    return false
  } finally {
    docxRendering.value = false
  }
}

const mountDocxPreview = async () => {
  await nextTick()
  await nextTick()
  if (previewKind.value !== 'docx' || !blobBuffer) return
  await renderDocx()
}

const renderText = async () => {
  if (!blobBuffer) return
  textContent.value = new TextDecoder('utf-8').decode(blobBuffer).slice(0, 50_000)
}

const loadBlob = async () => {
  resetState()

  if (!props.active || !props.documentId) return

  loading.value = true
  try {
    const response = await fetch(`/api/documents/${props.documentId}/blob`, {
      credentials: 'include',
    })

    if (response.status === 404) {
      const body = await response.json().catch(() => null) as { message?: string; data?: { code?: string } } | null
      if (body?.data?.code === 'NO_BLOB' || body?.message?.includes('NO_BLOB')) {
        noBlob.value = true
        return
      }
      throw new Error(body?.message || 'File not found.')
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null
      throw new Error(body?.message || `Failed to load file (${response.status}).`)
    }

    const encodedName = response.headers.get('X-File-Name')
    const resolvedName = encodedName ? decodeURIComponent(encodedName) : 'document'
    const resolvedMime = response.headers.get('Content-Type') || 'application/octet-stream'

    blobBuffer = await response.arrayBuffer()
    fileName.value = resolvedName
    mimeType.value = resolvedMime
    fileObjectURL.value = URL.createObjectURL(new Blob([blobBuffer], { type: resolvedMime }))

    previewKind.value = inferPreviewKind(resolvedName, resolvedMime)

    // End loading before mounting format-specific DOM (docx container is v-if gated)
    loading.value = false

    if (previewKind.value === 'docx') {
      await mountDocxPreview()
    } else if (previewKind.value === 'xlsx') {
      const workbook = XLSX.read(blobBuffer, { type: 'array' })
      sheetNames.value = workbook.SheetNames
      activeSheet.value = workbook.SheetNames[0] || ''
      parseXlsxSheet(activeSheet.value)
    } else if (previewKind.value === 'text') {
      await renderText()
    }
  } catch (err: unknown) {
    console.error('[DocumentLiveFilePreview] load failed:', err)
    errorMessage.value = err instanceof Error ? err.message : 'Could not load file preview.'
  } finally {
    loading.value = false
  }
}

const downloadFile = () => {
  if (!fileObjectURL.value || !fileName.value) return
  const anchor = document.createElement('a')
  anchor.href = fileObjectURL.value
  anchor.download = fileName.value
  anchor.rel = 'noopener'
  anchor.click()
}

watch(
  () => [props.documentId, props.active] as const,
  () => {
    loadBlob()
  },
  { immediate: true },
)

watch(docxPreviewContainer, async (el) => {
  if (el && previewKind.value === 'docx' && blobBuffer && !loading.value && !el.childElementCount) {
    await renderDocx()
  }
})

onBeforeUnmount(resetState)
</script>

<style>
.docx-live-preview .docx-wrapper {
  background: transparent !important;
  padding: 0 !important;
  display: flex !important;
  justify-content: center !important;
}
.docx-live-preview .docx {
  box-shadow: none !important;
  margin: 0 auto !important;
  max-width: 100% !important;
  background: #ffffff !important;
  color: #1a1a1a !important;
}
.dark .docx-live-preview .docx {
  background: #0a0a0a !important;
  color: #e4e4e7 !important;
}
</style>
