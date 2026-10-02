<template>
  <div class="space-y-4">
    <!-- Routing type -->
    <!-- Only offered once the server confirms recurring routing is installed. -->
    <div v-if="!hideRoutingType && recurringAvailable" class="flex flex-wrap items-center gap-3">
      <span class="text-sm font-semibold" :class="headingClass">Routing type</span>
      <div class="flex rounded-xl border p-1" :class="isDark ? 'border-white/10' : 'border-gray-200'">
        <button
          v-for="opt in routingOptions"
          :key="opt.value"
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
          :class="routingType === opt.value ? 'bg-candy-orange text-white' : mutedClass"
          :disabled="opt.value === 'RECURRING' && !originOfficeId"
          @click="emit('update:routingType', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
      <p class="w-full text-xs" :class="mutedClass">
        <template v-if="routingType === 'RECURRING'">
          After the last office, the document returns to your office and that cycle completes. You can then reactivate the same document — same QR code, no re-upload — for another cycle.
        </template>
        <template v-else-if="!originOfficeId">Recurring routes need an origin office to return to.</template>
        <template v-else>The document completes at the last office in the route.</template>
      </p>
    </div>

    <!-- Saved routes -->
    <div v-if="!hideSavedRoutes" class="rounded-2xl border p-4" :class="cardClass">
      <div class="flex flex-wrap items-center gap-2">
        <Icon name="ph:bookmark-simple-fill" class="h-4 w-4 text-candy-orange" />
        <span class="text-sm font-semibold" :class="headingClass">Saved routes</span>
        <select
          v-model="selectedSavedId"
          class="ml-auto min-w-[12rem] flex-1 rounded-lg border px-3 py-2 text-sm sm:flex-none"
          :class="inputClass"
          @change="applySavedRoute"
        >
          <option value="">Build a new route…</option>
          <option v-for="r in savedRoutes" :key="r.stage_id" :value="String(r.stage_id)">
            {{ r.name }} ({{ r.workflow_items?.length ?? 0 }} stops{{ r.routing_type === 'RECURRING' ? ', recurring' : '' }})
          </option>
        </select>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <input
          v-model="saveName"
          type="text"
          maxlength="120"
          :placeholder="selectedSaved ? 'Route name' : 'Name this route, e.g. Payroll Processing'"
          class="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
          :class="inputClass"
        />
        <button
          v-if="!selectedSaved"
          type="button"
          class="rounded-lg bg-candy-orange px-3 py-2 text-xs font-semibold text-white transition hover:bg-candy-hover disabled:opacity-50"
          :disabled="busy || !saveName.trim() || modelValue.length === 0"
          @click="saveAsNew"
        >
          Save route
        </button>
        <template v-else>
          <button
            type="button"
            class="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:border-candy-orange disabled:opacity-50"
            :class="isDark ? 'border-white/10 text-white' : 'border-gray-200 text-gray-800'"
            :disabled="busy || !saveName.trim() || modelValue.length === 0"
            @click="updateSaved"
          >
            Update saved route
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50"
            :disabled="busy"
            @click="deleteSaved"
          >
            Delete
          </button>
        </template>
      </div>
      <p class="mt-2 text-xs" :class="mutedClass">
        Saved routes are shared within your organization. Changing one never changes documents already created with it.
      </p>
      <p v-if="message" class="mt-2 text-xs" :class="messageIsError ? 'text-danger' : 'text-success'">{{ message }}</p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Available offices -->
      <div class="flex min-h-[18rem] flex-col rounded-2xl border p-4" :class="cardClass">
        <p class="text-sm font-semibold" :class="headingClass">Offices in your organization</p>
        <div class="relative mt-3">
          <Icon name="ph:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" :class="mutedClass" />
          <input
            v-model="search"
            type="search"
            placeholder="Search offices"
            class="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
            :class="inputClass"
          />
        </div>
        <div class="mt-3 max-h-80 flex-1 space-y-1.5 overflow-y-auto pr-1">
          <p v-if="loading" class="py-6 text-center text-xs" :class="mutedClass">Loading offices…</p>
          <p v-else-if="availableOffices.length === 0" class="py-6 text-center text-xs" :class="mutedClass">
            {{ search ? 'No offices match your search.' : 'Every office is already in the route.' }}
          </p>
          <button
            v-for="office in availableOffices"
            :key="office.id"
            type="button"
            class="flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition hover:border-candy-orange"
            :class="isDark ? 'border-white/10 text-white' : 'border-gray-200 text-gray-800'"
            @click="addOffice(office.id)"
          >
            <span class="min-w-0 truncate">{{ office.name }}<span v-if="office.code" class="ml-1.5 text-xs" :class="mutedClass">{{ office.code }}</span></span>
            <Icon name="ph:plus-circle-fill" class="h-5 w-5 flex-none text-candy-orange" />
          </button>
        </div>
      </div>

      <!-- Route -->
      <div class="flex min-h-[18rem] flex-col rounded-2xl border p-4" :class="cardClass">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold" :class="headingClass">Route</p>
          <span class="text-xs" :class="mutedClass">{{ modelValue.length }} destination{{ modelValue.length === 1 ? '' : 's' }}</span>
        </div>

        <div class="mt-3 flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5" :class="isDark ? 'border-white/15' : 'border-gray-300'">
          <span class="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-success text-white">
            <Icon name="ph:house-fill" class="h-3.5 w-3.5" />
          </span>
          <div class="min-w-0">
            <p class="text-[11px] font-bold uppercase tracking-wide text-success">Origin</p>
            <p class="truncate text-sm font-medium" :class="headingClass">{{ originLabel }}</p>
          </div>
        </div>

        <ol class="mt-2 max-h-80 flex-1 space-y-1.5 overflow-y-auto pr-1">
          <li v-if="modelValue.length === 0" class="py-6 text-center text-xs" :class="mutedClass">
            Add offices from the list, in the order the document should visit them.
          </li>
          <li
            v-for="(officeId, index) in modelValue"
            :key="officeId"
            draggable="true"
            class="flex items-center gap-2 rounded-xl border px-2 py-2 transition"
            :class="[
              isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-white',
              dragOverIndex === index ? 'border-candy-orange ring-2 ring-candy-orange/20' : '',
            ]"
            @dragstart="onDragStart(index, $event)"
            @dragover.prevent="dragOverIndex = index"
            @dragleave="dragOverIndex = dragOverIndex === index ? null : dragOverIndex"
            @drop.prevent="onDrop(index)"
            @dragend="dragIndex = null; dragOverIndex = null"
          >
            <Icon name="ph:dots-six-vertical-bold" class="h-4 w-4 flex-none cursor-grab" :class="mutedClass" aria-hidden="true" />
            <span class="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-candy-orange text-xs font-bold text-white">{{ index + 1 }}</span>
            <span class="min-w-0 flex-1 truncate text-sm" :class="headingClass">
              {{ officeName(officeId) }}
              <span v-if="index === modelValue.length - 1" class="ml-1 text-[11px] font-semibold uppercase text-candy-orange">Final</span>
            </span>
            <button type="button" class="rounded p-1 transition hover:text-candy-orange disabled:opacity-30" :class="mutedClass" :disabled="index === 0" :aria-label="`Move ${officeName(officeId)} up`" @click="move(index, index - 1)">
              <Icon name="ph:caret-up-bold" class="h-3.5 w-3.5" />
            </button>
            <button type="button" class="rounded p-1 transition hover:text-candy-orange disabled:opacity-30" :class="mutedClass" :disabled="index === modelValue.length - 1" :aria-label="`Move ${officeName(officeId)} down`" @click="move(index, index + 1)">
              <Icon name="ph:caret-down-bold" class="h-3.5 w-3.5" />
            </button>
            <button type="button" class="rounded p-1 transition hover:text-danger" :class="mutedClass" :aria-label="`Remove ${officeName(officeId)}`" @click="removeAt(index)">
              <Icon name="ph:x-bold" class="h-3.5 w-3.5" />
            </button>
          </li>
          <li
            v-if="routingType === 'RECURRING' && modelValue.length"
            class="flex items-center gap-2 rounded-xl border border-dashed px-2 py-2"
            :class="isDark ? 'border-success/30' : 'border-success/40'"
          >
            <Icon name="ph:arrow-u-up-left-bold" class="ml-1 h-4 w-4 flex-none text-success" />
            <span class="min-w-0 flex-1 truncate text-sm" :class="headingClass">
              Returns to {{ originLabel }}
              <span class="ml-1 text-[11px] font-semibold uppercase text-success">Completes the cycle</span>
            </span>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

