<template>
  <Teleport to="body">
    <Transition name="custody-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
        @click="emit('close')"
      />
    </Transition>

    <Transition name="custody-slide">
      <aside
        v-if="isOpen && document"
        class="fixed bottom-0 right-0 top-0 z-[80] flex w-full flex-col border-l shadow-2xl sm:max-w-md"
        :class="isDark ? 'border-onyx-border bg-onyx-black text-white-pure' : 'border-gray-200 bg-white text-onyx-black'"
      >
        <header class="shrink-0 border-b px-5 py-4" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">Custody Sheet</p>
              <h2 class="mt-1 truncate text-lg font-bold">{{ document.title }}</h2>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-candy-orange/10"
              @click="emit('close')"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </div>
          <p class="mt-2 font-mono text-[11px]" :class="mutedClass">ID: {{ document.tracking_id }}</p>
        </header>

        <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl border p-3" :class="cellClass">
              <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">Status</p>
              <p class="mt-1 text-sm font-semibold">{{ statusLabel }}</p>
            </div>
            <div class="rounded-xl border p-3" :class="cellClass">
              <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">Route Step</p>
              <p class="mt-1 text-sm font-semibold">{{ document.current_step }} / {{ document.total_steps || '—' }}</p>
            </div>
            <div class="col-span-2 rounded-xl border p-3" :class="cellClass">
              <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">Next Drop-off</p>
              <p class="mt-1 text-sm font-semibold">{{ document.destination_office_name || 'Unassigned' }}</p>
            </div>
          </div>

          <section v-if="document.route_steps?.length">
            <p class="mb-3 text-xs font-bold uppercase tracking-widest text-candy-orange">Active Path</p>
            <ol class="space-y-2">
              <li
                v-for="step in document.route_steps"
                :key="step.step_number"
                class="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                :class="stepRowClass(step)"
              >
                <span class="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold">
                  {{ step.step_number }}
                </span>
                <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ step.office_name }}</span>
                <span v-if="step.step_number === document.current_step" class="text-[10px] font-bold uppercase text-candy-orange">
                  Current
                </span>
                <span v-else-if="step.step_number < document.current_step" class="text-[10px] font-bold uppercase text-emerald-500">
                  Done
                </span>
              </li>
            </ol>
          </section>
        </div>

        <footer class="shrink-0 space-y-2 border-t p-5" :class="isDark ? 'border-onyx-border bg-onyx-sidebar' : 'border-gray-200 bg-white-surface'">
          <button
            v-if="canConfirmPickup"
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-3 text-sm font-bold text-white-pure transition hover:bg-opacity-90 disabled:opacity-50"
            :disabled="acting"
            @click="emit('confirm-pickup', document)"
          >
            <Icon v-if="acting" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
            <Icon v-else name="ph:hand-fill" class="h-4 w-4" />
            Confirm Pickup
          </button>

          <button
            v-if="document.tracking_status === 'IN_TRANSIT'"
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-candy-orange bg-candy-orange/10 px-4 py-3 text-sm font-bold text-candy-orange transition hover:bg-candy-orange/20"
            @click="emit('process-dropoff', document)"
          >
            <Icon name="ph:scan-fill" class="h-4 w-4" />
            Process Drop-off
          </button>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
export interface CustodyDocument {
  id: string
  title: string
  tracking_status: string
  tracking_id: string
  current_step: number
  total_steps: number
  origin_office_name?: string | null
  destination_office_name?: string | null
  destination_office_id?: string | null
  route_steps?: Array<{ step_number: number; office_id: string; office_name: string }>
  created_at?: string
  priority?: string | null
  target_date?: string | null
  target_completion_date?: string | null
}

const props = defineProps<{
  isOpen: boolean
  document: CustodyDocument | null
  acting?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm-pickup', doc: CustodyDocument): void
  (e: 'process-dropoff', doc: CustodyDocument): void
}>()

const { isDark } = useTheme()

const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))
const cellClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-surface'))

const statusLabel = computed(() => {
  switch (props.document?.tracking_status) {
    case 'IN_TRANSIT': return 'In Transit'
    case 'PICKED_UP': return 'Awaiting Scan'
    default: return props.document?.tracking_status ?? '—'
  }
})

const canConfirmPickup = computed(() =>
  props.document?.tracking_status === 'PICKED_UP' ||
  props.document?.tracking_status === 'CREATED' ||
  props.document?.tracking_status === 'ARRIVED_AT_OFFICE',
)

const stepRowClass = (step: { step_number: number }) => {
  const current = props.document?.current_step ?? 0
  if (step.step_number === current) {
    return isDark.value ? 'border-candy-orange/40 bg-candy-orange/10' : 'border-candy-orange/30 bg-candy-orange/5'
  }
  if (step.step_number < current) {
    return isDark.value ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'
  }
  return isDark.value ? 'border-onyx-border bg-onyx-card/50' : 'border-gray-200 bg-white'
}
</script>

<style scoped>
.custody-fade-enter-active, .custody-fade-leave-active { transition: opacity 0.2s ease; }
.custody-fade-enter-from, .custody-fade-leave-to { opacity: 0; }
.custody-slide-enter-active, .custody-slide-leave-active { transition: transform 0.25s ease; }
.custody-slide-enter-from, .custody-slide-leave-to { transform: translateX(100%); }
</style>
