<template>
  <Teleport to="body">
    <Transition name="preview-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
        @click="emit('close')"
      />
    </Transition>

    <Transition name="preview-slide">
      <aside
        v-if="isOpen && document"
        class="fixed bottom-0 right-0 top-0 z-[90] flex w-full flex-col border-l shadow-2xl transition-transform duration-300 backdrop-blur-2xl"
        :class="[
          isDark
            ? 'border-white/10 bg-[#111113]/90 text-white'
            : 'border-gray-200 bg-white/95 text-gray-900',
          widthClass,
        ]"
      >
        <!-- §1 Header & metadata overview -->
        <header
          class="stagger-block shrink-0 border-b px-8 py-6"
          :class="isDark ? 'border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent' : 'border-gray-100 bg-gradient-to-b from-gray-50/50 to-transparent'"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="mb-2 h-1 w-10 rounded-none bg-candy-orange" />
              <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">
                Document Details
              </p>
              <h2 class="mt-1 truncate text-xl font-bold">
                {{ document.title }}
              </h2>
            </div>
            <button
              type="button"
              class="inline-flex h-10 w-10 flex-none items-center justify-center rounded-none transition hover:bg-candy-orange/10 hover:text-candy-orange"
              aria-label="Close preview"
              @click="emit('close')"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-none border px-3 py-1 text-xs font-semibold"
              :class="trackingBadgeClass(displayTrackingStatus)"
            >
              <span
                class="h-1.5 w-1.5 rounded-none bg-current"
                :class="displayTrackingStatus === 'IN_TRANSIT' ? 'animate-pulse' : ''"
              />
              {{ trackingLabel(displayTrackingStatus) }}
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-none border px-3 py-1 text-xs font-semibold"
              :class="priorityBadgeClass"
            >
              {{ displayPriority }} Priority
            </span>
            <span
              v-if="creatorName"
              class="inline-flex items-center gap-1.5 rounded-none border px-3 py-1 text-xs font-semibold"
              :class="isDark ? 'border-white/10 bg-white/5 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'"
            >
              <Icon name="ph:user-circle-fill" class="h-3.5 w-3.5 text-candy-orange" />
              {{ creatorName }}
            </span>
          </div>

          <p class="mt-3 font-mono text-[11px]" :class="mutedClass">
            Reference ID: {{ document.id }}
          </p>
        </header>

        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div class="flex-1 space-y-8 overflow-y-auto px-8 py-8">
            <!-- Compact metadata -->
            <div class="stagger-block grid grid-cols-2 gap-4">
              <div class="col-span-2 rounded-none border p-4" :class="cellClass">
                <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">Description</p>
                <p class="mt-2 text-sm leading-relaxed" :class="mutedClass">
                  {{ document.description?.trim() || 'No description provided.' }}
                </p>
              </div>
              <div class="rounded-none border p-3" :class="cellClass">
                <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">Created</p>
                <p class="mt-1 text-sm font-semibold">{{ formatDate(document.created_at) }}</p>
              </div>
              <div class="rounded-none border p-3" :class="cellClass">
                <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">Workflow</p>
                <p class="mt-1 text-sm font-semibold">{{ stageName || 'Unassigned' }}</p>
              </div>
              <div class="col-span-2 rounded-none border p-3" :class="cellClass">
                <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">Destination</p>
                <p class="mt-1 text-sm font-semibold">{{ targetOfficeLabel }}</p>
              </div>
            </div>

            <!-- §2 Fulfillment pipeline timeline -->
            <section class="stagger-block">
              <div class="mb-5 flex items-center gap-2 text-sm font-semibold text-candy-orange">
                <Icon name="ph:path" class="h-4 w-4" />
                Routing Timeline
              </div>

              <div v-if="steps.length" class="mb-8">
                <div class="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-candy-orange/90">
                  <span>Progress</span>
                  <span>{{ pipelineProgressPct }}%</span>
                </div>
                <div
                  class="h-1.5 w-full overflow-hidden rounded-none shadow-inner"
                  :class="isDark ? 'bg-white/10' : 'bg-gray-200'"
                >
                  <div
                    class="h-full rounded-none bg-candy-orange transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(244,125,47,0.5)]"
                    :style="{ width: `${pipelineProgressPct}%` }"
                  />
                </div>
              </div>

              <div v-if="steps.length" class="relative space-y-3">
                <button
                  v-for="(step, index) in steps"
                  :key="`${step.office_id}-${index}`"
                  type="button"
                  class="group relative flex w-full cursor-pointer select-none items-center gap-4 rounded-none border p-3.5 text-left transition-all duration-300"
                  :class="[
                    isPipelineOfficeSelected(step) ? 'border-candy-orange bg-candy-orange/10 shadow-[0_0_20px_rgba(244,125,47,0.15)]' : (isDark ? 'border-onyx-border bg-white/[0.02] hover:bg-white/5 hover:border-white/10' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'),
                    isStepDone(step) ? 'opacity-80' : ''
                  ]"
                  :disabled="!pipelineMessagingEnabled"
                  @click="selectPipelineOffice(step)"
                >

                  <div
                    class="relative z-10 flex h-10 w-10 flex-none items-center justify-center rounded-none text-sm font-bold shadow-lg transition-all duration-300"
                    :class="[
                      isStepDone(step) ? 'bg-candy-orange text-white shadow-candy-orange/30' : 
                      isStepCurrent(step) ? 'border-2 border-candy-orange bg-onyx-black text-candy-orange shadow-[0_0_15px_rgba(244,125,47,0.4)]' : 
                      (isDark ? 'bg-white/5 text-gray-500' : 'bg-white text-gray-400 border border-gray-200'),
                      isPipelineOfficeSelected(step) ? 'scale-110' : ''
                    ]"
                  >
                    <Icon v-if="isStepDone(step)" name="ph:check-bold" class="h-4 w-4" />
                    <span v-else>{{ step.step_number }}</span>
                  </div>
                  
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm font-bold truncate" :class="isStepUpcoming(step) ? mutedClass : (isDark ? 'text-white' : 'text-gray-900')">
                        {{ step.office_name }}
                      </p>
                      <Icon
                        v-if="pipelineMessagingEnabled"
                        name="ph:chat-teardrop-dots-fill"
                        class="h-4 w-4 text-candy-orange opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        :class="isPipelineOfficeSelected(step) ? 'opacity-100' : ''"
                      />
                    </div>
                    <p class="mt-0.5 text-[11px] font-bold uppercase tracking-widest" :class="stepLabelClass(step)">
                      {{ stepStateLabel(step) }}
                    </p>
                  </div>
                </button>
              </div>

              <DocumentPipelineOfficeChat
                v-if="selectedPipelineOffice && pipelineMessagingEnabled && document"
                :document="document"
                :office="selectedPipelineOffice"
                :offices="messagingOffices"
                @close="selectedPipelineOffice = null"
                @updated="emit('compliance-updated', $event)"
              />

              <div
                v-if="!steps.length"
                class="rounded-none border border-dashed p-8 text-center text-sm"
                :class="isDark ? 'border-onyx-border text-gray-400' : 'border-gray-200 text-gray-500'"
              >
                <Icon name="ph:route" class="h-8 w-8 mx-auto mb-3 opacity-30" />
                No workflow stages mapped to this document.
              </div>
            </section>

            <!-- §2b Live file preview (MySQL BLOB) -->
            <DocumentLiveFilePreview
              class="stagger-block"
              :document-id="document.id"
              :active="isOpen"
            />

            <!-- Office checkpoint review (intermediate + final) -->
            <section
              v-if="showCompletionActions && canMarkCheckpointDone"
              class="stagger-block rounded-none border p-5 shadow-sm backdrop-blur-md transition-all hover:shadow-md"
              :class="isFinalCheckpoint
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-candy-orange/30 bg-candy-orange/5'"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    class="text-[10px] font-bold uppercase tracking-widest"
                    :class="isFinalCheckpoint ? 'text-emerald-500' : 'text-candy-orange'"
                  >
                    {{ isFinalCheckpoint ? 'Final Checkpoint' : 'Office Desk Review' }}
                  </p>
                  <p class="mt-1 text-sm" :class="mutedClass">
                    <template v-if="isFinalCheckpoint">
                      Verify the hard copy at this final stop, then mark done to complete delivery and notify the document owner.
                    </template>
                    <template v-else>
                      After checking the folder, mark done to notify the document owner and release a new messenger pickup for the next route leg.
                    </template>
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-none px-5 py-3 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
                  :class="isFinalCheckpoint ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 hover:shadow-emerald-500/20' : 'bg-gradient-to-r from-candy-orange to-[#ff6b00] hover:shadow-candy-orange/20'"
                  :disabled="completingCheckpoint"
                  @click="handleApproveCheckpoint"
                >
                  <Icon v-if="completingCheckpoint" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
                  <Icon v-else name="ph:check-circle-fill" class="h-4 w-4" />
                  {{ isFinalCheckpoint ? 'Approve & Complete' : 'Mark Reviewed & Release Pickup' }}
                </button>
              </div>
            </section>

            <!-- Compliance flag action -->
            <section
              v-if="showComplianceActions"
              class="stagger-block rounded-none border border-candy-orange/30 bg-candy-orange/5 p-5 shadow-sm shadow-candy-orange/5"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">
                    Compliance Review
                  </p>
                  <p class="mt-1 text-sm" :class="mutedClass">
                    Flag incomplete hard copies and message the responsible office desk.
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-none bg-gradient-to-r from-candy-orange to-[#ff6b00] px-5 py-3 text-sm font-bold text-white-pure shadow-sm shadow-candy-orange/20 transition-all hover:-translate-y-0.5 hover:shadow-candy-orange/30 active:translate-y-0"
                  @click="emit('flag-issue')"
                >
                  <Icon name="ph:warning-fill" class="h-4 w-4" />
                  Flag Issue / Incomplete
                </button>
              </div>
            </section>

            <slot name="extra" />

            <!-- §3 Official routing slip view (bottom) -->
            <section
              class="stagger-block overflow-hidden rounded-none border shadow-card transition-all hover:shadow-md hover:shadow-candy-orange/10"
              :class="isDark ? 'border-candy-orange/30 bg-onyx-black/50' : 'border-candy-orange/40 bg-white/50'"
            >
              <div class="border-b border-candy-orange/30 bg-candy-orange px-5 py-3">
                <p class="text-[10px] font-bold uppercase tracking-widest text-white-pure">
                  Official Document Routing Slip View
                </p>
                <p class="mt-0.5 text-xs text-white-pure/80">
                  Metadata-only routing wrapper — scan QR to track in the field
                </p>
              </div>

              <div class="space-y-4 p-5">
                <div class="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p class="font-bold uppercase tracking-wider text-candy-orange">Route</p>
                    <p class="mt-1 font-semibold">{{ stageName || 'Unassigned' }}</p>
                  </div>
                  <div>
                    <p class="font-bold uppercase tracking-wider text-candy-orange">Office</p>
                    <p class="mt-1 font-semibold">{{ targetOfficeLabel }}</p>
                  </div>
                  <div class="col-span-2">
                    <p class="font-bold uppercase tracking-wider text-candy-orange">Registered</p>
                    <p class="mt-1 font-semibold">{{ formatDate(document.created_at) }}</p>
                  </div>
                </div>

                <div class="flex flex-col items-center gap-4 rounded-none border border-candy-orange/25 bg-white-pure p-5">
                  <canvas
                    ref="qrCanvas"
                    class="h-44 w-44 max-w-full"
                    aria-label="Scannable document QR code"
                  />
                  <p class="break-all text-center font-mono text-[10px] text-onyx-black/70">
                    {{ document.qr_code_data || 'QR payload not assigned' }}
                  </p>
                </div>

                <button
                  type="button"
                  class="flex w-full items-center justify-center gap-2 rounded-none bg-gradient-to-r from-candy-orange to-[#ff6b00] px-4 py-3.5 text-sm font-semibold text-white-pure shadow-sm shadow-candy-orange/20 transition-all hover:-translate-y-0.5 hover:shadow-candy-orange/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  :disabled="downloading || !document.qr_code_data"
                  @click="handleDownloadPdf"
                >
                  <Icon v-if="downloading" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
                  <Icon v-else name="ph:file-pdf-bold" class="h-4 w-4" />
                  {{ downloading ? 'Generating PDF…' : 'Download Routing Sheet PDF' }}
                </button>
              </div>
            </section>
          </div>

          <footer
            v-if="$slots.footer"
            class="shrink-0 border-t"
            :class="isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50/50'"
          >
            <slot name="footer" />
          </footer>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import QRCode from 'qrcode'
import gsap from 'gsap'
import { useOfficeStore } from '~/stores/office'
import { useStageStore } from '~/stores/stage'
import { generateRoutingSheetPdf } from '~/utils/generateRoutingSheetPdf'
import DocumentLiveFilePreview from './DocumentLiveFilePreview.vue'
import DocumentPipelineOfficeChat from './DocumentPipelineOfficeChat.vue'

interface MessagingOffice { id: string; name: string }

export interface PreviewDocument {
  id: string
  title: string
  description?: string | null
  status?: string
  tracking_status?: string
  checkpoint_cleared_step?: number | null
  qr_code_data?: string | null
  created_at?: string
  stage_id?: string | number | null
  current_step?: number | null
  office_id?: string | number | null
  origin_office_id?: string | number | null
  current_office_id?: string | number | null
  user_id?: string | number
  uploader_name?: string | null
  office_label?: string | null
  origin_label?: string | null
  current_label?: string | null
  priority?: string | null
  mysql_storage_id?: number | null
}

interface StageStep {
  office_id: string | number
  step_number: number
  office_name: string
}

interface SelectedPipelineOffice {
  office_id: string | number
  office_name: string
  step_number: number
}

const props = withDefaults(defineProps<{
  isOpen: boolean
  document: PreviewDocument | null
  widthClass?: string
  officeResolver?: (officeId: string | number | null | undefined) => string
  showComplianceActions?: boolean
  showCompletionActions?: boolean
  pipelineMessagingEnabled?: boolean
  messagingOffices?: MessagingOffice[]
}>(), {
  widthClass: 'lg:max-w-3xl lg:w-[45vw]',
  showComplianceActions: false,
  showCompletionActions: false,
  pipelineMessagingEnabled: false,
  messagingOffices: () => [],
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'flag-issue'): void
  (e: 'compliance-updated', payload: { tracking_status: string; status?: string; checkpoint_cleared_step?: number | null }): void
}>()

const officeStore = useOfficeStore()
const stageStore = useStageStore()
const { isDark } = useTheme()

const qrCanvas = ref<HTMLCanvasElement | null>(null)
const downloading = ref(false)
const completingCheckpoint = ref(false)
const selectedPipelineOffice = ref<SelectedPipelineOffice | null>(null)

const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))
const cellClass = computed(() =>
  isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-surface'
)

