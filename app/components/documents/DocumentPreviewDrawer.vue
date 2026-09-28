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
        class="fixed bottom-0 right-0 top-0 z-[90] flex w-full flex-col border-l shadow-2xl transition-transform duration-300"
        :class="[
          isDark
            ? 'border-white/10 bg-onyx-black text-white'
            : 'border-gray-200 bg-white-pure text-gray-900',
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
              <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">
                Document Details
              </p>
              <h2 class="mt-1 text-xl font-bold leading-snug">
                {{ document.title }}
              </h2>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg transition hover:bg-candy-orange/10 hover:text-candy-orange"
              :class="isDark ? 'bg-white/5' : 'bg-gray-100'"
              aria-label="Close preview"
              @click="emit('close')"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
              :class="trackingBadgeClass(displayTrackingStatus)"
            >
              <span
                class="h-1.5 w-1.5 rounded-full bg-current"
                :class="displayTrackingStatus === 'IN_TRANSIT' ? 'animate-pulse' : ''"
              />
              {{ trackingLabel(displayTrackingStatus) }}
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
              :class="priorityBadgeClass"
            >
              Priority: {{ displayPriority }}
            </span>
          </div>
        </header>

        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div class="flex-1 space-y-8 overflow-y-auto px-8 py-8">
            <!-- Details -->
            <div class="stagger-block overflow-hidden rounded-2xl border" :class="cellClass">
              <div class="p-4">
                <p class="text-[13px] font-bold uppercase tracking-wider text-candy-orange">Description</p>
                <p class="mt-2 text-sm leading-relaxed" :class="mutedClass">
                  {{ document.description?.trim() || 'No description provided.' }}
                </p>
              </div>
              <div class="divide-y border-t" :class="isDark ? 'divide-onyx-border border-onyx-border' : 'divide-gray-200 border-gray-200'">
                <div class="flex items-center justify-between gap-3 px-4 py-3">
                  <span class="text-xs font-semibold" :class="mutedClass">Created</span>
                  <span class="text-sm font-semibold">{{ formatDate(document.created_at) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3 px-4 py-3">
                  <span class="text-xs font-semibold" :class="mutedClass">Document Route</span>
                  <span class="text-sm font-semibold">{{ stageName || 'Unassigned' }}</span>
                </div>
                <div v-if="stepsDisplay.length" class="flex items-center justify-between gap-3 px-4 py-3">
                  <span class="text-xs font-semibold" :class="mutedClass">Current Stop</span>
                  <span class="text-sm font-semibold text-candy-orange">Stop {{ currentStepNumber }} of {{ stepsDisplay.length }}</span>
                </div>
                <div class="flex items-center justify-between gap-3 px-4 py-3">
                  <span class="text-xs font-semibold" :class="mutedClass">Receiving Office</span>
                  <span class="truncate text-sm font-semibold">{{ targetOfficeLabel }}</span>
                </div>
                <div v-if="currentDesk" class="flex items-center justify-between gap-3 px-4 py-3">
                  <span class="text-xs font-semibold" :class="mutedClass">Current Desk</span>
                  <span class="truncate text-sm font-semibold text-candy-orange">{{ currentDesk.name }}</span>
                </div>
                <div v-if="currentDesk" class="flex items-center justify-between gap-3 px-4 py-3">
                  <span class="text-xs font-semibold" :class="mutedClass">Currently Handled By</span>
                  <span class="truncate text-sm font-semibold">{{ currentDesk.assigned_user?.full_name || 'Unassigned' }}</span>
                </div>
                <div v-if="document.target_completion_date" class="flex items-center justify-between gap-3 px-4 py-3">
                  <span class="text-xs font-semibold" :class="mutedClass">Expected Completion</span>
                  <span class="text-sm font-semibold" :class="isOverdue ? 'text-danger' : ''">
                    {{ dueLabel }}
                  </span>
                </div>
              </div>
            </div>

            <!-- §2 Delivery progress -->
            <section class="stagger-block">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-lg font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Delivery Progress</h3>
                <span
                  v-if="stepsDisplay.length"
                  class="flex-none rounded-full bg-candy-orange/10 px-3 py-1 text-xs font-bold text-candy-orange"
                >
                  Stop {{ currentStepNumber }} of {{ stepsDisplay.length }}
                </span>
              </div>
              <p class="mt-0.5 text-sm" :class="mutedClass">
                {{ stageName || 'Unassigned route' }}<span v-if="targetOfficeLabel"> · to {{ targetOfficeLabel }}</span>
              </p>

              <div v-if="timelineLoading" class="mt-6 space-y-4">
                <div
                  v-for="n in 3" :key="n"
                  class="h-16 animate-pulse rounded-xl"
                  :class="isDark ? 'bg-white/5' : 'bg-gray-100'"
                />
              </div>

              <div v-else-if="stepsDisplay.length" class="relative mt-6">
                <button
                  v-for="(step, index) in stepsDisplay"
                  :key="`${step.office_id}-${index}`"
                  type="button"
                  class="group relative flex w-full gap-4 pb-7 text-left last:pb-0"
                  :disabled="!pipelineMessagingEnabled"
                  @click="selectPipelineOffice(step)"
                >
                  <!-- Node + connector -->
                  <div class="relative flex flex-none flex-col items-center">
                    <span
                      class="relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold transition-all duration-300"
                      :class="[
                        step.done ? 'bg-success text-white' :
                        step.current ? 'bg-candy-orange text-white ring-4 ring-candy-orange/20' :
                        (isDark ? 'border border-onyx-border bg-onyx-card text-gray-500' : 'border border-gray-200 bg-white text-gray-400'),
                        isPipelineOfficeSelected(step) ? 'scale-110' : '',
                      ]"
                    >
                      <Icon v-if="step.done" name="ph:check-bold" class="h-3.5 w-3.5" />
                      <span v-else>{{ step.step_number }}</span>
                    </span>
                    <span
                      v-if="index < stepsDisplay.length - 1"
                      class="mt-1 w-0.5 flex-1"
                      :class="step.done ? 'bg-success' : (isDark ? 'bg-white/10' : 'bg-gray-200')"
                    />
                  </div>

                  <!-- Content -->
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2">
                      <p class="truncate text-[15px] font-bold" :class="step.upcoming ? mutedClass : (isDark ? 'text-white' : 'text-gray-900')">
                        {{ step.office_name }}
                      </p>
                      <Icon
                        v-if="pipelineMessagingEnabled"
                        name="ph:chat-teardrop-dots-fill"
                        class="h-4 w-4 flex-none text-candy-orange opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        :class="isPipelineOfficeSelected(step) ? 'opacity-100' : ''"
                      />
                    </div>
                    <p class="text-xs font-bold uppercase tracking-wide" :class="step.statusClass">
                      {{ step.statusLabel }}
                    </p>

                    <p v-if="step.actorLine" class="mt-1.5 flex items-center gap-1.5 text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                      <Icon name="ph:user-fill" class="h-3.5 w-3.5 flex-none text-candy-orange" />
                      {{ step.actorLine }}
                    </p>
                    <p v-if="step.timeLine" class="mt-0.5 text-xs" :class="mutedClass">
                      {{ step.timeLine }}
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
                v-if="!timelineLoading && !stepsDisplay.length"
                class="mt-6 rounded-xl border border-dashed p-8 text-center text-sm"
                :class="isDark ? 'border-onyx-border text-gray-400' : 'border-gray-200 text-gray-500'"
              >
                <Icon name="ph:route" class="h-8 w-8 mx-auto mb-3 opacity-30" />
                No workflow stages mapped to this document.
              </div>
            </section>

            <!-- Office checkpoint review (intermediate + final) -->
            <section
              v-if="showCompletionActions && canMarkCheckpointDone"
              class="stagger-block rounded-xl border p-5"
              :class="cellClass"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    class="text-[13px] font-bold uppercase tracking-widest"
                    :class="isFinalCheckpoint ? 'text-success' : 'text-candy-orange'"
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
                  class="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
                  :class="isFinalCheckpoint ? 'bg-success hover:opacity-90' : 'bg-candy-orange hover:bg-candy-hover'"
                  :disabled="completingCheckpoint"
                  @click="handleApproveCheckpoint"
                >
                  <Icon v-if="completingCheckpoint" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
                  <Icon v-else name="ph:check-circle-fill" class="h-4 w-4" />
                  {{ isFinalCheckpoint ? 'Approve & Complete' : 'Mark Reviewed & Release Pickup' }}
                </button>
              </div>
            </section>

            <!-- Delete pending document (uploaded by mistake, not yet picked up) -->
            <section
              v-if="displayTrackingStatus === 'CREATED'"
              class="stagger-block rounded-2xl border border-danger/20 bg-danger/5 p-5"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-[13px] font-bold uppercase tracking-widest text-danger">
                    Delete Document
                  </p>
                  <p class="mt-1 text-sm" :class="mutedClass">
                    Uploaded the wrong file? This entry hasn't been picked up yet, so it can still be removed.
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-5 py-3 text-sm font-bold text-danger shadow-sm transition-colors hover:bg-danger/20"
                  @click="showDeleteConfirm = true"
                >
                  <Icon name="ph:trash-fill" class="h-4 w-4" />
                  Delete
                </button>
              </div>
            </section>

            <!-- Compliance flag action -->
            <section
              v-if="showComplianceActions"
              class="stagger-block rounded-2xl border p-5"
              :class="cellClass"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">
                    Compliance Review
                  </p>
                  <p class="mt-1 text-sm" :class="mutedClass">
                    Flag incomplete hard copies and message the responsible office desk.
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-3 text-sm font-bold text-white-pure shadow-sm transition-colors hover:bg-candy-hover"
                  @click="emit('flag-issue')"
                >
                  <Icon name="ph:warning-fill" class="h-4 w-4" />
                  Flag Issue / Incomplete
                </button>
              </div>
            </section>

            <!-- Already assigned (e.g. chosen at upload time) — just show the pickup QR -->
            <section
              v-if="hasAssignedMessenger && isPickupEligible"
              class="stagger-block rounded-2xl border p-5"
              :class="cellClass"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-[13px] font-bold uppercase tracking-widest text-success">Ready for Pickup</p>
                  <p class="mt-1 text-sm" :class="mutedClass">
                    Assigned to <strong :class="isDark ? 'text-white' : 'text-gray-900'">{{ document.messenger_name || 'a messenger' }}</strong> — show them this QR to scan.
                  </p>
                  <p v-if="nextDestinationLabel" class="mt-1 text-sm" :class="mutedClass">
                    Delivering to <strong :class="isDark ? 'text-white' : 'text-gray-900'">{{ nextDestinationLabel }}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-candy-hover"
                  @click="showPickupQr = true"
                >
                  <Icon name="ph:qr-code-fill" class="h-4 w-4" />
                  Show Pickup QR
                </button>
              </div>
            </section>

            <!-- Not yet assigned: office-assigned Liaison picker, direct assignment -->
            <AssignLiaisonPanel
              v-else
              :document="document"
              :next-destination-label="nextDestinationLabel"
              @assigned="handleLiaisonAssigned"
            />

            <!-- Desk-to-desk transfer: only the staff member currently handling -->
            <!-- this document at their desk may hand it off to another desk. -->
            <section
              v-if="isCurrentDeskHandler"
              class="stagger-block rounded-2xl border border-candy-orange/30 bg-candy-orange/5 p-5"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">Transfer Document</p>
                  <p class="mt-1 text-sm" :class="mutedClass">
                    Scan the QR code of the desk you're handing this document to.
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-candy-hover"
                  @click="openTransferScanner"
                >
                  <Icon name="ph:arrows-left-right-fill" class="h-4 w-4" />
                  Transfer to Another Desk
                </button>
              </div>
              <p v-if="transferSuccessMessage" class="mt-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                {{ transferSuccessMessage }}
              </p>
            </section>

            <slot name="extra" />

            <!-- §3 Official routing slip view (bottom) -->
            <section
              class="stagger-block overflow-hidden rounded-xl border shadow-card"
              :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure'"
            >
              <div class="border-b px-5 py-4" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
                <p class="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-widest text-candy-orange">
                  <Icon name="ph:qr-code-fill" class="h-3.5 w-3.5" />
                  Routing Slip
                </p>
                <p class="mt-0.5 text-xs" :class="mutedClass">
                  Scan this code to track the document in the field
                </p>
              </div>

              <div class="space-y-4 p-5">
                <div class="flex flex-col items-center gap-4 rounded-xl border p-5" :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-white-surface'">
                  <canvas
                    ref="qrCanvas"
                    class="h-44 w-44 max-w-full"
                    aria-label="Scannable document QR code"
                  />
                 
                </div>

                <button
                  type="button"
                  class="flex w-full items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-3.5 text-sm font-semibold text-white-pure shadow-sm transition-colors hover:bg-candy-hover disabled:cursor-not-allowed disabled:opacity-50"
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

    <!-- Delete confirmation -->
    <Transition name="preview-fade">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div
          class="w-full max-w-sm rounded-2xl border p-8 text-center"
          :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
        >
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 border border-danger/20 text-danger">
            <Icon name="ph:warning-circle-light" class="h-7 w-7" />
          </div>
          <h3 class="text-base font-bold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Delete this document?</h3>
          <p class="text-sm mb-6" :class="mutedClass">
            <strong :class="isDark ? 'text-white' : 'text-gray-900'">{{ document?.title }}</strong> will be permanently removed. This action cannot be undone.
          </p>
          <p v-if="deleteError" class="mb-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
            {{ deleteError }}
          </p>
          <div class="flex justify-center gap-3">
            <button
              type="button"
              class="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors border border-transparent"
              :class="isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'"
              @click="showDeleteConfirm = false"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="deleting"
              class="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              @click="handleDelete"
            >
              <Icon v-if="deleting" name="ph:spinner-gap-light" class="h-4 w-4 animate-spin" />
              Delete Document
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <DocumentQrStickerModal
      :is-open="showPickupQr"
      :title="document?.title ?? 'Document'"
      :qr-payload="pickupQrPayload"
      @close="showPickupQr = false"
    />

    <!-- Desk transfer scanner overlay -->
    <div
      v-if="isTransferScannerOpen"
      class="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-black/90 backdrop-blur-sm px-6"
    >
      <button
        type="button"
        class="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label="Close"
        @click="closeTransferScanner"
      >
        <Icon name="ph:x-bold" class="h-5 w-5" />
      </button>
      <p class="text-sm font-semibold text-white">Scan the destination desk's QR code</p>
      <QrScanner theme-color="orange" @scan="handleTransferScan" />
      <p v-if="transferring" class="text-xs font-semibold text-white/70">Transferring…</p>
      <p v-if="transferError" class="max-w-sm rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-center text-sm text-danger">
        {{ transferError }}
      </p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import QRCode from 'qrcode'
import gsap from 'gsap'
import { useOfficeStore } from '~/stores/office'
import { useStageStore } from '~/stores/stage'
import { useAuthStore } from '~/stores/auth'
import { generateRoutingSheetPdf } from '~/utils/generateRoutingSheetPdf'
import { buildDocumentTrackQrPayload } from '~/utils/parseFlowVisionQr'
import DocumentPipelineOfficeChat from './DocumentPipelineOfficeChat.vue'
import AssignLiaisonPanel from './AssignLiaisonPanel.vue'
import DocumentQrStickerModal from './DocumentQrStickerModal.vue'
import QrScanner from '~/components/messenger/QrScanner.vue'

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
  current_desk_id?: string | null
  current_handler_id?: string | null
  user_id?: string | number
  uploader_name?: string | null
  assigned_messenger_id?: string | null
  messenger_name?: string | null
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
  delivered_by?: string | null
  arrived_at?: string | null
  released_at?: string | null
  released_by?: string | null
}

