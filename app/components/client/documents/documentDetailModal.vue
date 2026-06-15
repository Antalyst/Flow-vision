<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
        @click="emit('close')"
      ></div>
    </Transition>

    <Transition name="drawer-slide">
      <aside
        v-if="isOpen && document"
        class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-xl flex-col border-l text-white shadow-2xl bg-[#1A1A1A] border-[#2A2A2A]"
      >
        <header class="flex items-start justify-between gap-4 border-b border-[#2A2A2A] px-5 py-5">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-[#FF620C]">Document</p>
            <h2 class="mt-1 text-xl font-bold">{{ document.title }}</h2>
            <span
              class="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
              :class="statusClass(document.status)"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-current" :class="document.status === 'Pending' ? 'animate-pulse' : ''"></span>
              {{ document.status || 'Pending' }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-[#FF620C]/10 hover:text-[#FF620C]"
            aria-label="Close"
            @click="emit('close')"
          >
            <Icon name="ph:x-bold" class="h-4 w-4" />
          </button>
        </header>

        <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <!-- Section A: Metadata Dashboard -->
          <section class="rounded-lg border border-[#2A2A2A] bg-rich-black/40 p-4">
            <div class="flex items-center gap-2 text-sm font-semibold text-[#FF620C]">
              <Icon name="ph:info" class="h-4 w-4" />
              Metadata
            </div>

            <dl class="mt-3 space-y-3 text-sm">
              <div>
                <dt class="text-xs uppercase tracking-wide text-gray-500">Description</dt>
                <dd class="mt-1 leading-5 text-gray-300">{{ document.description }}</dd>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <dt class="text-xs uppercase tracking-wide text-gray-500">Created</dt>
                  <dd class="mt-1 text-gray-300">{{ formatDate(document.created_at) }}</dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-gray-500">Target Office</dt>
                  <dd class="mt-1 text-gray-300">{{ getOfficeName(document.office_id) }}</dd>
                </div>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-gray-500">Workflow</dt>
                <dd class="mt-1 text-gray-300">{{ stageName || 'Unassigned' }}</dd>
              </div>
            </dl>

            <!-- QR rendering block -->
            <div class="mt-4 flex items-center gap-4 rounded-lg border border-[#2A2A2A] bg-[#121212] p-4">
              <div class="flex h-[120px] w-[120px] flex-none items-center justify-center rounded-md bg-white p-2">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="Document QR code" class="h-full w-full" />
                <Icon v-else name="ph:qr-code" class="h-12 w-12 text-gray-400" />
              </div>
              <div class="min-w-0">
                <p class="text-xs uppercase tracking-wide text-gray-500">QR Tracking Code</p>
                <p class="mt-1 break-all font-mono text-sm text-gray-300">{{ document.qr_code_data || 'N/A' }}</p>
                <p class="mt-2 text-xs text-gray-500">Scan to align the physical document with this record.</p>
              </div>
            </div>
          </section>

          <!-- Section B: Step-by-Step Flow Tracker -->
          <section>
            <div class="mb-4 flex items-center gap-2 text-sm font-semibold text-[#FF620C]">
              <Icon name="ph:path" class="h-4 w-4" />
              Workflow Tracker
            </div>

            <div v-if="steps.length" class="relative space-y-0">
              <div
                v-for="(step, index) in steps"
                :key="`${step.office_id}-${index}`"
                class="relative flex gap-4 pb-6 last:pb-0"
              >
                <!-- connector line -->
                <div
                  v-if="index < steps.length - 1"
                  class="absolute left-[15px] top-8 h-full w-0.5"
                  :class="isCompleted(step) ? 'bg-[#FF620C]' : 'bg-[#2A2A2A]'"
                ></div>

                <!-- node -->
                <div
                  class="relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full border text-xs font-bold transition"
                  :class="nodeClass(step)"
                >
                  <Icon v-if="isCompleted(step)" name="ph:check-bold" class="h-4 w-4" />
                  <span v-else>{{ step.step_number }}</span>
                </div>

                <!-- content -->
                <div class="min-w-0 flex-1 pt-1">
                  <p class="text-sm font-semibold" :class="isUpcoming(step) ? 'text-gray-500' : 'text-white'">
                    {{ step.office_name }}
                  </p>
                  <p class="mt-0.5 text-xs" :class="labelClass(step)">
                    {{ stateLabel(step) }} · Step {{ step.step_number }}
                  </p>
                </div>
              </div>
            </div>

            <div
              v-else
              class="rounded-lg border border-dashed border-[#2A2A2A] p-6 text-center text-sm text-gray-500"
            >
              No workflow steps are mapped to this document's stage.
            </div>
          </section>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { useOfficeStore } from '~/stores/office'
import { useStageStore } from '~/stores/stage'

const props = defineProps<{
  isOpen: boolean
  document: any | null
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const officeStore = useOfficeStore()
const stageStore = useStageStore()

const qrDataUrl = ref('')

watch(
  () => [props.isOpen, props.document?.qr_code_data],
  async () => {
    if (props.isOpen && props.document?.qr_code_data) {
      try {
        qrDataUrl.value = await QRCode.toDataURL(props.document.qr_code_data, {
          margin: 1,
          width: 200,
        })
      } catch {
        qrDataUrl.value = ''
      }
    } else {
      qrDataUrl.value = ''
    }
  },
  { immediate: true }
)

watch(
  () => props.isOpen,
  (open) => {
    if (open && !stageStore.stages.length) {
      stageStore.fetchStages()
    }
  }
)

const stageName = computed(() => {
  const stageId = props.document?.stage_id
  if (stageId == null) return ''
  return stageStore.stages.find((s) => String(s.stage_id) === String(stageId))?.name || ''
})

const steps = computed(() => {
  const stageId = props.document?.stage_id
  if (stageId == null) return []
  const seq = stageStore.stageOfficeSequences[stageId as number] || []
  return [...seq]
    .sort((a, b) => a.step_number - b.step_number)
    .map((step) => ({
      ...step,
      office_name: getOfficeName(step.office_id),
    }))
})

// The operational anchor: the step whose office matches the document's current office.
// Falls back to the first step when no explicit office match exists.
const currentStep = computed(() => {
  const officeId = props.document?.office_id
  return (
    steps.value.find((s) => String(s.office_id) === String(officeId)) ||
    steps.value[0] ||
    null
  )
})

const currentStepNumber = computed(() => currentStep.value?.step_number ?? 0)

type TrackerStep = { office_id: string | number; step_number: number; office_name: string }

const isCompleted = (step: TrackerStep) => step.step_number < currentStepNumber.value
const isCurrent = (step: TrackerStep) => step.step_number === currentStepNumber.value
const isUpcoming = (step: TrackerStep) => step.step_number > currentStepNumber.value

const getOfficeName = (officeId: string | number | null | undefined) => {
  if (officeId == null) return 'Unassigned'
  return (
    officeStore.offices.find((office) => String(office.id) === String(officeId))?.name ||
    'Unknown office'
  )
}

const nodeClass = (step: TrackerStep) => {
  if (isCompleted(step)) return 'bg-[#FF620C] text-white border-[#FF620C]'
  if (isCurrent(step)) return 'text-[#FF620C] border border-[#FF620C]/30 bg-[#FF620C]/10 animate-pulse'
  return 'border-[#2A2A2A] text-gray-500'
}

const labelClass = (step: TrackerStep) => {
  if (isCompleted(step) || isCurrent(step)) return 'text-[#FF620C]'
  return 'text-gray-500'
}

const stateLabel = (step: TrackerStep) => {
  if (isCompleted(step)) return 'Completed'
  if (isCurrent(step)) return 'Current Checkpoint'
  return 'Upcoming'
}

const statusClass = (status: string) => {
  switch ((status || 'Pending').toLowerCase()) {
    case 'approved':
      return 'text-green-500 border-green-500/30 bg-green-500/10'
    case 'rejected':
      return 'text-red-500 border-red-500/30 bg-red-500/10'
    case 'processing':
    case 'in review':
      return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
    case 'pending':
    default:
      return 'text-[#FF620C] border-[#FF620C]/30 bg-[#FF620C]/10'
  }
}

const formatDate = (value?: string) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
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
