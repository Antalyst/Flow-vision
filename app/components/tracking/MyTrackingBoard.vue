<script setup>
// Personal, e-commerce-style "My Orders" view for documents — additive,
// does not touch the existing Dashboard. See docs/tracking-ux-improvement-plan.md Part 5.
const props = defineProps({
  fetchUrl: { type: String, required: true },
  // Where clicking "Track" navigates — reuses the existing documents list's
  // ?document=<id> deep link, which already opens DocumentPreviewDrawer.
  documentLinkBase: { type: String, required: true },
  uploadLinkBase: { type: String, required: true },
})

const { isDark } = useTheme()

const documents = ref([])
const loading = ref(false)
const error = ref(null)
const filter = ref('all')

const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

async function fetchDocuments() {
  loading.value = true
  error.value = null
  try {
    const res = await $fetch(props.fetchUrl, { credentials: 'include' })
    documents.value = res.data ?? []
  } catch (err) {
    error.value = err?.data?.message ?? err?.message ?? 'Failed to load your documents.'
    documents.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchDocuments)

// ── Ecommerce-style plain-language mapping (Part 4 of the plan) ─────────
const STEPS = [
  { key: 'CREATED', label: 'Registered' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'IN_TRANSIT', label: 'On the Way' },
  { key: 'ARRIVED_AT_OFFICE', label: 'Arrived' },
  { key: 'COMPLETED', label: 'Delivered' },
]

function stepIndex(trackingStatus) {
  const idx = STEPS.findIndex((s) => s.key === trackingStatus)
  return idx === -1 ? 0 : idx
}

function officeLabel(doc) {
  return doc.current_office_name || doc.current_label || 'the next office'
}

function statusLine(doc) {
  switch (doc.tracking_status) {
    case 'CREATED':               return 'Registered — waiting to be picked up'
    case 'PICKED_UP':             return 'Picked up — heading out'
    case 'IN_TRANSIT':            return `On the way to ${officeLabel(doc)}`
    case 'ARRIVED_AT_OFFICE':     return `Arrived at ${officeLabel(doc)} — awaiting review`
    case 'DISCREPANCY_REPORTED':  return 'Delivery problem reported'
    case 'COMPLETED':             return 'Delivered and approved'
    default:                      return 'Registered'
  }
}

function whatsNextLine(doc) {
  switch (doc.tracking_status) {
    case 'CREATED':               return 'Waiting for an office to assign a courier'
    case 'PICKED_UP':
    case 'IN_TRANSIT':            return 'In transit — nothing needed from you right now'
    case 'ARRIVED_AT_OFFICE':     return `Waiting for ${officeLabel(doc)} to review`
    case 'DISCREPANCY_REPORTED':  return 'An issue was reported — open it to see details'
    case 'COMPLETED':             return 'Nothing more to do — this document is complete'
    default:                      return ''
  }
}

function isOverdue(doc) {
  if (!doc.target_completion_date) return false
  if (doc.tracking_status === 'COMPLETED') return false
  return new Date(doc.target_completion_date).getTime() < Date.now()
}

function needsAttention(doc) {
  return doc.tracking_status === 'DISCREPANCY_REPORTED' || isOverdue(doc)
}

function shortId(id) {
  return `#${String(id || '').slice(0, 6).toUpperCase()}`
}

function fmtDate(v) {
  if (!v) return '-'
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(v))
}

// ── Filters ───────────────────────────────────────────────────────────
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'on_the_way', label: 'On the Way' },
  { value: 'attention', label: 'Needs My Attention' },
  { value: 'completed', label: 'Completed' },
]

const filteredDocuments = computed(() => {
  return documents.value.filter((doc) => {
    if (filter.value === 'on_the_way') {
      return ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_OFFICE'].includes(doc.tracking_status)
    }
    if (filter.value === 'attention') return needsAttention(doc)
    if (filter.value === 'completed') return doc.tracking_status === 'COMPLETED'
    return true
  })
})

const attentionCount = computed(() => documents.value.filter(needsAttention).length)
</script>

