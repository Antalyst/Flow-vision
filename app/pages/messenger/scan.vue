<template>
  <div class="min-h-screen flex flex-col" :class="isDark ? 'bg-onyx-black' : 'bg-gray-950'">

    <!-- ── Top bar ──────────────────────────────────────────────────────── -->
    <!-- Stacks on phone widths (back link + title on one row, the mode
         toggle full-width below) so the toggle never has to squeeze into
         the same row as the title and back link — that overlapped at
         common phone widths (~390px) before this fix. -->
    <header class="flex flex-col gap-3 px-4 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center justify-between sm:contents">
        <NuxtLink
          to="/messenger/deliveries"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="ph:arrow-left-light" class="h-4 w-4" />
          Deliveries
        </NuxtLink>

        <h1 class="text-sm font-bold text-white">Scan</h1>
      </div>

      <!-- Mode toggle pill -->
      <div class="flex rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs font-bold transition-colors"
          :class="mode === 'pickup'
            ? 'bg-candy-orange text-white shadow-sm'
            : 'text-white/50 hover:text-white/80'"
          @click="switchMode('pickup')"
        >
          <Icon name="ph:hand-bold" class="h-3.5 w-3.5" />
          Pickup
        </button>
        <button
          type="button"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs font-bold transition-colors"
          :class="mode === 'dropoff'
            ? 'bg-candy-orange text-white shadow-sm'
            : 'text-white/50 hover:text-white/80'"
          @click="switchMode('dropoff')"
        >
          <Icon name="ph:buildings-bold" class="h-3.5 w-3.5" />
          Drop-off
        </button>
      </div>
    </header>

    <!-- ── Focused document banner ─────────────────────────────────────── -->
    <div class="mx-4 mb-3">
      <!-- Active focus card -->
      <div
        v-if="focusedDoc"
        class="rounded-2xl border border-candy-orange/30 bg-onyx-card p-4 shadow-sm"
      >
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-candy-orange/10">
            <Icon name="ph:crosshair-bold" class="h-5 w-5 text-candy-orange" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-[11px] font-bold uppercase tracking-widest text-candy-orange">
              {{ mode === 'pickup' ? 'Picking up' : 'Dropping off' }}
            </p>
            <p class="mt-0.5 truncate text-sm font-bold text-white">{{ focusedDoc.title }}</p>
            <p class="mt-1 flex items-center gap-1.5 text-xs text-white/60">
              <Icon name="ph:map-pin-light" class="h-3.5 w-3.5 flex-shrink-0" />
              <span class="truncate">
                {{ mode === 'pickup'
                  ? (focusedDoc.origin_office_name || 'Pickup location not set')
                  : (focusedDoc.destination_office_name || 'Drop-off location not set') }}
              </span>
            </p>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/5 px-3 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/10"
            @click="showPickerModal = true"
          >
            <Icon name="ph:arrows-down-up-light" class="h-3.5 w-3.5" />
            Switch
          </button>
          <button
            type="button"
            class="rounded-xl px-3 py-2.5 text-xs font-semibold text-white/50 transition hover:bg-white/10 hover:text-white"
            title="Clear active focus"
            @click="messengerStore.clearFocus()"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Neutral banner when no active focus is set -->
      <div
        v-else-if="custodyDocs.length > 0"
        class="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-onyx-card p-3.5 text-xs"
      >
        <div class="flex items-center gap-2 text-white/70">
          <Icon name="ph:info-light" class="h-4 w-4 flex-shrink-0 text-candy-orange" />
          <span>Select Document</span>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-candy-orange bg-candy-orange/10 px-3 py-2 text-xs font-bold text-candy-orange transition hover:bg-candy-orange hover:text-white active:scale-[0.98]"
          @click="showPickerModal = true"
        >
          <Icon name="ph:crosshair-bold" class="h-3.5 w-3.5" />
          Choose a document
        </button>
      </div>
    </div>

    <!-- ── Mode label ───────────────────────────────────────────────────── -->
    <div class="px-4 pb-3 text-center">
      <p class="text-xs text-white/50">
        <span v-if="mode === 'pickup'">
          Scan the document QR or checkpoint QR at
          <strong v-if="focusedDoc?.origin_office_name" class="text-candy-orange">
            {{ focusedDoc.origin_office_name }}
          </strong>
          <strong v-else class="text-candy-orange">the pickup location</strong>
        </span>
        <span v-else>
          Scan the QR code on the office wall at
          <strong v-if="focusedDoc?.destination_office_name" class="text-candy-orange">
            {{ focusedDoc.destination_office_name }}
          </strong>
          <strong v-else class="text-candy-orange">the drop-off location</strong>
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
        theme-color="orange"
        @scan="handleScan"
        @error="handleCameraError"
      />

      <!-- ── Result card ─────────────────────────────────────────────────── -->
      <Transition name="result-pop">
        <div
          v-if="scanState !== 'idle'"
          class="mt-5 w-full max-w-[360px] overflow-hidden rounded-2xl border bg-onyx-card shadow-sm"
          :class="resultCardClass"
        >
          <!-- Processing -->
          <div v-if="scanState === 'processing'" class="flex items-center gap-3 p-5">
            <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-candy-orange/10">
              <Icon name="ph:spinner-gap-light" class="h-5 w-5 animate-spin text-candy-orange" />
            </span>
            <div>
              <p class="text-sm font-bold text-white">Processing scan…</p>
              <p class="text-xs text-white/60 mt-0.5">Contacting server</p>
            </div>
          </div>

          <!-- SUCCESS ── Pickup -->
          <div v-else-if="scanState === 'success' && resultMode === 'pickup'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-success/10">
                <Icon name="ph:check-circle-light" class="h-5 w-5 text-success" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-success">
                  {{ resultData?.checkpoint_only ? 'Origin Checkpoint' : 'Pickup Confirmed' }}
                </p>
                <p v-if="resultData?.office?.name" class="mt-1 text-xs text-white/60">
                  Location: <strong class="text-white/80">{{ resultData.office.name }}</strong>
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
                </p>
                <div
                  v-if="resultData?.document"
                  class="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-candy-orange px-3 py-1.5 text-[13px] font-bold uppercase tracking-wider text-candy-orange"
                >
                  <Icon name="ph:motorcycle-light" class="h-3.5 w-3.5" />
                  In Transit
                </div>
                <p v-if="resultData?.document" class="mt-3 text-xs leading-relaxed text-white/70">
                  Not delivered yet. At
                  <strong class="text-white/90">{{ resultData?.destination?.office_name || 'the destination office' }}</strong>,
                  switch to <strong class="text-white/90">Drop-off</strong> and scan the office's QR code to deliver it.
                </p>
              </div>
            </div>
          </div>

          <!-- SUCCESS ── Dropoff -->
          <div v-else-if="scanState === 'success' && resultMode === 'dropoff'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-success/10">
                <Icon
                  :name="resultData?.is_final_stop ? 'ph:check-circle-fill' : 'ph:buildings-fill'"
                  class="h-5 w-5 text-success"
                />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-success">
                  {{ resultData?.is_final_stop ? 'Arrived at Final Stop' : 'Arrived at Office' }}
                </p>
                <p class="mt-1 text-sm font-bold text-white truncate">{{ resultData?.data?.office?.name }}</p>
                <p class="mt-1 text-xs text-white/60">
                  <span v-if="resultData?.is_final_stop">Arrived at final stop. Awaiting employee desk review.</span>
                  <span v-else>Checked in. Awaiting employee desk review before next pickup.</span>
                </p>
                <div
                  class="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-success px-3 py-1.5 text-[13px] font-bold uppercase tracking-wider text-success"
                >
                  <Icon :name="resultData?.is_final_stop ? 'ph:check-circle-fill' : 'ph:buildings-fill'" class="h-3.5 w-3.5" />
                  {{ resultData?.is_final_stop ? 'Awaiting Review' : 'Arrived' }}
                </div>
              </div>
            </div>
          </div>

          <!-- IN_TRANSIT IN PICKUP MODE PROMPT -->
          <div v-else-if="scanState === 'in-transit-prompt'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-warning/10">
                <Icon name="ph:motorcycle-light" class="h-5 w-5 text-warning" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-warning">Already in Transit</p>
                <p class="mt-1 text-sm font-bold text-white">This document is already on its way</p>
                <p class="mt-1 text-xs leading-relaxed text-white/80">
                  Switch to Drop-off mode to check it in.
                </p>
              </div>
            </div>

            <!-- Instant Switch Button -->
            <div class="mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                class="w-full flex items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-3.5 text-xs font-bold text-white transition hover:bg-candy-hover active:scale-[0.98]"
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
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-danger/10">
                <Icon name="ph:shield-warning-light" class="h-5 w-5 text-danger" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-danger">Security Violation</p>
                <p class="mt-1 text-sm font-bold text-white">Different Organization</p>
                <p class="mt-1 text-xs leading-relaxed text-white/60">
                  This document belongs to a different organization and can't be scanned here.
                </p>
              </div>
            </div>
            <div class="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger break-all">
              {{ errorMessage }}
            </div>
          </div>

          <!-- ROUTE MISMATCH ERROR -->
          <div v-else-if="scanState === 'route-error'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-warning/10">
                <Icon name="ph:warning-light" class="h-5 w-5 text-warning" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-widest text-warning">Wrong Checkpoint</p>
                <p class="mt-1 text-sm font-bold text-white">Route Mismatch</p>
                <p class="mt-1 text-xs leading-relaxed text-white/60">{{ errorMessage }}</p>
              </div>
            </div>
          </div>

          <!-- GENERIC ERROR -->
          <div v-else-if="scanState === 'error'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-danger/10">
                <Icon name="ph:x-circle-light" class="h-5 w-5 text-danger" />
              </span>
              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-widest text-danger">Scan Failed</p>
                <p class="mt-1 text-xs leading-relaxed text-white/60">{{ errorMessage }}</p>
              </div>
            </div>
          </div>

          <!-- UNKNOWN QR -->
          <div v-else-if="scanState === 'unknown'" class="p-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/5">
                <Icon name="ph:question-light" class="h-5 w-5 text-gray-400" />
              </span>
              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-widest text-gray-400">QR Not Recognized</p>
                <p class="mt-1 text-xs text-white/60">This QR code isn't a FlowVision document or office checkpoint.</p>
              </div>
            </div>
          </div>

          <!-- Scan-again button (for all non-processing states) -->
          <div v-if="scanState !== 'processing'" class="border-t border-white/5 px-5 py-3">
            <button
              type="button"
              class="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3.5 text-xs font-bold text-white transition hover:bg-white/10 active:scale-[0.98]"
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
        class="mt-4 flex items-center gap-2 rounded-full border border-candy-orange/40 bg-candy-orange/10 px-4 py-2.5 text-xs text-candy-orange"
      >
        <Icon name="ph:qr-code-light" class="h-4 w-4 flex-shrink-0" />
        <span>
          <strong v-if="mode === 'pickup'">Point your camera at the QR</strong>
          <strong v-else>Point your camera at the office wall QR</strong>
        </span>
      </div>
    </div>

    <!-- ── Focus picker modal ───────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="picker-fade">
        <div
          v-if="showPickerModal"
          class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm"
          @click.self="showPickerModal = false"
        >
          <div
            class="w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            :class="isDark ? 'bg-onyx-card' : 'bg-gray-900'"
          >
            <!-- Modal Header -->
            <div class="flex items-center justify-between border-b border-white/10 p-4">
              <div class="flex items-center gap-2.5">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-candy-orange/15">
                  <Icon name="ph:crosshair-bold" class="h-4 w-4 text-candy-orange" />
                </span>
                <h3 class="text-sm font-bold text-white">Choose a document</h3>
              </div>
              <button
                type="button"
                class="rounded-lg p-1.5 text-white/60 hover:text-white transition"
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
                class="flex items-center justify-between gap-3 p-4 border rounded-xl cursor-pointer transition"
                :class="messengerStore.isFocused(doc.id)
                  ? 'border-candy-orange bg-candy-orange/10'
                  : 'border-white/10 bg-black/40 hover:border-candy-orange/40'"
                @click="selectFocus(doc)"
              >
                <div class="min-w-0 flex-1 space-y-1.5">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span
                      class="rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase"
                      :class="doc.tracking_status === 'IN_TRANSIT' ? 'border-candy-orange/30 bg-candy-orange/10 text-candy-orange' : 'border-white/10 bg-white/10 text-white/60'"
                    >
                      {{ doc.tracking_status === 'IN_TRANSIT' ? 'Drop-off Needed' : 'Pickup Needed' }}
                    </span>
                    <span
                      class="rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase"
                      :class="getPriorityBadgeClass(doc.priority)"
                    >
                      {{ doc.priority || 'Medium' }}
                    </span>
                  </div>
                  <p class="text-xs font-bold text-white truncate">{{ doc.title }}</p>
                  <p class="text-[13px] text-white/70 font-semibold truncate">
                    <span v-if="doc.tracking_status === 'IN_TRANSIT'">
                      Drop-off location: <strong class="text-candy-orange">{{ doc.destination_office_name || '—' }}</strong>
                    </span>
                    <span v-else>
                      Pickup location: <strong class="text-candy-orange">{{ doc.origin_office_name || '—' }}</strong>
                    </span>
                  </p>
                </div>

                <div class="flex items-center flex-shrink-0">
                  <span
                    v-if="messengerStore.isFocused(doc.id)"
                    class="rounded-full bg-candy-orange px-2.5 py-1 text-[12px] font-bold text-white"
                  >
                    Active
                  </span>
                  <span
                    v-else
                    class="rounded-full border border-candy-orange/50 px-2.5 py-1 text-[12px] font-bold text-candy-orange"
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
                Clear selection
              </button>
              <button
                type="button"
                class="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
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
// The mode the last scan was actually processed in. The result card must key
// off this, not `mode`: loadCustody() re-resolves `mode` right after a
// successful pickup (the doc is now IN_TRANSIT → 'dropoff'), which used to
// re-render a pickup result as "Arrived at Office" even though nothing had
// been delivered yet.
const resultMode = ref<ScanMode>(initialMode)
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

// Shopee-style palette: only urgent/high gets a highlight (genuine warning
// signal); everything else stays neutral gray — see redesign skill.
function getPriorityBadgeClass(priority?: string | null) {
  const p = (priority || '').toLowerCase().trim()
  if (p === 'urgent' || p === 'high') {
    return 'border-warning/40 bg-warning/10 text-warning'
  }
  return 'border-white/10 bg-white/5 text-white/60'
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
// Flat, semantic border colors only — gray = neutral, orange = active,
// success = done, danger = error, warning = genuine warning state. No
// colored glow shadows (see redesign skill).
const resultCardClass = computed(() => {
  switch (scanState.value) {
    case 'in-transit-prompt': return 'border-warning/40'
    case 'security-error': return 'border-danger/40'
    case 'route-error': return 'border-warning/40'
    case 'error': return 'border-danger/30'
    case 'success': return 'border-success/40'
    case 'unknown': return 'border-white/10'
    default: return 'border-candy-orange/40'
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
    resultMode.value === 'pickup' &&
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
  resultMode.value = mode.value
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