interface OfficeOption { id: string; name: string; code?: string | null; parent_office_id?: string | null; is_client_station?: boolean | null }
interface SavedRoute { stage_id: string | number; name: string; routing_type?: string | null; workflow_items?: Array<{ office_id: string; step_number: number }> }
type RoutingType = 'STANDARD' | 'RECURRING'

const props = defineProps<{
  /** Ordered destination office ids (step 1 first). */
  modelValue: string[]
  /** Office the document is registered at — shown as the origin, never a destination. */
  originOfficeId?: string | null
  originName?: string | null
  /** Saved route this route was loaded from, if any. */
  savedRouteId?: string | null
  /** STANDARD or RECURRING (returns to the origin office and can be reactivated). */
  routingType?: RoutingType
  hideRoutingType?: boolean
  hideSavedRoutes?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
  (e: 'update:savedRouteId', value: string | null): void
  (e: 'update:routingType', value: RoutingType): void
}>()

const routingOptions = [
  { value: 'STANDARD' as RoutingType, label: 'Standard route' },
  { value: 'RECURRING' as RoutingType, label: 'Recurring route' },
]
const routingType = computed<RoutingType>(() => props.routingType ?? 'STANDARD')
const recurringAvailable = ref(false)

async function loadRoutingFeatures() {
  try {
    const res: any = await $fetch('/api/tracking/routing-features')
    recurringAvailable.value = !!res?.recurring
  } catch {
    recurringAvailable.value = false
  }
  if (!recurringAvailable.value && !props.hideRoutingType && routingType.value === 'RECURRING') {
    emit('update:routingType', 'STANDARD')
  }
}