const displayPriority = computed(() => props.document?.priority?.trim() || 'Not specified')
const creatorName = computed(() => props.document?.uploader_name?.trim() || '')
const displayTrackingStatus = computed(
  () => props.document?.tracking_status || 'CREATED',
)

const priorityBadgeClass = computed(() => {
  switch (displayPriority.value.toLowerCase()) {
    case 'high':
      return 'text-candy-orange border-candy-orange/40 bg-candy-orange/15'
    case 'low':
      return isDark.value
        ? 'border-onyx-border bg-onyx-sidebar text-white-muted'
        : 'border-gray-200 bg-white-muted text-gray-600'
    default:
      return isDark.value
        ? 'border-onyx-border bg-onyx-card text-white-pure'
        : 'border-gray-200 bg-white-surface text-onyx-black'
  }
})

const stageName = computed(() => {
  const stageId = props.document?.stage_id
  if (stageId == null) return ''
  return stageStore.stages.find((s) => String(s.stage_id) === String(stageId))?.name || ''
})

const resolveOffice = (officeId: string | number | null | undefined) => {
  if (props.officeResolver) return props.officeResolver(officeId)
  if (officeId == null) return 'Unassigned'
  return (
    officeStore.offices.find((o) => String(o.id) === String(officeId))?.name ||
    'Unknown office'
  )
}