interface TimelineSummary {
  total_steps: number
  current_step: number
  tracking_status: string
  is_complete: boolean
  progress_pct: number
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
  widthClass: 'lg:w-1/2',
  showComplianceActions: false,
  showCompletionActions: false,
  pipelineMessagingEnabled: false,
  messagingOffices: () => [],
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'flag-issue'): void
  (e: 'compliance-updated', payload: { tracking_status: string; status?: string; checkpoint_cleared_step?: number | null }): void
  (e: 'liaison-assigned', payload: { document_id: string; liaison_user_id: string; liaison_name: string | null }): void
  (e: 'deleted', documentId: string): void
}>()

const auth = useAuthStore()

// ── Current desk / handler display + transfer ─────────────────────────
interface CurrentDeskInfo {
  id: string
  name: string
  code: string
  office: { id: string; name: string } | null
  assigned_user: { user_id: string; full_name: string } | null
}

const currentDesk = ref<CurrentDeskInfo | null>(null)
const currentDeskLoading = ref(false)
const isTransferScannerOpen = ref(false)
const transferring = ref(false)
const transferError = ref('')
const transferSuccessMessage = ref('')

const isCurrentDeskHandler = computed(() =>
  !!props.document?.current_handler_id &&
  !!auth.user?.user_id &&
  String(props.document.current_handler_id) === String(auth.user.user_id),
)

