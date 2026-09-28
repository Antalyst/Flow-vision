<template>
  <div class="min-h-screen flex flex-col" :class="isDark ? 'bg-onyx-black' : 'bg-gray-950'">

    <!-- ── Top bar ──────────────────────────────────────────────────────── -->
    <header class="flex items-center justify-between px-4 pt-4 pb-3">
      <NuxtLink
        to="/messenger/deliveries"
        class="inline-flex items-center gap-1.5 rounded-none px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <Icon name="ph:arrow-left-light" class="h-4 w-4" />
        Deliveries
      </NuxtLink>

      <h1 class="text-sm font-bold text-white">Document Handshake</h1>

      <!-- Mode toggle pill -->
      <div class="flex rounded-none border border-white/10 bg-white/5 backdrop-blur-md p-1 shadow-inner">
        <button
          type="button"
          class="rounded-none px-3 py-1 text-[14px] font-bold transition-all"
          :class="mode === 'pickup'
            ? 'bg-cyan-500 text-black font-extrabold shadow'
            : 'text-white/50 hover:text-white/80'"
          @click="switchMode('pickup')"
        >
          Pickup
        </button>
        <button
          type="button"
          class="rounded-none px-3 py-1 text-[14px] font-bold transition-all"
          :class="mode === 'dropoff'
            ? 'bg-emerald-500 text-black font-extrabold shadow'
            : 'text-white/50 hover:text-white/80'"
          @click="switchMode('dropoff')"
        >
          Drop-off
        </button>
      </div>
    </header>

    <!-- ── 🎯 Focused Target Banner (Context-Aware Action Mode) ────────── -->
    <div class="mx-4 mb-3">
      <!-- Active Focus Banner -->
      <div
        v-if="focusedDoc"
        class="relative overflow-hidden rounded-none border-2 bg-black/90 p-3.5 shadow-lg backdrop-blur-md"
        :class="mode === 'pickup' ? 'border-cyan-500 shadow-cyan-500/10' : 'border-emerald-500 shadow-emerald-500/10'"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              class="flex h-5 w-5 items-center justify-center text-black font-black text-xs"
              :class="mode === 'pickup' ? 'bg-cyan-400' : 'bg-emerald-400'"
            >
              🎯
            </span>
            <p class="text-xs font-bold text-white">
              <span
                class="font-black uppercase tracking-wider text-[14px] mr-1"
                :class="mode === 'pickup' ? 'text-cyan-400' : 'text-emerald-400'"
              >
                {{ mode === 'pickup' ? 'Pickup Target:' : 'Drop-off Target:' }}
              </span>
              <span class="font-extrabold">{{ focusedDoc.title }}</span>
              <span class="text-white/60 mx-1.5">→</span>
              <span
                class="font-bold"
                :class="mode === 'pickup' ? 'text-cyan-300' : 'text-emerald-300'"
              >
                {{ mode === 'pickup' ? `Origin: ${focusedDoc.origin_office_name || 'Origin Station'}` : `Destination: ${focusedDoc.destination_office_name || 'Destination Station'}` }}
              </span>
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span
              v-if="focusedDoc.priority"
              class="px-2 py-0.5 text-[12px] font-extrabold uppercase tracking-wider border"
              :class="getPriorityBadgeClass(focusedDoc.priority)"
            >
              {{ focusedDoc.priority }} SLA
            </span>

            <!-- Compact In-Scanner Switcher -->
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-none border px-2 py-0.5 text-[13px] font-bold uppercase tracking-wider transition"
              :class="mode === 'pickup'
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-400 hover:text-black'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-400 hover:text-black'"
              @click="showPickerModal = true"
            >
              <Icon name="ph:arrows-down-up-light" class="h-3 w-3" />
              Switch Target
            </button>

            <!-- Clear Focus -->
            <button
              type="button"
              class="text-[13px] text-white/50 hover:text-white transition px-1.5 py-0.5 border border-white/10"
              title="Clear active focus"
              @click="messengerStore.clearFocus()"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[14px] text-white/60 font-mono">
          <span>ID: {{ focusedDoc.tracking_id }}</span>
          <span class="text-amber-400 font-semibold">
            Step {{ focusedDoc.current_step }}/{{ focusedDoc.total_steps || '—' }}
          </span>
          <span v-if="focusedDoc.target_completion_date || focusedDoc.target_date" class="text-white/50">
            Target: {{ formatDateSafe(focusedDoc.target_completion_date || focusedDoc.target_date) }}
          </span>
        </div>
      </div>

      <!-- Neutral Banner when no active focus is set -->
      <div
        v-else-if="custodyDocs.length > 0"
        class="flex items-center justify-between gap-3 rounded-none border border-white/10 bg-white/5 p-3 text-xs"
      >
        <div class="flex items-center gap-2 text-white/70">
          <Icon name="ph:info-light" class="h-4 w-4 text-candy-orange" />
          <span>No active delivery target focused.</span>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-none border border-candy-orange bg-candy-orange/10 px-3 py-1.5 text-[14px] font-bold text-candy-orange hover:bg-candy-orange hover:text-black transition active:scale-[0.98]"
          @click="showPickerModal = true"
        >
          <Icon name="ph:crosshair-bold" class="h-3.5 w-3.5" />
          🎯 Select Focus Document
        </button>
      </div>
    </div>

    <!-- ── Mode label ───────────────────────────────────────────────────── -->
    <div class="px-4 pb-3 text-center">
      <p class="text-xs text-white/50">
        <span v-if="mode === 'pickup'">
          Scan the document QR code or dispatch checkpoint of
          <strong v-if="focusedDoc?.origin_office_name" class="text-cyan-400 underline decoration-cyan-400">
            {{ focusedDoc.origin_office_name }}
          </strong>
          <strong v-else class="text-cyan-400">the origin dispatch desk</strong>
        </span>
        <span v-else>
          Scan the QR code posted on the office wall of
          <strong v-if="focusedDoc?.destination_office_name" class="text-emerald-400 underline decoration-emerald-400">
            {{ focusedDoc.destination_office_name }}
          </strong>
          <strong v-else class="text-emerald-400">the destination office wall</strong>
        </span>
      </p>
    </div>

    <!-- ── Camera scanner ───────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col items-center justify-start px-4 pt-2 pb-4">
      <QrScanner
        :key="scannerKey"
        :scanner-id="`fv-scanner-${scannerKey}`"
        :fps="12"
        :qrbox-size="220"
        :theme-color="mode === 'pickup' ? 'amber' : 'emerald'"
        @scan="handleScan"
        @error="handleCameraError"
      />

      <!-- ── Result card ─────────────────────────────────────────────────── -->
      <Transition name="result-pop">
        <div
          v-if="scanState !== 'idle'"
          class="mt-5 w-full max-w-[360px] overflow-hidden rounded-none border bg-black backdrop-blur-xl "
          :class="resultCardClass"
        >
          <!-- Processing -->
          <div v-if="scanState === 'processing'" class="flex items-center gap-3 p-5">
            <Icon name="ph:spinner-gap-light" class="h-6 w-6 animate-spin text-amber-400 flex-shrink-0" />
            <div>
              <p class="text-sm font-bold text-white">Processing scan…</p>
              <p class="text-xs text-white/60 mt-0.5">Contacting server</p>
            </div>
          </div>

          <!-- SUCCESS ── Pickup -->
          <div v-else-if="scanState === 'success' && mode === 'pickup'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-transparent">
                <Icon name="ph:check-circle-light" class="h-6 w-6 text-cyan-400" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-cyan-400">
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
                  <Icon name="ph:map-pin-light" class="inline h-3 w-3 text-cyan-400 mr-1" />
                  Heading to <strong class="text-white/80">{{ resultData.destination.office_name }}</strong>
                  <span class="ml-1 text-cyan-400">(Step {{ resultData.destination.step }})</span>
                </p>
                <div
                  v-if="resultData?.document"
                  class="mt-2.5 inline-flex items-center gap-1.5 rounded-none bg-transparent border border-cyan-500 px-3 py-1.5 text-[13px] font-bold uppercase tracking-wider text-cyan-400"
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
                :class="resultData?.is_final_stop ? 'bg-transparent' : 'bg-transparent'"
              >
                <Icon
                  :name="resultData?.is_final_stop ? 'ph:check-circle-fill' : 'ph:buildings-fill'"
                  class="h-6 w-6"
                  :class="resultData?.is_final_stop ? 'text-emerald-400' : 'text-emerald-400'"
                />
              </span>
              <div class="min-w-0 flex-1">
                <p
                  class="text-xs font-bold uppercase tracking-widest"
                  :class="resultData?.is_final_stop ? 'text-emerald-400' : 'text-emerald-400'"
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
                  class="mt-2.5 inline-flex items-center gap-1.5 rounded-none px-3 py-1.5 text-[13px] font-bold uppercase tracking-wider border"
                  :class="resultData?.is_final_stop
                    ? 'bg-transparent border-emerald-500 text-emerald-400'
                    : 'bg-transparent border-emerald-500 text-emerald-400'"
                >
                  <Icon :name="resultData?.is_final_stop ? 'ph:check-circle-fill' : 'ph:buildings-fill'" class="h-3.5 w-3.5" />
                  {{ resultData?.is_final_stop ? 'AWAITING REVIEW' : 'ARRIVED' }}
                </div>
              </div>
            </div>
          </div>

          <!-- IN_TRANSIT IN PICKUP MODE PROMPT -->
          <div v-else-if="scanState === 'in-transit-prompt'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-emerald-500/10 border border-emerald-500/30">
                <Icon name="ph:motorcycle-light" class="h-6 w-6 text-emerald-400" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-emerald-400">Already in Transit</p>
                <p class="mt-1 text-sm font-bold text-white">Document In Transit</p>
                <p class="mt-1 text-xs leading-relaxed text-white/80">
                  This document is already in transit. Would you like to switch to Drop-off mode?
                </p>
              </div>
            </div>

            <!-- Instant Switch Button -->
            <div class="mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                class="w-full flex items-center justify-center gap-2 rounded-none bg-emerald-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-emerald-400 active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                @click="switchMode('dropoff')"
              >
                <Icon name="ph:buildings-light" class="h-4 w-4" />
                Switch to Drop-off Mode
              </button>
            </div>
          </div>

          <!-- SECURITY ERROR -->
          <div v-else-if="scanState === 'security-error'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-transparent">
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
            <div class="mt-3 rounded-none bg-transparent border border-red-500 px-4 py-3 text-[14px] font-mono text-red-400 break-all">
              {{ errorMessage }}
            </div>
          </div>

          <!-- ROUTE MISMATCH ERROR -->
          <div v-else-if="scanState === 'route-error'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-transparent">
                <Icon name="ph:warning-light" class="h-6 w-6 text-amber-400" />
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
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-transparent">
                <Icon name="ph:question-light" class="h-6 w-6 text-gray-400" />
              </span>
              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-widest text-gray-400">Unrecognised QR</p>
                <p class="mt-1 text-xs text-white/60">This QR code is not a FlowVision document or office checkpoint.</p>
                <p class="mt-1 break-all font-mono text-[13px] text-gray-500">{{ rawScan }}</p>
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
              <Icon name="ph:scan-light" class="h-4 w-4 text-amber-400" />
              Scan Next
            </button>
          </div>
        </div>
      </Transition>

      <!-- ── Instruction chip when idle ──────────────────────────────────── -->
      <div
        v-if="scanState === 'idle'"
        class="mt-4 flex items-center gap-2 rounded-none border px-4 py-2.5 text-xs"
        :class="mode === 'pickup'
          ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
          : 'border-emerald-500 bg-emerald-950/40 text-emerald-300'"
      >
        <Icon name="ph:qr-code-light" class="h-4 w-4 flex-shrink-0" :class="mode === 'pickup' ? 'text-cyan-400' : 'text-emerald-400'" />
        <span>
          <strong v-if="mode === 'pickup'">Point camera at document QR or dispatch badge</strong>
          <strong v-else>Point camera at destination office wall QR</strong>
        </span>
      </div>
    </div>

    <!-- ── 🎯 IN-SCANNER FOCUS PICKER MODAL ─────────────────────────────── -->
    <Teleport to="body">
      <Transition name="picker-fade">
        <div
          v-if="showPickerModal"
          class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm"
          @click.self="showPickerModal = false"
        >
          <div
            class="w-full max-w-lg rounded-none border border-white/10 bg-onyx-card shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            :class="isDark ? 'bg-onyx-card' : 'bg-gray-900'"
          >
            <!-- Modal Header -->
            <div class="flex items-center justify-between border-b border-white/10 p-4">
              <div class="flex items-center gap-2">
                <span class="flex h-6 w-6 items-center justify-center bg-candy-orange text-black font-black text-xs">
                  🎯
                </span>
                <h3 class="text-sm font-bold text-white">Select Active Delivery Target</h3>
              </div>
              <button
                type="button"
                class="rounded-none p-1 text-white/60 hover:text-white transition"
                @click="showPickerModal = false"
              >
                <Icon name="ph:x-bold" class="h-4 w-4" />
              </button>
            </div>

            <!-- Modal List -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div
                v-for="doc in custodyDocs"
                :key="doc.id"
                class="flex items-center justify-between gap-3 p-3 border rounded-none cursor-pointer transition"
                :class="messengerStore.isFocused(doc.id)
                  ? 'border-candy-orange bg-candy-orange/15 shadow-inner'
                  : 'border-white/10 bg-black/40 hover:border-candy-orange/40'"
                @click="selectFocus(doc)"
              >
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex items-center gap-2">
                    <span
                      class="px-1.5 py-0.5 text-[12px] font-bold uppercase"
                      :class="doc.tracking_status === 'IN_TRANSIT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'"
                    >
                      {{ doc.tracking_status === 'IN_TRANSIT' ? 'Drop-off Needed' : 'Pickup Needed' }}
                    </span>
                    <span
                      class="px-1.5 py-0.5 text-[12px] font-bold uppercase border"
                      :class="getPriorityBadgeClass(doc.priority)"
                    >
                      {{ doc.priority || 'Medium' }}
                    </span>
                  </div>
                  <p class="text-xs font-bold text-white truncate">{{ doc.title }}</p>
                  <p class="text-[13px] text-white/70 font-semibold truncate">
                    <span v-if="doc.tracking_status === 'IN_TRANSIT'">
                      Target Destination: <strong class="text-emerald-400">{{ doc.destination_office_name || '—' }}</strong>
                    </span>
                    <span v-else>
                      Origin Station: <strong class="text-cyan-400">{{ doc.origin_office_name || '—' }}</strong>
                    </span>
                  </p>
                </div>

                <div class="flex items-center flex-shrink-0">
                  <span
                    v-if="messengerStore.isFocused(doc.id)"
                    class="rounded-none bg-candy-orange px-2 py-1 text-[13px] font-bold text-black"
                  >
                    Active
                  </span>
                  <span
                    v-else
                    class="rounded-none border border-candy-orange/50 px-2 py-1 text-[13px] font-bold text-candy-orange"
                  >
                    Select
                  </span>
                </div>
              </div>

              <div v-if="!custodyDocs.length" class="p-6 text-center text-xs text-white/50">
                No documents in custody.
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="flex items-center justify-between border-t border-white/10 p-3 bg-black/50">
              <button
                type="button"
                class="text-xs text-white/60 hover:text-white transition underline"
                @click="messengerStore.clearFocus(); showPickerModal = false"
              >
                Clear Focus Target
              </button>
              <button
                type="button"
                class="rounded-none bg-white/10 px-4 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
                @click="showPickerModal = false"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useMessengerStore, resolveDocumentScanMode, type ScanMode } from '~/stores/messenger'