const targetOfficeLabel = computed(() => {
  const doc = props.document
  if (!doc) return 'Unassigned'
  return (
    doc.office_label ||
    doc.current_label ||
    doc.origin_label ||
    resolveOffice(doc.current_office_id ?? doc.office_id ?? doc.origin_office_id)
  )
})

const steps = computed<StageStep[]>(() => {
  const stageId = props.document?.stage_id
  if (stageId == null) return []
  const seq = stageStore.stageOfficeSequences[stageId as number] || []
  return [...seq]
    .sort((a, b) => a.step_number - b.step_number)
    .map((step) => ({
      ...step,
      office_name: resolveOffice(step.office_id),
    }))
})

const currentStepNumber = computed(() => {
  const doc = props.document
  const officeId = doc?.current_office_id ?? doc?.office_id
  return (
    steps.value.find((s) => String(s.office_id) === String(officeId))?.step_number ||
    steps.value[0]?.step_number ||
    0
  )
})

const pipelineProgressPct = computed(() => {
  const total = steps.value.length
  if (!total) return 0
  const done = steps.value.filter((s) => isStepDone(s)).length
  return Math.round((done / total) * 100)
})

const canMarkCheckpointDone = computed(() => {
  const doc = props.document
  if (!doc || doc.tracking_status === 'COMPLETED') return false
  if (doc.tracking_status !== 'ARRIVED_AT_OFFICE') return false
  const step = doc.current_step ?? 0
  return (doc.checkpoint_cleared_step ?? null) !== step
})

