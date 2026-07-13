<template>
  <div class="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] rounded-3xl overflow-hidden border  relative" :class="isDark ? 'bg-onyx-black border-onyx-border' : 'bg-gray-950 border-gray-800'">

    <!-- ── Top bar ──────────────────────────────────────────────────────── -->
    <header ref="scanHeaderEl" class="flex items-center justify-between px-4 pt-4 pb-3">
      <NuxtLink
        to="/employee/documents"
        class="inline-flex items-center gap-1.5 rounded-none px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <Icon name="ph:arrow-left-light" class="h-4 w-4" />
        Back
      </NuxtLink>

      <h1 class="text-sm font-bold text-white">Employee Document Scanner</h1>

      <!-- Mode toggle pill -->
      <div class="flex rounded-none border border-white/10 bg-white/5 backdrop-blur-md p-1 shadow-inner">
        <button
          type="button"
          class="rounded-none px-3 py-1 text-[11px] font-bold transition-all"
          :class="mode === 'pickup'
            ? 'bg-candy-orange text-white shadow'
            : 'text-white/50 hover:text-white/80'"
          @click="switchMode('pickup')"
        >
          Pickup
        </button>
        <button
          type="button"
          class="rounded-none px-3 py-1 text-[11px] font-bold transition-all"
          :class="mode === 'dropoff'
            ? 'bg-candy-orange text-white shadow'
            : 'text-white/50 hover:text-white/80'"
          @click="switchMode('dropoff')"
        >
          Drop-off
        </button>
      </div>
    </header>

    <!-- ── Mode label ───────────────────────────────────────────────────── -->
    <div ref="scanSubtitleEl" class="px-4 pb-3 text-center">
      <p class="text-xs text-white/50">
        <span v-if="mode === 'pickup'">
          Scan a <strong class="text-candy-orange">document QR</strong> or the client's <strong class="text-candy-orange">dispatch station badge</strong>
        </span>
        <span v-else>Scan the QR code <strong class="text-candy-orange">posted on the office wall</strong></span>
      </p>
    </div>

    <!-- ── Camera scanner ───────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col items-center justify-center px-4 pt-2 pb-4 overflow-hidden relative">
      <QrScanner
        :key="scannerKey"
        :scanner-id="`fv-scanner-${scannerKey}`"
        :fps="12"
        :qrbox-size="220"
        theme-color="orange"
        @scan="handleScan"
        @error="handleCameraError"
      />

      <!-- ── Result card ─────────────────────────────────────────────────── -->
      <Transition name="result-pop">
        <div
          v-if="scanState !== 'idle'"
          class="mt-5 w-full max-w-[360px] overflow-hidden rounded-none border bg-black/40 backdrop-blur-xl "
          :class="resultCardClass"
        >
          <!-- Processing -->
          <div v-if="scanState === 'processing'" class="flex items-center gap-3 p-5">
            <Icon name="ph:spinner-gap-light" class="h-6 w-6 animate-spin text-candy-orange flex-shrink-0" />
            <div>
              <p class="text-sm font-bold text-white">Processing scan…</p>
              <p class="text-xs text-white/60 mt-0.5">Contacting server</p>
            </div>
          </div>

          <!-- SUCCESS ── Pickup -->
          <div v-else-if="scanState === 'success' && mode === 'pickup'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-emerald-500/20">
                <Icon name="ph:check-circle-light" class="h-6 w-6 text-emerald-400" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  {{ resultData?.checkpoint_only ? 'Origin Checkpoint' : 'Pickup Confirmed' }}
                </p>
                <p v-if="resultData?.office?.name" class="mt-1 text-xs text-white/60">
                  Station: <strong class="text-white/80">{{ resultData.office.name }}</strong>
                </p>
                <p v-if="resultData?.document?.title" class="mt-1 text-sm font-bold text-white truncate">
                  {{ resultData.document.title }}
                </p>
                <p v-else-if="resultData?.checkpoint_only" class="mt-1 text-sm text-white/80">
                  Checked in — no documents waiting at this station.
                </p>
                <p v-if="resultData?.destination?.office_name" class="mt-1 text-xs text-white/60">
                  <Icon name="ph:map-pin-light" class="inline h-3 w-3 text-candy-orange mr-1" />
                  Heading to <strong class="text-white/80">{{ resultData.destination.office_name }}</strong>
                  <span class="ml-1 text-candy-orange">(Step {{ resultData.destination.step }})</span>
                </p>
                <div
                  v-if="resultData?.document"
                  class="mt-2.5 inline-flex items-center gap-1.5 rounded-none bg-transparent border border-candy-orange px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-candy-orange"
                >
                  <Icon name="ph:motorcycle-light" class="h-3.5 w-3.5" />
                  IN TRANSIT
                </div>
              </div>
            </div>
          </div>

          <!-- SUCCESS ── Dropoff -->
          <div v-else-if="scanState === 'success' && mode === 'dropoff'" class="p-5">
            <div class="flex items-start gap-3">
              <span
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none"
                :class="resultData?.is_final_stop ? 'bg-emerald-500/20' : 'bg-transparent'"
              >
                <Icon
                  :name="resultData?.is_final_stop ? 'ph:check-circle-fill' : 'ph:buildings-fill'"
                  class="h-6 w-6"
                  :class="resultData?.is_final_stop ? 'text-emerald-400' : 'text-candy-orange'"
                />
              </span>
              <div class="min-w-0 flex-1">
                <p
                  class="text-xs font-bold uppercase tracking-widest"
                  :class="resultData?.is_final_stop ? 'text-emerald-400' : 'text-candy-orange'"
                >
                  {{ resultData?.is_final_stop ? 'Arrived at Final Stop' : 'Arrived at Office' }}
                </p>
                <p class="mt-1 text-sm font-bold text-white truncate">{{ resultData?.data?.office?.name }}</p>
                <p class="mt-1 text-xs text-white/60">
                  <span v-if="resultData?.is_final_stop">Arrived at final stop. Awaiting employee desk review.</span>
                  <span v-else>
                    Step {{ resultData?.data?.step }} / {{ resultData?.data?.total_steps }} checked in.
                    Awaiting employee desk review before next pickup.
                  </span>
                </p>
                <div
                  class="mt-2.5 inline-flex items-center gap-1.5 rounded-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border"
                  :class="resultData?.is_final_stop
                    ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                    : 'bg-transparent border-candy-orange text-candy-orange'"
                >
                  <Icon :name="resultData?.is_final_stop ? 'ph:check-circle-fill' : 'ph:buildings-fill'" class="h-3.5 w-3.5" />
                  {{ resultData?.is_final_stop ? 'AWAITING REVIEW' : 'ARRIVED' }}
                </div>
              </div>
            </div>
          </div>

          <!-- SECURITY ERROR -->
          <div v-else-if="scanState === 'security-error'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-red-500/20">
                <Icon name="ph:shield-warning-light" class="h-6 w-6 text-red-400" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-red-400">🚫 Security Violation</p>
                <p class="mt-1 text-sm font-bold text-white">Cross-Org Scan Blocked</p>
                <p class="mt-1 text-xs leading-relaxed text-white/60">
                  This asset belongs to a <strong class="text-red-400">different organisation</strong>. Scanning external checkpoints is strictly prohibited.
                </p>
              </div>
            </div>
            <div class="mt-3 rounded-none bg-red-500/5 border border-red-500/20 px-4 py-3 text-[11px] font-mono text-red-400 break-all">
              {{ errorMessage }}
            </div>
          </div>

          <!-- ROUTE MISMATCH ERROR -->
          <div v-else-if="scanState === 'route-error'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-transparent">
                <Icon name="ph:warning-light" class="h-6 w-6 text-candy-orange" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-candy-orange">Wrong Checkpoint</p>
                <p class="mt-1 text-sm font-bold text-white">Route Mismatch</p>
                <p class="mt-1 text-xs leading-relaxed text-white/60">{{ errorMessage }}</p>
              </div>
            </div>
          </div>

          <!-- GENERIC ERROR -->
          <div v-else-if="scanState === 'error'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-transparent">
                <Icon name="ph:x-circle-light" class="h-6 w-6 text-red-400" />
              </span>
              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-widest text-red-400">Scan Failed</p>
                <p class="mt-1 text-xs leading-relaxed text-white/60">{{ errorMessage }}</p>
              </div>
            </div>
          </div>

          <!-- UNKNOWN QR -->
          <div v-else-if="scanState === 'unknown'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-gray-500/10">
                <Icon name="ph:question-light" class="h-6 w-6 text-gray-400" />
              </span>
              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-widest text-gray-400">Unrecognised QR</p>
                <p class="mt-1 text-xs text-white/60">This QR code is not a FlowVision document or office checkpoint.</p>
                <p class="mt-1 break-all font-mono text-[10px] text-gray-500">{{ rawScan }}</p>
              </div>
            </div>
          </div>

          <!-- Scan-again button (for all non-processing states) -->
          <div v-if="scanState !== 'processing'" class="border-t border-white/5 px-5 py-3">
            <button
              type="button"
              class="w-full flex items-center justify-center gap-2 rounded-none bg-white/5 py-3 text-xs font-bold text-white transition hover:bg-white/10 active:scale-[0.98]"
              @click="resetScan"
            >
              <Icon name="ph:scan-light" class="h-4 w-4 text-candy-orange" />
              Scan Next
            </button>
          </div>
        </div>
      </Transition>

      <!-- ── Instruction chip when idle ──────────────────────────────────── -->
      <div
        v-if="scanState === 'idle'"
        class="mt-4 flex items-center gap-2 rounded-none border border-candy-orange bg-transparent px-4 py-2.5 text-xs text-candy-orange/80"
      >
        <Icon name="ph:qr-code-light" class="h-4 w-4 text-candy-orange flex-shrink-0" />
        <span>
          <strong v-if="mode === 'pickup'">Point camera at document QR</strong>
          <strong v-else>Point camera at office wall QR</strong>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from '~/stores/auth'