import QrScanner from '~/components/messenger/QrScanner.vue'
import type { CustodyDocument } from '~/composables/useMessengerFocus'
import {
  buildDocumentTrackQrPayload,
  extractCheckpointOfficeId,
  extractDocumentTrackId,
  extractDeskId,
  parseFlowVisionQr,
} from '~/utils/parseFlowVisionQr'

definePageMeta({ layout: 'messenger' })

const auth = useAuthStore()
const { isDark } = useTheme()
const route = useRoute()
const messengerStore = useMessengerStore()

// ── State ──────────────────────────────────────────────────────────────
type ScanState =
  | 'idle'
  | 'processing'
  | 'success'
  | 'error'
  | 'security-error'
  | 'route-error'
  | 'in-transit-prompt'
  | 'unknown'

const queryDocId = computed(() => String(route.query.docId || route.query.document_id || '').trim())
const queryMode = computed(() => (route.query.mode === 'dropoff' || route.query.mode === 'pickup' ? (route.query.mode as ScanMode) : null))

// Auto-configure initial scan mode from query or messenger store
const initialMode: ScanMode = queryMode.value || messengerStore.focusedScanMode || 'pickup'
const mode = ref<ScanMode>(initialMode)

const scanState = ref<ScanState>('idle')
const rawScan = ref<string | null>(null)
const resultData = ref<any>(null)
const errorMessage = ref('')
const scannerKey = ref(0)
const custodyDocs = ref<CustodyDocument[]>([])
const showPickerModal = ref(false)