const { isDark } = useTheme()
const cardClass = computed(() => (isDark.value ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50/60'))
const headingClass = computed(() => (isDark.value ? 'text-white' : 'text-gray-900'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const inputClass = computed(() => (isDark.value
  ? 'border-white/10 bg-onyx-black text-white placeholder:text-gray-500 focus:border-candy-orange'
  : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-candy-orange'))

const offices = ref<OfficeOption[]>([])
const savedRoutes = ref<SavedRoute[]>([])
const loading = ref(false)
const busy = ref(false)
const search = ref('')
const saveName = ref('')
const message = ref('')
const messageIsError = ref(false)
const selectedSavedId = ref(props.savedRouteId ?? '')
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const selectedSaved = computed(() => savedRoutes.value.find((r) => String(r.stage_id) === selectedSavedId.value) ?? null)

const originLabel = computed(() =>
  props.originName
  || offices.value.find((o) => o.id === props.originOfficeId)?.name
  || 'Your office / organization')

const availableOffices = computed(() => {
  const q = search.value.trim().toLowerCase()
  const chosen = new Set(props.modelValue)
  return offices.value.filter((o) =>
    !chosen.has(o.id)
    && o.id !== props.originOfficeId
    && (!q || o.name.toLowerCase().includes(q) || String(o.code ?? '').toLowerCase().includes(q)))
})

function officeName(id: string) {
  return offices.value.find((o) => o.id === id)?.name ?? 'Office'
}

function setRoute(ids: string[]) {
  emit('update:modelValue', ids)
}

function addOffice(id: string) {
  if (props.modelValue.includes(id) || id === props.originOfficeId) return
  setRoute([...props.modelValue, id])
}

function removeAt(index: number) {
  setRoute(props.modelValue.filter((_, i) => i !== index))
}

function move(from: number, to: number) {
  if (to < 0 || to >= props.modelValue.length || from === to) return
  const next = [...props.modelValue]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  setRoute(next)
}

function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDrop(index: number) {
  if (dragIndex.value !== null) move(dragIndex.value, index)
  dragIndex.value = null
  dragOverIndex.value = null
}

function flash(text: string, isError = false) {
  message.value = text
  messageIsError.value = isError
}

function applySavedRoute() {
  emit('update:savedRouteId', selectedSavedId.value || null)
  const route = selectedSaved.value
  saveName.value = route?.name ?? ''
  message.value = ''
  if (!route) return
  if (!props.hideRoutingType) {
    emit('update:routingType', route.routing_type === 'RECURRING' && props.originOfficeId && recurringAvailable.value ? 'RECURRING' : 'STANDARD')
  }
  const ids = [...(route.workflow_items ?? [])]
    .sort((a, b) => a.step_number - b.step_number)
    .map((item) => String(item.office_id))
    .filter((id) => id !== props.originOfficeId)
  setRoute([...new Set(ids)])
}

const workflowItems = () => props.modelValue.map((officeId, i) => ({ office_id: officeId, step_number: i + 1 }))

async function saveAsNew() {
  busy.value = true
  try {
    const res: any = await $fetch('/api/stages', {
      method: 'POST',
      body: { stage_name: saveName.value.trim(), workflow_items: workflowItems(), routing_type: routingType.value },
    })
    await loadSavedRoutes()
    const newId = res?.data?.stage?.stage_id
    if (newId) {
      selectedSavedId.value = String(newId)
      emit('update:savedRouteId', String(newId))
    }
    flash('Route saved.')
  } catch (err: any) {
    flash(err?.data?.message || 'Could not save the route.', true)
  } finally {
    busy.value = false
  }
}

async function updateSaved() {
  if (!selectedSaved.value) return
  busy.value = true
  try {
    await $fetch('/api/stages', {
      method: 'PUT',
      body: { stage_id: selectedSaved.value.stage_id, name: saveName.value.trim(), office_ids: [...props.modelValue], routing_type: routingType.value },
    })
    await loadSavedRoutes()
    flash('Saved route updated. Existing documents keep their own route.')
  } catch (err: any) {
    flash(err?.data?.message || 'Could not update the route.', true)
  } finally {
    busy.value = false
  }
}

async function deleteSaved() {
  if (!selectedSaved.value) return
  if (!window.confirm(`Delete the saved route "${selectedSaved.value.name}"? Documents already using it keep their route.`)) return
  busy.value = true
  try {
    await $fetch('/api/stages', { method: 'DELETE', params: { stage_id: selectedSaved.value.stage_id } })
    selectedSavedId.value = ''
    saveName.value = ''
    emit('update:savedRouteId', null)
    await loadSavedRoutes()
    flash('Saved route deleted.')
  } catch (err: any) {
    flash(err?.data?.message || 'Could not delete the route.', true)
  } finally {
    busy.value = false
  }
}

async function loadSavedRoutes() {
  try {
    const res: any = await $fetch('/api/stages')
    savedRoutes.value = Array.isArray(res?.data) ? res.data : []
  } catch {
    savedRoutes.value = []
  }
}

async function loadOffices() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/office')
    offices.value = (Array.isArray(res?.data) ? res.data : [])
      // Destinations are real offices — not personal desks or client dispatch stations.
      .filter((o: OfficeOption) => !o.parent_office_id && !o.is_client_station)
      .map((o: OfficeOption) => ({ ...o, id: String(o.id) }))
      .sort((a: OfficeOption, b: OfficeOption) => a.name.localeCompare(b.name))
  } catch {
    offices.value = []
    flash('Could not load your organization\'s offices.', true)
  } finally {
    loading.value = false
  }
}

// The origin can never be a destination, even if it changes after offices were picked.
watch(() => props.originOfficeId, (origin) => {
  if (origin && props.modelValue.includes(origin)) setRoute(props.modelValue.filter((id) => id !== origin))
  // A recurring route returns to the origin office — impossible without one.
  if (!origin && routingType.value === 'RECURRING') emit('update:routingType', 'STANDARD')
})

onMounted(() => {
  void loadOffices()
  void loadSavedRoutes()
  if (!props.hideRoutingType) void loadRoutingFeatures()
})
</script>
