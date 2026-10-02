<template>
  <div class="relative flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-2xl border shadow-sm md:h-[calc(100vh-8rem)]" :class="isDark ? 'bg-onyx-black border-onyx-border' : 'bg-gray-950 border-gray-800'">
    <header class="flex flex-col gap-3 px-4 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center justify-between sm:contents">
        <NuxtLink
          :to="backTo"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="ph:arrow-left-light" class="h-4 w-4" />
          Back
        </NuxtLink>
        <h1 class="text-sm font-bold text-white">{{ title }}</h1>
      </div>

      <div v-if="allowReceive" class="flex rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          v-for="m in modes"
          :key="m.value"
          type="button"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs font-bold transition-colors"
          :class="mode === m.value ? 'bg-candy-orange text-white shadow-sm' : 'text-white/50 hover:text-white/80'"
          @click="switchMode(m.value)"
        >
          <Icon :name="m.icon" class="h-3.5 w-3.5" />
          {{ m.label }}
        </button>
      </div>
    </header>

    <p class="px-4 pb-3 text-center text-xs text-white/60">
      <template v-if="mode === 'receive'">
        A liaison is handing you a document? Scan <strong class="text-candy-orange">the QR code on the document</strong> to receive it. You'll be recorded as its holder.
      </template>
      <template v-else>
        Picking up a document assigned to you? Scan <strong class="text-candy-orange">the QR code on the document</strong>.
      </template>
    </p>

    <div class="flex flex-1 flex-col items-center justify-start overflow-y-auto px-4 pb-4 pt-2">
      <QrScanner
        :key="scannerKey"
        :scanner-id="`fv-office-scanner-${scannerKey}`"
        :fps="12"
        :qrbox-size="220"
        theme-color="orange"
        @scan="handleScan"
        @error="cameraError = $event"
      />
      <p v-if="cameraError && state === 'idle'" class="mt-3 max-w-sm text-center text-xs text-danger">{{ cameraError }}</p>

      <div
        v-if="state !== 'idle'"
        class="mt-5 w-full max-w-[380px] overflow-hidden rounded-2xl border bg-gray-900 shadow-sm"
        :class="state === 'success' ? 'border-success/40' : state === 'processing' ? 'border-candy-orange/30' : 'border-danger/30'"
      >
        <div v-if="state === 'processing'" class="flex items-center gap-3 p-5">
          <Icon name="ph:spinner-gap" class="h-6 w-6 animate-spin text-candy-orange" />
          <p class="text-sm font-bold text-white">{{ resultMode === 'receive' ? 'Recording receipt…' : 'Recording pickup…' }}</p>
        </div>

        <div v-else-if="state === 'success'" class="p-5">
          <p class="text-xs font-bold uppercase tracking-widest text-success">
            {{ resultMode === 'receive' ? 'Document received' : 'Pickup confirmed' }}
          </p>
          <p v-if="result?.title" class="mt-1 truncate text-sm font-bold text-white">{{ result.title }}</p>
          <p class="mt-1 text-xs leading-relaxed text-white/70">{{ result?.message }}</p>
        </div>

        <div v-else class="p-5">
          <p class="text-xs font-bold uppercase tracking-widest text-danger">Scan not completed</p>
          <p class="mt-1 text-xs leading-relaxed text-white/70">{{ errorMessage }}</p>
        </div>

        <div v-if="state !== 'processing'" class="border-t border-white/5 px-5 py-3">
          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-xs font-bold text-white transition hover:bg-white/10"
            @click="resetScan"
          >
            <Icon name="ph:scan" class="h-4 w-4 text-candy-orange" />
            Scan next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import QrScanner from '~/components/messenger/QrScanner.vue'
import { extractCheckpointOfficeId, extractDocumentTrackId } from '~/utils/parseFlowVisionQr'

type Mode = 'receive' | 'pickup'

const props = withDefaults(defineProps<{
  backTo: string
  title?: string
  /** Office staff can receive; clients only pick up documents assigned to them. */
  allowReceive?: boolean
}>(), {
  title: 'Document Scanner',
  allowReceive: true,
})

const { isDark } = useTheme()
const modes = [
  { value: 'receive' as Mode, label: 'Receive', icon: 'ph:tray-arrow-down-bold' },
  { value: 'pickup' as Mode, label: 'Pick up', icon: 'ph:hand-bold' },
]
const route = useRoute()
const requestedMode = route.query.mode === 'pickup' ? 'pickup' : route.query.mode === 'receive' ? 'receive' : null
const mode = ref<Mode>(props.allowReceive ? (requestedMode ?? 'receive') : 'pickup')
const resultMode = ref<Mode>(mode.value)
const state = ref<'idle' | 'processing' | 'success' | 'error'>('idle')
const result = ref<{ title?: string; message?: string } | null>(null)
const errorMessage = ref('')
const cameraError = ref('')
const scannerKey = ref(0)

const RETIRED_QR = /^flowvision:\/\/(desk|track\/staff|office)\b/i

async function handleScan(raw: string) {
  if (state.value === 'processing') return // ignore repeated camera frames
  const text = raw.trim()
  resultMode.value = mode.value
  result.value = null
  errorMessage.value = ''

  if (RETIRED_QR.test(text)) {
    state.value = 'error'
    errorMessage.value = 'Desk, staff and office-wall QR codes are no longer used. Scan the QR code printed on the document itself.'
    return
  }

  const documentId = extractDocumentTrackId(text) ?? (/^[0-9a-f-]{36}$/i.test(text) ? text : null)
  const checkpointOfficeId = extractCheckpointOfficeId(text)

  state.value = 'processing'
  try {
    if (documentId) {
      const res: any = mode.value === 'receive'
        ? await $fetch('/api/tracking/receive', { method: 'POST', body: { document_id: documentId } })
        : await $fetch('/api/tracking/pickup', { method: 'POST', body: { document_id: documentId } })
      result.value = {
        title: res?.data?.document?.title,
        message: res?.message,
      }
      state.value = 'success'
      return
    }
    if (checkpointOfficeId && mode.value === 'pickup') {
      const res: any = await $fetch('/api/tracking/checkpoint-pickup', { method: 'POST', body: { office_id: checkpointOfficeId } })
      result.value = { title: res?.data?.document?.title, message: res?.message }
      state.value = 'success'
      return
    }
    state.value = 'error'
    errorMessage.value = 'This isn\'t a FlowVision document QR code. Scan the QR code printed on the document.'
  } catch (err: any) {
    state.value = 'error'
    errorMessage.value = err?.data?.message || err?.message || 'The scan could not be processed. Please try again.'
  }
}

function resetScan() {
  state.value = 'idle'
  result.value = null
  errorMessage.value = ''
  scannerKey.value++
}

function switchMode(next: Mode) {
  mode.value = next
  resetScan()
}
</script>