const focusedDoc = computed(() => {
  if (!custodyDocs.value.length || !messengerStore.focusedDocumentId) return null
  return custodyDocs.value.find((d) => d.id === messengerStore.focusedDocumentId) ?? null
})

function getPriorityBadgeClass(priority?: string | null) {
  const p = (priority || '').toLowerCase().trim()
  if (p === 'urgent' || p === 'high') {
    return 'border-rose-500/40 bg-rose-500/20 text-rose-400'
  }
  if (p === 'low') {
    return 'border-zinc-500/40 bg-zinc-500/20 text-zinc-400'
  }
  return 'border-amber-500/40 bg-amber-500/20 text-amber-400'
}

function formatDateSafe(val?: string | null): string {
  if (!val) return ''
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return String(val)
  }
}

function selectFocus(doc: CustodyDocument) {
  messengerStore.setFocus(doc.id, doc)
  const autoMode = resolveDocumentScanMode(doc)
  mode.value = autoMode
  showPickerModal.value = false
}

async function loadCustody() {
  try {
    const res = await $fetch<{
      success: boolean
      data?: { in_transit: CustodyDocument[]; awaiting_scan: CustodyDocument[]; assigned_pending_pickup: CustodyDocument[] }
    }>('/api/tracking/custody', { credentials: 'include' })
    const inTransit = Array.isArray(res?.data?.in_transit) ? res.data.in_transit : []
    const awaitingScan = Array.isArray(res?.data?.awaiting_scan) ? res.data.awaiting_scan : []
    const assignedPendingPickup = Array.isArray(res?.data?.assigned_pending_pickup) ? res.data.assigned_pending_pickup : []
    custodyDocs.value = [...inTransit, ...awaitingScan, ...assignedPendingPickup]

    // Context-Aware Auto-Mode Lock:
    if (queryDocId.value) {
      const match = custodyDocs.value.find((d) => d.id === queryDocId.value)
      if (match) {
        messengerStore.setFocus(match.id, match)
        if (!queryMode.value) {
          mode.value = resolveDocumentScanMode(match)
        }
      }
    } else if (messengerStore.focusedDocumentId) {
      const match = custodyDocs.value.find((d) => d.id === messengerStore.focusedDocumentId)
      if (match) {
        messengerStore.setFocus(match.id, match)
        if (!queryMode.value) {
          mode.value = resolveDocumentScanMode(match)
        }
      }
    }
  } catch {
    custodyDocs.value = []
  }
}

