<template>
  <div class="min-h-screen flex flex-col" :class="isDark ? 'bg-rich-black' : 'bg-gray-950'">

    <!-- ── Top bar ──────────────────────────────────────────────────────── -->
    <header class="flex items-center justify-between px-4 pt-4 pb-3">
      <NuxtLink
        to="/messenger/dashboard"
        class="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <Icon name="ph:arrow-left-bold" class="h-4 w-4" />
        Back
      </NuxtLink>

      <h1 class="text-sm font-bold text-white">Document Handshake</h1>

      <!-- Mode toggle pill -->
      <div class="flex rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          class="rounded-lg px-3 py-1 text-[11px] font-bold transition-all"
          :class="mode === 'pickup'
            ? 'bg-amber-500 text-white shadow'
            : 'text-white/50 hover:text-white/80'"
          @click="switchMode('pickup')"
        >
          Pickup
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1 text-[11px] font-bold transition-all"
          :class="mode === 'dropoff'
            ? 'bg-amber-500 text-white shadow'
            : 'text-white/50 hover:text-white/80'"
          @click="switchMode('dropoff')"
        >
          Drop-off
        </button>
      </div>
    </header>

    <!-- ── Mode label ───────────────────────────────────────────────────── -->
    <div class="px-4 pb-3 text-center">
      <p class="text-xs text-white/50">
        <span v-if="mode === 'pickup'">Scan the QR code <strong class="text-amber-400">printed on the document</strong></span>
        <span v-else>Scan the QR code <strong class="text-amber-400">posted on the office wall</strong></span>
      </p>
    </div>

    <!-- ── Camera scanner ───────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col items-center justify-start px-4 pt-2 pb-4">
      <QrScanner
        :key="scannerKey"
        :scanner-id="`fv-scanner-${scannerKey}`"
        :fps="12"
        :qrbox-size="220"
        @scan="handleScan"
        @error="handleCameraError"
      />

      <!-- ── Result card ─────────────────────────────────────────────────── -->
      <Transition name="result-pop">
        <div
          v-if="scanState !== 'idle'"
          class="mt-5 w-full max-w-[360px] overflow-hidden rounded-2xl border"
          :class="resultCardClass"
        >
          <!-- Processing -->
          <div v-if="scanState === 'processing'" class="flex items-center gap-3 p-5">
            <Icon name="ph:spinner-gap" class="h-6 w-6 animate-spin text-amber-400 flex-shrink-0" />
            <div>
              <p class="text-sm font-bold text-white">Processing scan…</p>
              <p class="text-xs text-white/60 mt-0.5">Contacting server</p>
            </div>
          </div>

          <!-- SUCCESS ── Pickup -->
          <div v-else-if="scanState === 'success' && mode === 'pickup'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                <Icon name="ph:check-circle-fill" class="h-6 w-6 text-emerald-400" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-emerald-400">Pickup Confirmed</p>
                <p class="mt-1 text-sm font-bold text-white truncate">{{ resultData?.document?.title || 'Document' }}</p>
                <p v-if="resultData?.destination?.office_name" class="mt-1 text-xs text-white/60">
                  <Icon name="ph:map-pin-fill" class="inline h-3 w-3 text-amber-400 mr-1" />
                  Heading to <strong class="text-white/80">{{ resultData.destination.office_name }}</strong>
                  <span class="ml-1 text-amber-400">(Step {{ resultData.destination.step }})</span>
                </p>
                <div class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  <Icon name="ph:motorcycle-fill" class="h-3 w-3" />
                  IN TRANSIT
                </div>
              </div>
            </div>
          </div>

          <!-- SUCCESS ── Dropoff -->
          <div v-else-if="scanState === 'success' && mode === 'dropoff'" class="p-5">
            <div class="flex items-start gap-3">
              <span
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                :class="resultData?.is_final_stop ? 'bg-emerald-500/20' : 'bg-amber-500/20'"
              >
                <Icon
                  :name="resultData?.is_final_stop ? 'ph:check-circle-fill' : 'ph:buildings-fill'"
                  class="h-6 w-6"
                  :class="resultData?.is_final_stop ? 'text-emerald-400' : 'text-amber-400'"
                />
              </span>
              <div class="min-w-0 flex-1">
                <p
                  class="text-xs font-bold uppercase tracking-widest"
                  :class="resultData?.is_final_stop ? 'text-emerald-400' : 'text-amber-400'"
                >
                  {{ resultData?.is_final_stop ? '🎉 Delivery Complete' : 'Arrived at Office' }}
                </p>
                <p class="mt-1 text-sm font-bold text-white truncate">{{ resultData?.data?.office?.name }}</p>
                <p class="mt-1 text-xs text-white/60">
                  <span v-if="resultData?.is_final_stop">All stages completed. Document delivered.</span>
                  <span v-else>
                    Step {{ resultData?.data?.step }} / {{ resultData?.data?.total_steps }} complete.
                    Ready for next leg.
                  </span>
                </p>
                <div
                  class="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  :class="resultData?.is_final_stop
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rich-orange/10 text-rich-orange'"
                >
                  <Icon :name="resultData?.is_final_stop ? 'ph:check-circle-fill' : 'ph:buildings-fill'" class="h-3 w-3" />
                  {{ resultData?.is_final_stop ? 'COMPLETED' : 'ARRIVED' }}
                </div>
              </div>
            </div>
          </div>

          <!-- SECURITY ERROR -->
          <div v-else-if="scanState === 'security-error'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/20">
                <Icon name="ph:shield-warning-fill" class="h-6 w-6 text-red-400" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-red-400">🚫 Security Violation</p>
                <p class="mt-1 text-sm font-bold text-white">Cross-Org Scan Blocked</p>
                <p class="mt-1 text-xs leading-relaxed text-white/60">
                  This asset belongs to a <strong class="text-red-400">different organisation</strong>. Scanning external checkpoints is strictly prohibited.
                </p>
              </div>
            </div>
            <div class="mt-3 rounded-xl bg-red-500/5 border border-red-500/20 px-4 py-3 text-[11px] font-mono text-red-400 break-all">
              {{ errorMessage }}
            </div>
          </div>

          <!-- ROUTE MISMATCH ERROR -->
          <div v-else-if="scanState === 'route-error'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                <Icon name="ph:warning-fill" class="h-6 w-6 text-amber-400" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-amber-400">Wrong Checkpoint</p>
                <p class="mt-1 text-sm font-bold text-white">Route Mismatch</p>
                <p class="mt-1 text-xs leading-relaxed text-white/60">{{ errorMessage }}</p>
              </div>
            </div>
          </div>

          <!-- GENERIC ERROR -->
          <div v-else-if="scanState === 'error'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <Icon name="ph:x-circle-fill" class="h-6 w-6 text-red-400" />
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
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-500/10">
                <Icon name="ph:question-fill" class="h-6 w-6 text-gray-400" />
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
              class="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 active:scale-[0.98]"
              @click="resetScan"
            >
              <Icon name="ph:scan" class="h-4 w-4 text-amber-400" />
              Scan Next
            </button>
          </div>
        </div>
      </Transition>

      <!-- ── Instruction chip when idle ──────────────────────────────────── -->
      <div
        v-if="scanState === 'idle'"
        class="mt-4 flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-300/80"
      >
        <Icon name="ph:qr-code" class="h-4 w-4 text-amber-400 flex-shrink-0" />
        <span>
          <strong v-if="mode === 'pickup'">Point camera at document QR</strong>
          <strong v-else>Point camera at office wall QR</strong>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import QrScanner from '~/components/messenger/QrScanner.vue'