const isFinalCheckpoint = computed(() => {
  const doc = props.document
  if (!doc || !steps.value.length) return false
  const maxStep = Math.max(...steps.value.map((s) => s.step_number))
  const cursor = doc.current_step ?? 0
  const officeId = doc.current_office_id ?? doc.office_id
  const finalStep = steps.value.find((s) => s.step_number === maxStep)
  return cursor >= maxStep && finalStep && String(finalStep.office_id) === String(officeId ?? '')
})

async function handleApproveCheckpoint() {
  if (!props.document?.id || completingCheckpoint.value) return
  completingCheckpoint.value = true
  try {
    const res = await $fetch<{
      success: boolean
      is_final?: boolean
      message?: string
      data: { document: { tracking_status: string; status?: string; checkpoint_cleared_step?: number } }
    }>('/api/documents/complete-checkpoint', {
      method: 'POST',
      body: { document_id: props.document.id },
    })
    emit('compliance-updated', {
      tracking_status: res.data.document.tracking_status,
      status: res.data.document.status,
      checkpoint_cleared_step: res.data.document.checkpoint_cleared_step,
    })
    if (import.meta.client && res.message) {
      window.alert(res.message)
    }
  } catch (err: any) {
    alert(err?.data?.message || 'Failed to mark checkpoint done')
  } finally {
    completingCheckpoint.value = false
  }
}