onMounted(() => {
  loadCustody()
})

// ── Computed ───────────────────────────────────────────────────────────
const resultCardClass = computed(() => {
  switch (scanState.value) {
    case 'in-transit-prompt': return 'border-amber-500 bg-black shadow-amber-500/10'
    case 'security-error': return 'border-red-500 bg-red-950/80 shadow-red-500/10'
    case 'route-error': return 'border-amber-500 bg-amber-950/80 shadow-amber-500/10'
    case 'error': return 'border-red-400/20 bg-black'
    case 'success': return 'border-emerald-500 bg-black shadow-emerald-500/10'
    case 'unknown': return 'border-white/10 bg-black'
    default: return 'border-amber-500 bg-black'
  }
})

// ── Scan actions ───────────────────────────────────────────────────────
const handleDocumentPickup = async (qrCodeData: string) => {
  const res = await $fetch<any>('/api/tracking/pickup', {
    method: 'POST',
    body: { qr_code_data: qrCodeData },
  })
  resultData.value = res.data
  scanState.value = 'success'
  await loadCustody()
}

const handleCheckpointPickup = async (officeId: string) => {
  const res = await $fetch<any>('/api/tracking/checkpoint-pickup', {
    method: 'POST',
    body: { office_id: officeId },
  })
  resultData.value = res.data
  scanState.value = 'success'
  await loadCustody()
}