async function fetchCurrentDesk(deskId: string | null | undefined) {
  if (!deskId) {
    currentDesk.value = null
    return
  }
  currentDeskLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: CurrentDeskInfo }>(`/api/desks/${deskId}`)
    currentDesk.value = res.data
  } catch {
    currentDesk.value = null
  } finally {
    currentDeskLoading.value = false
  }
}

watch(
  () => props.document?.current_desk_id,
  (deskId) => fetchCurrentDesk(deskId),
  { immediate: true },
)

function openTransferScanner() {
  transferError.value = ''
  transferSuccessMessage.value = ''
  isTransferScannerOpen.value = true
}

function closeTransferScanner() {
  isTransferScannerOpen.value = false
}

async function handleTransferScan(raw: string) {
  if (!props.document?.id || transferring.value) return
  transferring.value = true
  transferError.value = ''
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/tracking/desk-transfer', {
      method: 'POST',
      body: { documentId: props.document.id, destinationDeskQr: raw },
    })
    transferSuccessMessage.value = res.message
    isTransferScannerOpen.value = false
    await fetchCurrentDesk(props.document.current_desk_id)
    emit('compliance-updated', { tracking_status: props.document.tracking_status ?? 'ARRIVED_AT_OFFICE' })
  } catch (err: any) {
    transferError.value = err?.data?.message || 'We could not transfer this document. Please try again.'
  } finally {
    transferring.value = false
  }
}