const isStepDone = (step: StageStep) => step.step_number < currentStepNumber.value
const isStepCurrent = (step: StageStep) => step.step_number === currentStepNumber.value
const isStepUpcoming = (step: StageStep) => step.step_number > currentStepNumber.value

const stepNodeClass = (step: StageStep) => {
  if (isStepDone(step)) return 'bg-candy-orange text-white-pure border-candy-orange'
  if (isStepCurrent(step)) return 'border-candy-orange text-candy-orange bg-candy-orange/10 animate-pulse'
  return isDark.value ? 'border-onyx-border text-white-muted' : 'border-gray-200 text-gray-400'
}

const pipelineStepNodeClass = (step: StageStep) => {
  const base = stepNodeClass(step)
  if (isPipelineOfficeSelected(step)) {
    return `${base} border-candy-orange ring-2 ring-candy-orange/30`
  }
  return base
}

const isPipelineOfficeSelected = (step: StageStep) =>
  selectedPipelineOffice.value != null &&
  String(selectedPipelineOffice.value.office_id) === String(step.office_id)

const selectPipelineOffice = (step: StageStep) => {
  if (!props.pipelineMessagingEnabled) return
  const isSame =
    selectedPipelineOffice.value &&
    String(selectedPipelineOffice.value.office_id) === String(step.office_id)
  selectedPipelineOffice.value = isSame
    ? null
    : {
        office_id: step.office_id,
        office_name: step.office_name,
        step_number: step.step_number,
      }
}