const handleDocumentDropOff = async (officeId: string) => {
  const res = await $fetch<any>('/api/tracking/dropoff', {
    method: 'POST',
    body: { office_id: officeId },
  })
  resultData.value = res
  scanState.value = 'success'
  await loadCustody()
  // If the dropped-off document was the focused target, check if still in transit
  if (messengerStore.focusedDocumentId) {
    const stillInTransit = custodyDocs.value.some((d) => d.id === messengerStore.focusedDocumentId && d.tracking_status === 'IN_TRANSIT')
    if (!stillInTransit) {
      messengerStore.clearFocus()
    }
  }
}

// Same handshake as an office QR drop-off, but the Liaison scanned a specific
// desk inside the destination office — the server resolves desk → office and
// additionally records current_desk_id/current_handler_id.
const handleDeskDelivery = async (deskId: string) => {
  const res = await $fetch<any>('/api/tracking/dropoff', {
    method: 'POST',
    body: { desk_id: deskId },
  })
  resultData.value = res
  scanState.value = 'success'
  await loadCustody()
  if (messengerStore.focusedDocumentId) {
    const stillInTransit = custodyDocs.value.some((d) => d.id === messengerStore.focusedDocumentId && d.tracking_status === 'IN_TRANSIT')
    if (!stillInTransit) {
      messengerStore.clearFocus()
    }
  }
}