const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deleteError = ref('')

async function handleDelete() {
  if (!props.document?.id || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/documents/${props.document.id}`, { method: 'DELETE' })
    showDeleteConfirm.value = false
    emit('deleted', props.document.id)
    emit('close')
  } catch (err: any) {
    deleteError.value = err?.data?.message || 'Failed to delete document'
  } finally {
    deleting.value = false
  }
}

function handleLiaisonAssigned(payload: { document_id: string; liaison_user_id: string; liaison_name: string | null }) {
  emit('liaison-assigned', payload)
}

const officeStore = useOfficeStore()
const stageStore = useStageStore()
const { isDark } = useTheme()

const cellClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure'))

const qrCanvas = ref<HTMLCanvasElement | null>(null)
const downloading = ref(false)
const completingCheckpoint = ref(false)
const selectedPipelineOffice = ref<SelectedPipelineOffice | null>(null)

const timelineRouteSteps = ref<StageStep[]>([])
const timelineSummary = ref<TimelineSummary | null>(null)
const timelineLoading = ref(false)

const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value)) : '—'

const displayPriority = computed(() => props.document?.priority?.trim() || 'Not specified')
const displayTrackingStatus = computed(
  () => props.document?.tracking_status || 'CREATED',
)

// Mirrors AssignLiaisonPanel's own eligibility rule: CREATED, or
// ARRIVED_AT_OFFICE with the checkpoint already cleared for the current step.
const isPickupEligible = computed(() => {
  const doc = props.document
  if (!doc) return false
  if (doc.tracking_status === 'CREATED') return true
  if (doc.tracking_status === 'ARRIVED_AT_OFFICE') {
    return (doc.checkpoint_cleared_step ?? null) === (doc.current_step ?? 0)
  }
  return false
})
const hasAssignedMessenger = computed(() => Boolean(props.document?.assigned_messenger_id))

const showPickupQr = ref(false)
const pickupQrPayload = computed(() => props.document?.id ? buildDocumentTrackQrPayload(props.document.id) : '')

// Optional per-document expected completion time — see docs/tracking-ux-improvement-plan.md Part 7.
const isOverdue = computed(() => {
  const target = props.document?.target_completion_date
  if (!target || displayTrackingStatus.value === 'COMPLETED') return false
  return new Date(target).getTime() < Date.now()
})

const dueLabel = computed(() => {
  const target = props.document?.target_completion_date
  if (!target) return ''
  const diffMs = new Date(target).getTime() - Date.now()
  const absHours = Math.abs(diffMs) / (60 * 60 * 1000)
  const days = Math.floor(absHours / 24)
  const hours = Math.round(absHours % 24)
  const span = days > 0 ? `${days}d ${hours}h` : `${Math.max(1, Math.round(absHours))}h`
  return isOverdue.value ? `Overdue by ${span}` : `${span} left`
})

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

// Timeline endpoint gives us the real per-checkpoint history (who picked it
// up, when it arrived, when it was released) — richer than the plain
// office/step list from the stage store, and it's what the "Delivery
// Progress" stepper below is built from.
async function fetchTimeline() {
  const documentId = props.document?.id
  if (!documentId) {
    timelineRouteSteps.value = []
    timelineSummary.value = null
    return
  }
  timelineLoading.value = true
  try {
    const res = await $fetch<{
      success: boolean
      data: { routeSteps: StageStep[]; summary: TimelineSummary }
    }>('/api/tracking/timeline', { params: { documentId } })
    timelineRouteSteps.value = (res.data.routeSteps ?? [])
      .map((step) => ({ ...step, office_name: step.office_name || resolveOffice(step.office_id) }))
      .sort((a, b) => a.step_number - b.step_number)
    timelineSummary.value = res.data.summary
  } catch (err) {
    console.error('[DocumentPreviewDrawer] timeline fetch error:', err)
    timelineRouteSteps.value = []
    timelineSummary.value = null
  } finally {
    timelineLoading.value = false
  }
}

const steps = computed<StageStep[]>(() => timelineRouteSteps.value)

const currentStepNumber = computed(() => {
  if (timelineSummary.value) return timelineSummary.value.current_step
  const doc = props.document
  const officeId = doc?.current_office_id ?? doc?.office_id
  return (
    steps.value.find((s) => String(s.office_id) === String(officeId))?.step_number ||
    steps.value[0]?.step_number ||
    0
  )
})

const pipelineProgressPct = computed(() => {
  if (timelineSummary.value) return timelineSummary.value.progress_pct
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

// Same "next step" arithmetic used server-side (assign-liaison.post.ts /
// complete-checkpoint.post.ts: `current_step + 1` against stage_steps) so the
// label shown here can never drift from what the server will actually assign
// against. Purely a display label — the server remains the sole authority.
const nextDestinationLabel = computed(() => {
  const doc = props.document
  if (!doc) return null
  const nextStepNumber = (doc.current_step ?? 0) + 1
  return steps.value.find((s) => s.step_number === nextStepNumber)?.office_name ?? null
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
    await fetchTimeline()
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

// Enriches each route step with the display strings the vertical stepper
// needs: a status label/color, who handled it, and a human time line built
// from this step's own arrival/release plus the *previous* step's release
// (the moment it was actually picked up and sent here).
const stepsDisplay = computed(() => {
  return steps.value.map((step, index) => {
    const prior = steps.value[index - 1]
    const done = isStepDone(step)
    const current = isStepCurrent(step)
    const upcoming = isStepUpcoming(step)

    let statusLabel = 'Upcoming'
    let statusClass = mutedClass.value
    if (done) {
      statusLabel = 'Delivered'
      statusClass = 'text-success'
    } else if (current) {
      statusLabel = 'Current Checkpoint'
      statusClass = 'text-candy-orange'
    }

    const actorName = step.delivered_by || (current ? prior?.released_by : null)
    const actorLine = !upcoming && actorName ? `Picked up by ${actorName}` : ''

    let timeLine = ''
    if (upcoming) {
      timeLine = 'Not yet started'
    } else {
      const pickupAt = prior?.released_at || null
      const bits: string[] = []
      if (pickupAt) bits.push(`Picked up: ${formatStopTime(pickupAt)}`)
      if (step.arrived_at) bits.push(`Arrived: ${formatStopTime(step.arrived_at)}`)
      else if (pickupAt) bits.push('In transit now')
      timeLine = bits.join(' · ')
    }

    return { ...step, done, current, upcoming, statusLabel, statusClass, actorLine, timeLine }
  })
})

const formatStopTime = (value?: string | null) => {
  if (!value) return ''
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' })
    .format(new Date(value))
    .replace(',', '')
}

// Shopee-style palette: not-started stays neutral gray, anything moving is
// brand orange, done is green, and a real problem is the only thing that gets red.
const trackingBadgeClass = (status?: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'text-success border-success/30 bg-success/10'
    case 'IN_TRANSIT':
    case 'PICKED_UP':
    case 'ARRIVED_AT_OFFICE':
      return 'text-candy-orange border-candy-orange/30 bg-candy-orange/10'
    case 'DISCREPANCY_REPORTED':
      return 'text-danger border-danger/30 bg-danger/10'
    default:
      return 'text-gray-500 border-gray-300/40 bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30'
  }
}

const trackingLabel = (status?: string) => {
  switch (status) {
    case 'COMPLETED': return 'Completed'
    case 'IN_TRANSIT': return 'On the Way'
    case 'PICKED_UP': return 'Picked Up'
    case 'ARRIVED_AT_OFFICE': return 'Received by Office'
    case 'DISCREPANCY_REPORTED': return 'Issue Reported'
    default: return 'Registered'
  }
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
    if (open) fetchTimeline()
    else selectedPipelineOffice.value = null
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
        const blocks = document.querySelectorAll<HTMLElement>('.stagger-block')
        if (!blocks.length) return
        gsap.fromTo(
          blocks,
          { y: 25, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.05,
            ease: 'power3.out',
            overwrite: true,
            clearProps: 'opacity,transform',
          }
        )
        // Safety net: if the tween is ever interrupted (tab backgrounded, a
        // re-render mid-animation, etc.) the drawer's content must never be
        // left permanently invisible just because it never reached its "to" state.
        setTimeout(() => {
          blocks.forEach((el) => {
            el.style.opacity = ''
            el.style.transform = ''
          })
        }, 900)
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
