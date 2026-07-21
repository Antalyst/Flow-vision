<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="isOpen && !showSticker"
        class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
        @click="handleClose"
      />
    </Transition>

    <Transition name="drawer-slide">
      <form
        v-if="isOpen && !showSticker"
        class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-lg flex-col border-l shadow-2xl"
        :class="surfaceClass"
        @submit.prevent="handleSubmit"
      >
        <header class="flex items-start justify-between gap-4 border-b px-5 py-5" :class="borderClass">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-candy-orange">Documents</p>
            <h2 class="mt-1 text-xl font-bold" :class="headingClass">Register Hard Copy</h2>
            <p class="mt-1 text-xs" :class="mutedClass">
              Metadata-only registration — no digital file upload.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-candy-orange/10"
            aria-label="Close"
            @click="handleClose"
          >
            <Icon name="ph:x-bold" class="h-4 w-4" :class="headingClass" />
          </button>
        </header>

        <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div
            v-if="!documentStore.canUploadDocuments"
            class="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-500"
          >
            Your account role is not permitted to register documents.
          </div>

          <!-- Employee: origin office -->
          <label v-if="role === 'employee'" class="block">
            <span class="text-sm font-semibold" :class="headingClass">Origin Office</span>
            <select
              v-model="originOfficeId"
              class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-candy-orange"
              :class="inputClass"
              required
            >
              <option value="" disabled>Select your sub-office</option>
              <option v-for="office in offices" :key="office.id" :value="String(office.id)">
                {{ office.name }}
              </option>
            </select>
          </label>

          <!-- Employee: route scope tabs -->
          <div v-if="role === 'employee'">
            <span class="text-sm font-semibold" :class="headingClass">Route Scope</span>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button
                v-for="tab in routeTabs"
                :key="tab.value"
                type="button"
                class="flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition"
                :class="routeTab === tab.value
                  ? 'border-candy-orange bg-candy-orange text-white-pure'
                  : isDark ? 'border-onyx-border text-white-muted hover:border-candy-orange/50' : 'border-gray-200 text-gray-600 hover:border-candy-orange/50'"
                @click="routeTab = tab.value"
              >
                <Icon :name="tab.icon" class="h-3.5 w-3.5" />
                {{ tab.label }}
              </button>
            </div>
          </div>

          <!-- Target route -->
          <label class="block">
            <span class="text-sm font-semibold" :class="headingClass">Target Route</span>
            <select
              v-model="stageId"
              class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-candy-orange"
              :class="inputClass"
              required
            >
              <option value="" disabled>Select a workflow route</option>
              <option v-for="stage in visibleStages" :key="stage.stage_id" :value="String(stage.stage_id)">
                {{ stage.name }}
              </option>
            </select>
            <p v-if="!visibleStages.length" class="mt-2 text-xs" :class="mutedClass">
              No routes available. Create a stage in the Stages workspace first.
            </p>
          </label>

          <label class="block">
            <span class="text-sm font-semibold" :class="headingClass">Title</span>
            <input
              v-model="title"
              type="text"
              required
              maxlength="200"
              placeholder="e.g. Q3 Subsidy Application Batch"
              class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-candy-orange"
              :class="inputClass"
            />
          </label>

          <label class="block">
            <span class="text-sm font-semibold" :class="headingClass">Description</span>
            <textarea
              v-model="description"
              rows="3"
              placeholder="Optional notes about this hard-copy packet"
              class="mt-2 w-full resize-none rounded-lg border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-candy-orange"
              :class="inputClass"
            />
          </label>

          <fieldset>
            <legend class="text-sm font-semibold" :class="headingClass">Priority</legend>
            <div class="mt-2 grid grid-cols-3 gap-2">
              <label
                v-for="opt in priorityOptions"
                :key="opt.value"
                class="flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-3 py-3 text-center text-xs font-semibold transition"
                :class="priority === opt.value
                  ? 'border-candy-orange bg-candy-orange/10 text-candy-orange'
                  : isDark ? 'border-onyx-border text-white-muted' : 'border-gray-200 text-gray-600'"
              >
                <input v-model="priority" type="radio" :value="opt.value" class="sr-only" />
                <Icon :name="opt.icon" class="h-4 w-4" />
                {{ opt.label }}
              </label>
            </div>
          </fieldset>

          <p v-if="errorMessage" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {{ errorMessage }}
          </p>
        </div>

        <footer class="border-t px-5 py-4" :class="borderClass">
          <button
            type="submit"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-3 text-sm font-semibold text-white-pure shadow-lg shadow-candy-orange/25 transition hover:bg-candy-hover disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="submitting || !documentStore.canUploadDocuments"
          >
            <Icon v-if="submitting" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
            <Icon v-else name="ph:qr-code-bold" class="h-4 w-4" />
            {{ submitting ? 'Registering…' : 'Register & Generate QR' }}
          </button>
        </footer>
      </form>
    </Transition>

    <DocumentQrStickerModal
      :is-open="showSticker"
      :title="registeredTitle"
      :qr-payload="registeredQr"
      :priority="registeredPriority"
      @close="handleStickerClose"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDocumentStore } from '~/stores/document'