const applyScanError = (err: any) => {
  const msg = err?.data?.message ?? err?.message ?? 'An unexpected error occurred.'
  const code = err?.data?.data?.code ?? ''
  const trackingStatus = err?.data?.data?.tracking_status ?? ''

  if (
    mode.value === 'pickup' &&
    (trackingStatus === 'IN_TRANSIT' ||
      code === 'ALREADY_IN_TRANSIT' ||
      (msg.includes('IN_TRANSIT') && (msg.includes('INVALID_STATUS') || msg.includes('Cannot pick up'))))
  ) {
    scanState.value = 'in-transit-prompt'
    errorMessage.value = msg
  } else if (code === 'SECURITY_ORG_MISMATCH' || msg.includes('SECURITY_ORG_MISMATCH')) {
    scanState.value = 'security-error'
    errorMessage.value = msg
  } else if (code === 'ROUTE_MISMATCH' || msg.includes('ROUTE_MISMATCH')) {
    scanState.value = 'route-error'
    errorMessage.value = msg.replace('ROUTE_MISMATCH: ', '')
  } else {
    scanState.value = 'error'
    errorMessage.value = msg
  }
}

// ── Scan handler ───────────────────────────────────────────────────────
const handleScan = async (raw: string) => {
  rawScan.value = raw
  scanState.value = 'processing'
  resultData.value = null
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

    if (scannedText.startsWith('flowvision://desk')) {
      const deskId = extractDeskId(scannedText)
      if (!deskId) {
        errorMessage.value = 'Invalid FlowVision QR format. Please scan a valid desk QR code.'
        scanState.value = 'error'
        return
      }

      if (mode.value !== 'dropoff') {
        errorMessage.value = 'You scanned a desk QR. Switch to Drop-off mode to deliver a document there.'
        scanState.value = 'error'
        return
      }

      await handleDeskDelivery(deskId)
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
  scanState.value = 'idle'
  rawScan.value = null
  resultData.value = null
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

.picker-fade-enter-active, .picker-fade-leave-active { transition: opacity 0.2s ease; }
.picker-fade-enter-from, .picker-fade-leave-to { opacity: 0; }
</style>