const stepLabelClass = (step: StageStep) => {
  if (isStepDone(step) || isStepCurrent(step)) return 'text-candy-orange'
  return mutedClass.value
}

const stepStateLabel = (step: StageStep) => {
  if (isStepDone(step)) return 'Completed'
  if (isStepCurrent(step)) return 'Current Checkpoint'
  return 'Upcoming'
}

const trackingBadgeClass = (status?: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'text-green-500 border-green-500/30 bg-green-500/10'
    case 'IN_TRANSIT':
      return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
    case 'PICKED_UP':
      return 'text-purple-400 border-purple-400/30 bg-purple-400/10'
    case 'ARRIVED_AT_OFFICE':
      return 'text-teal-400 border-teal-400/30 bg-teal-400/10'
    case 'DISCREPANCY_REPORTED':
      return 'text-amber-400 border-amber-400/30 bg-amber-400/10'
    default:
      return 'text-candy-orange border-candy-orange/30 bg-candy-orange/10'
  }
}

const trackingLabel = (status?: string) => {
  switch (status) {
    case 'COMPLETED': return 'Completed'
    case 'IN_TRANSIT': return 'In Transit'
    case 'PICKED_UP': return 'Picked Up'
    case 'ARRIVED_AT_OFFICE': return 'At Office'
    case 'DISCREPANCY_REPORTED': return 'Discrepancy'
    default: return 'Created'
  }
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const renderQrCanvas = async () => {
  const payload = props.document?.qr_code_data
  if (!props.isOpen || !payload || !qrCanvas.value) return
  try {
    await QRCode.toCanvas(qrCanvas.value, payload, {
      width: 176,
      margin: 1,
      color: { dark: '#1A1A1A', light: '#FFFFFF' },
    })
  } catch {
    /* non-fatal */
  }
}

const handleDownloadPdf = async () => {
  const doc = props.document
  if (!doc?.qr_code_data) return

  downloading.value = true
  try {
    const canvasSnapshot = qrCanvas.value?.toDataURL('image/png')
    await generateRoutingSheetPdf({
      id: doc.id,
      title: doc.title,
      description: doc.description || undefined,
      creatorName: doc.uploader_name || undefined,
      routeName: stageName.value || undefined,
      targetOffice: targetOfficeLabel.value,
      originOffice: doc.origin_label || undefined,
      priority: displayPriority.value,
      createdAt: doc.created_at,
      qrPayload: doc.qr_code_data,
      qrCanvasDataUrl: canvasSnapshot,
      routeSteps: steps.value.map((s) => ({
        step_number: s.step_number,
        office_name: s.office_name,
      })),
    })
  } catch (err) {
    console.error('[DocumentPreviewDrawer] PDF generation failed:', err)
  } finally {
    downloading.value = false
  }
}

watch(
  () => [props.isOpen, props.document?.id] as const,
  ([open]) => {
    if (!open) selectedPipelineOffice.value = null
  },
)

watch(
  () => [props.isOpen, props.document?.qr_code_data, props.document?.id] as const,
  async ([open]) => {
    if (open) {
      await nextTick()
      await renderQrCanvas()
    } else {
      selectedPipelineOffice.value = null
    }
  },
  { immediate: true },
)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (!stageStore.stages.length) {
        stageStore.fetchStages()
      }
      nextTick(() => {
        gsap.fromTo(
          '.stagger-block',
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out' }
        )
      })
    }
  },
)
</script>

<style scoped>
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.25s ease;
}
.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}

.preview-slide-enter-active,
.preview-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.preview-slide-enter-from,
.preview-slide-leave-to {
  transform: translateX(100%);
}
</style>