import { useStageStore } from '~/stores/stage'
import DocumentQrStickerModal from './DocumentQrStickerModal.vue'

type DocumentRole = 'client' | 'employee'
type RouteTab = 'global' | 'local'
type Priority = 'High' | 'Medium' | 'Low'

interface OfficeRecord {
  id: string
  name: string
  code?: string
}

interface EnrichedStage {
  stage_id: number | string
  name: string
  office_id?: string | null
}

const props = withDefaults(defineProps<{
  isOpen: boolean
  role: DocumentRole
  offices?: OfficeRecord[]
}>(), {
  offices: () => [],
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'registered'): void
}>()

const documentStore = useDocumentStore()
const stageStore = useStageStore()
const { isDark } = useTheme()

const title = ref('')
const description = ref('')
const priority = ref<Priority>('Medium')
const stageId = ref('')
const originOfficeId = ref('')
const routeTab = ref<RouteTab>('global')
const errorMessage = ref('')
const submitting = ref(false)
const showSticker = ref(false)
const registeredTitle = ref('')
const registeredQr = ref('')
const registeredPriority = ref('')

const routeTabs = [
  { value: 'global' as RouteTab, label: 'Global', icon: 'ph:globe-hemisphere-west-fill' },
  { value: 'local' as RouteTab, label: 'Local', icon: 'ph:buildings-fill' },
]

const priorityOptions = [
  { value: 'High' as Priority, label: 'High', icon: 'ph:warning-circle-fill' },
  { value: 'Medium' as Priority, label: 'Medium', icon: 'ph:minus-circle-fill' },
  { value: 'Low' as Priority, label: 'Low', icon: 'ph:check-circle-fill' },
]

const surfaceClass = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-card text-white-pure'
    : 'border-gray-200 bg-white-surface text-onyx-black'
)
const borderClass = computed(() => (isDark.value ? 'border-onyx-border' : 'border-gray-200'))
const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))
const inputClass = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-black text-white-pure placeholder:text-white-muted'
    : 'border-gray-200 bg-white-pure text-onyx-black placeholder:text-gray-400'
)

const allStages = computed<EnrichedStage[]>(() => stageStore.stages as unknown as EnrichedStage[])

const visibleStages = computed<EnrichedStage[]>(() => {
  if (props.role === 'client') {
    return allStages.value
  }
  if (routeTab.value === 'global') {
    return allStages.value.filter((s) => !s.office_id)
  }
  if (!originOfficeId.value) {
    const myIds = props.offices.map((o) => String(o.id))
    return allStages.value.filter((s) => s.office_id && myIds.includes(String(s.office_id)))
  }
  return allStages.value.filter((s) => s.office_id && String(s.office_id) === originOfficeId.value)
})

const resetForm = () => {
  title.value = ''
  description.value = ''
  priority.value = 'Medium'
  stageId.value = ''
  originOfficeId.value = ''
  routeTab.value = 'global'
  errorMessage.value = ''
  showSticker.value = false
  registeredTitle.value = ''
  registeredQr.value = ''
  registeredPriority.value = ''
}

const handleClose = () => {
  if (submitting.value) return
  resetForm()
  emit('close')
}

const handleStickerClose = () => {
  resetForm()
  emit('registered')
  emit('close')
}

const handleSubmit = async () => {
  errorMessage.value = ''
  if (!stageId.value) {
    errorMessage.value = 'Please select a target route.'
    return
  }
  if (props.role === 'employee' && !originOfficeId.value) {
    errorMessage.value = 'Please select your origin office.'
    return
  }

  submitting.value = true
  try {
    const result = await documentStore.registerDocument({
      title: title.value.trim(),
      description: description.value.trim(),
      priority: priority.value,
      stageId: stageId.value,
      originOfficeId: props.role === 'employee' ? originOfficeId.value : null,
    })

    if (!result.success || !result.data) {
      errorMessage.value = result.error || 'Registration failed.'
      return
    }

    registeredTitle.value = result.data.title
    registeredQr.value = result.data.qr_code_data || ''
    registeredPriority.value = priority.value
    showSticker.value = true
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.isOpen,
  async (open) => {
    if (open && !stageStore.stages.length) {
      await stageStore.fetchStages()
    }
    if (!open) {
      resetForm()
    }
  },
)

watch([routeTab, originOfficeId], () => {
  if (stageId.value && !visibleStages.value.some((s) => String(s.stage_id) === stageId.value)) {
    stageId.value = ''
  }
})
</script>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active { transition: opacity 0.2s ease; }
.drawer-fade-enter-from,
.drawer-fade-leave-to { opacity: 0; }

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to { transform: translateX(100%); }
</style>