<template>
  <div class="space-y-5">
    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="f in FILTERS"
        :key="f.value"
        type="button"
        class="relative rounded-full px-4 py-2 text-sm font-semibold shadow-card transition-colors"
        :class="filter === f.value
          ? 'bg-candy-orange text-white'
          : isDark ? 'bg-onyx-card text-gray-300 hover:text-white' : 'bg-white-pure text-gray-600 hover:text-gray-900'"
        @click="filter = f.value"
      >
        {{ f.label }}
        <span
          v-if="f.value === 'attention' && attentionCount > 0"
          class="ml-1.5 rounded-full bg-danger px-1.5 py-0.5 text-[13px] font-bold text-white"
        >
          {{ attentionCount }}
        </span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="n in 3" :key="n" class="h-28 animate-pulse rounded-2xl" :class="isDark ? 'bg-onyx-card' : 'bg-gray-100'" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
      {{ error }}
    </div>

    <!-- Empty -->
    <div
      v-else-if="!filteredDocuments.length"
      class="rounded-2xl border p-16 text-center shadow-card"
      :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure'"
    >
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-candy-orange/10">
        <Icon name="ph:map-pin-line" class="h-8 w-8 text-candy-orange" />
      </div>
      <p class="font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
        {{ documents.length ? 'Nothing matches this filter.' : "You don't have any documents yet." }}
      </p>
      <p class="mt-1 text-xs" :class="mutedClass">
        {{ documents.length ? 'Try a different filter above.' : 'Once you register a document, you can track it here.' }}
      </p>
      <NuxtLink
        v-if="!documents.length"
        :to="uploadLinkBase"
        class="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-candy-hover"
      >
        <Icon name="ph:upload-simple-bold" class="h-4 w-4" />
        Upload a document
      </NuxtLink>
    </div>

    <!-- Cards -->
    <div v-else class="space-y-3">
      <div
        v-for="doc in filteredDocuments"
        :key="doc.id"
        class="rounded-2xl border p-5 shadow-card"
        :class="[
          isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure',
          needsAttention(doc) ? 'ring-1 ring-inset ring-danger/40' : '',
        ]"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[13px] font-semibold" :class="mutedClass">{{ shortId(doc.id) }} · {{ fmtDate(doc.created_at) }}</p>
            <p class="mt-0.5 font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ doc.title || 'Untitled document' }}</p>
          </div>
          <span
            v-if="needsAttention(doc)"
            class="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger"
          >
            <Icon name="ph:warning-fill" class="h-3.5 w-3.5" />
            {{ doc.tracking_status === 'DISCREPANCY_REPORTED' ? 'Issue Reported' : 'Overdue' }}
          </span>
        </div>

        <!-- Plain-language status line -->
        <p class="mt-3 text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
          {{ statusLine(doc) }}
        </p>

        <!-- Horizontal progress dots -->
        <div v-if="doc.tracking_status !== 'DISCREPANCY_REPORTED'" class="mt-3 flex items-center gap-1.5">
          <template v-for="(step, i) in STEPS" :key="step.key">
            <div
              class="h-2 flex-1 rounded-full transition-colors"
              :class="i <= stepIndex(doc.tracking_status)
                ? (doc.tracking_status === 'COMPLETED' ? 'bg-success' : 'bg-candy-orange')
                : isDark ? 'bg-white/10' : 'bg-gray-200'"
            />
          </template>
        </div>

        <!-- What's next -->
        <p class="mt-2 text-xs" :class="mutedClass">{{ whatsNextLine(doc) }}</p>

        <div class="mt-4 flex items-center justify-between">
          <span v-if="doc.priority" class="text-xs font-semibold" :class="mutedClass">Priority: {{ doc.priority }}</span>
          <span v-else />
          <NuxtLink
            :to="`${documentLinkBase}?document=${doc.id}`"
            class="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition hover:border-candy-orange hover:text-candy-orange"
            :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-700'"
          >
            Track
            <Icon name="ph:arrow-right" class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