import QrScanner from '~/components/messenger/QrScanner.vue'
import {
  buildDocumentTrackQrPayload,
  extractCheckpointOfficeId,
  extractDocumentTrackId,
  parseFlowVisionQr,
} from '~/utils/parseFlowVisionQr'

definePageMeta({ layout: 'employee' })

const auth    = useAuthStore()
const { isDark } = useTheme()
const route = useRoute()

// GSAP refs
const scanHeaderEl   = ref<HTMLElement | null>(null)
const scanSubtitleEl = ref<HTMLElement | null>(null)

onMounted(() => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (scanHeaderEl.value) {
    tl.fromTo(scanHeaderEl.value, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.4 }, 0)
  }
  if (scanSubtitleEl.value) {
    tl.fromTo(scanSubtitleEl.value, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35 }, 0.18)
  }
})

// ── State ──────────────────────────────────────────────────────────────
type ScanMode  = 'pickup' | 'dropoff'
type ScanState = 'idle' | 'processing' | 'success' | 'error' | 'security-error' | 'route-error' | 'unknown'

const mode       = ref<ScanMode>((route.query.mode === 'dropoff' ? 'dropoff' : 'pickup') as ScanMode)
const scanState  = ref<ScanState>('idle')
const rawScan    = ref<string | null>(null)
const resultData = ref<any>(null)
const errorMessage = ref('')
const scannerKey = ref(0) // bump to force re-mount scanner