definePageMeta({ layout: 'messenger' })

const auth    = useAuthStore()
const { isDark } = useTheme()

// ── State ──────────────────────────────────────────────────────────────
type ScanMode  = 'pickup' | 'dropoff'
type ScanState = 'idle' | 'processing' | 'success' | 'error' | 'security-error' | 'route-error' | 'unknown'

const mode       = ref<ScanMode>('pickup')
const scanState  = ref<ScanState>('idle')
const rawScan    = ref<string | null>(null)
const resultData = ref<any>(null)
const errorMessage = ref('')
const scannerKey = ref(0) // bump to force re-mount scanner

// ── Computed ───────────────────────────────────────────────────────────
const resultCardClass = computed(() => {
  switch (scanState.value) {
    case 'security-error': return 'border-red-500/40 bg-red-950/80 shadow-lg shadow-red-500/10'
    case 'route-error':    return 'border-amber-500/30 bg-amber-950/80 shadow-lg shadow-amber-500/10'
    case 'error':          return 'border-red-400/20 bg-gray-900'
    case 'success':        return 'border-emerald-500/30 bg-gray-900 shadow-lg shadow-emerald-500/10'
    case 'unknown':        return 'border-white/10 bg-gray-900'
    default:               return 'border-amber-500/20 bg-gray-900'
  }
})

// ── QR type detection ──────────────────────────────────────────────────
const parseQrPayload = (raw: string): { type: 'document'; qr: string } | { type: 'office'; id: number } | { type: 'unknown' } => {
  const trimmed = raw.trim()

  // Office QR: flowvision://office/[ID]
  const officeMatch = trimmed.match(/^flowvision:\/\/office\/(\d+)$/i)
  if (officeMatch) return { type: 'office', id: Number(officeMatch[1]) }

  // Document QR: QR-XXXXXXXXX  OR legacy alphanumeric codes
  if (trimmed.startsWith('QR-') || /^[A-Z0-9]{6,}$/.test(trimmed)) {
    return { type: 'document', qr: trimmed }
  }

  return { type: 'unknown' }
}

// ── Scan handler ───────────────────────────────────────────────────────
const handleScan = async (raw: string) => {
  rawScan.value    = raw
  scanState.value  = 'processing'
  resultData.value = null
  errorMessage.value = ''

  const payload = parseQrPayload(raw)

  if (payload.type === 'unknown') {
    scanState.value = 'unknown'
    return
  }

  // Guard: document QR in dropoff mode (or vice versa) — auto-switch or warn
  if (payload.type === 'document' && mode.value === 'dropoff') {
    errorMessage.value = 'You scanned a document QR in Drop-off mode. Switch to Pickup mode to pick up a document.'
    scanState.value = 'error'
    return
  }

  if (payload.type === 'office' && mode.value === 'pickup') {
    errorMessage.value = 'You scanned an office QR in Pickup mode. Switch to Drop-off mode to check in at an office.'
    scanState.value = 'error'
    return
  }

  try {
    if (payload.type === 'document') {
      // ── Pickup handshake ───────────────────────────────────────────
      const res = await $fetch<any>('/api/tracking/pickup', {
        method: 'POST',
        body: { qr_code_data: payload.qr },
      })
      resultData.value = res.data
      scanState.value  = 'success'

    } else if (payload.type === 'office') {
      // ── Dropoff handshake ──────────────────────────────────────────
      const res = await $fetch<any>('/api/tracking/dropoff', {
        method: 'POST',
        body: { office_id: payload.id },
      })
      resultData.value = res
      scanState.value  = 'success'
    }

  } catch (err: any) {
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