// ── Computed ───────────────────────────────────────────────────────────
const resultCardClass = computed(() => {
  switch (scanState.value) {
    case 'security-error': return 'border-red-500/40 bg-red-950/80  shadow-red-500/10'
    case 'route-error':    return 'border-amber-500/30 bg-amber-950/80  shadow-amber-500/10'
    case 'error':          return 'border-red-400/20 bg-gray-900'
    case 'success':        return 'border-emerald-500/30 bg-gray-900  shadow-emerald-500/10'
    case 'unknown':        return 'border-white/10 bg-gray-900'
    default:               return 'border-amber-500/20 bg-gray-900'
  }
})

// ── Scan actions ───────────────────────────────────────────────────────
const handleDocumentPickup = async (qrCodeData: string) => {
  const res = await $fetch<any>('/api/tracking/pickup', {
    method: 'POST',
    body: { qr_code_data: qrCodeData },
  })
  resultData.value = res.data
  scanState.value  = 'success'
}

const handleCheckpointPickup = async (officeId: string) => {
  const res = await $fetch<any>('/api/tracking/checkpoint-pickup', {
    method: 'POST',
    body: { office_id: officeId },
  })
  resultData.value = res.data
  scanState.value  = 'success'
}

const handleDocumentDropOff = async (officeId: string) => {
  const res = await $fetch<any>('/api/tracking/dropoff', {
    method: 'POST',
    body: { office_id: officeId },
  })
  resultData.value = res
  scanState.value  = 'success'
}

const applyScanError = (err: any) => {
  const msg  = err?.data?.message ?? err?.message ?? 'An unexpected error occurred.'
  const code = err?.data?.data?.code ?? ''

  if (code === 'SECURITY_ORG_MISMATCH' || msg.includes('SECURITY_ORG_MISMATCH')) {
    scanState.value    = 'security-error'
    errorMessage.value = msg
  } else if (code === 'ROUTE_MISMATCH' || msg.includes('ROUTE_MISMATCH')) {
    scanState.value    = 'route-error'
    errorMessage.value = msg.replace('ROUTE_MISMATCH: ', '')
  } else {
    scanState.value    = 'error'
    errorMessage.value = msg
  }
}

// ── Scan handler ───────────────────────────────────────────────────────
const handleScan = async (raw: string) => {
  rawScan.value      = raw
  scanState.value    = 'processing'
  resultData.value   = null
  errorMessage.value = ''

  const scannedText = raw.trim()

  try {
    if (scannedText.startsWith('flowvision://track/checkpoint')) {
      const targetOfficeId = extractCheckpointOfficeId(scannedText)
      if (!targetOfficeId) {
        errorMessage.value = 'Invalid FlowVision QR format. Please scan a valid office checkpoint.'
        scanState.value = 'error'
        return
      }

      if (mode.value === 'dropoff') {
        await handleDocumentDropOff(targetOfficeId)
      } else {
        await handleCheckpointPickup(targetOfficeId)
      }
      return
    }

    if (scannedText.startsWith('flowvision://track/doc')) {
      const documentId = extractDocumentTrackId(scannedText)
      if (!documentId) {
        errorMessage.value = 'Invalid FlowVision QR format. Please scan a valid document tracking code.'
        scanState.value = 'error'
        return
      }

      if (mode.value === 'dropoff') {
        errorMessage.value = 'You scanned a document QR in Drop-off mode. Switch to Pickup mode to pick up a document.'
        scanState.value = 'error'
        return
      }

      await handleDocumentPickup(buildDocumentTrackQrPayload(documentId))
      return
    }

    const payload = parseFlowVisionQr(scannedText)

    if (payload.type === 'unknown') {
      scanState.value = 'unknown'
      return
    }

    if (payload.type === 'document') {
      if (mode.value === 'dropoff') {
        errorMessage.value = 'You scanned a document QR in Drop-off mode. Switch to Pickup mode to pick up a document.'
        scanState.value = 'error'
        return
      }
      await handleDocumentPickup(payload.qr)
      return
    }

    if (payload.type === 'office') {
      if (mode.value === 'pickup') {
        errorMessage.value = 'You scanned an office drop-off QR in Pickup mode. Switch to Drop-off mode to check in at an office.'
        scanState.value = 'error'
        return
      }
      await handleDocumentDropOff(payload.id)
      return
    }

    if (payload.type === 'checkpoint') {
      if (mode.value === 'dropoff') {
        await handleDocumentDropOff(payload.office_id)
      } else {
        await handleCheckpointPickup(payload.office_id)
      }
    }
  } catch (err: any) {
    applyScanError(err)
  }
}

const handleCameraError = (msg: string) => {
  errorMessage.value = msg
  if (scanState.value === 'idle') {
    // Don't override an existing result with a camera error
  }
}

// ── Controls ───────────────────────────────────────────────────────────
const resetScan = () => {
  scanState.value    = 'idle'
  rawScan.value      = null
  resultData.value   = null
  errorMessage.value = ''
  // Re-mount scanner to resume after pause
  scannerKey.value++
}

const switchMode = (newMode: ScanMode) => {
  mode.value = newMode
  resetScan()
}
</script>

<style scoped>
.result-pop-enter-active { transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.result-pop-leave-active { transition: all 0.2s ease; }
.result-pop-enter-from   { opacity: 0; transform: translateY(16px) scale(0.97); }
.result-pop-leave-to     { opacity: 0; transform: translateY(8px) scale(0.98); }
</style>
