<template>
  <div ref="pageRoot" class="flex h-full min-h-0 flex-col gap-5 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <header ref="headerEl" class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedClass">
          <Icon name="ph:briefcase-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="headingClass">Current Working</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="headingClass">
          Current Working
        </h1>
        <p class="mt-1.5 text-sm" :class="mutedClass">
          Documents on your desk right now — {{ lastSyncedAt ? `updated ${lastSyncedLabel}` : 'updating…' }}.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors hover:border-candy-orange hover:text-candy-orange disabled:opacity-50"
          :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
          :disabled="loading"
          @click="refreshQueue(true)"
        >
          <Icon name="ph:arrows-clockwise-light" class="h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" />
          Sync
        </button>
      </div>
    </header>

    <!-- ── Inbound Dispatch Banner (Realtime ASN Alert) ───────────────── -->
    <Transition name="token-fade">
      <div
        v-if="latestDispatch"
        class="flex items-center justify-between gap-4 rounded-xl border border-candy-orange/30 bg-candy-orange/10 px-5 py-3 text-xs text-gray-200"
      >
        <div class="flex items-center gap-3">
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-candy-orange/20 text-candy-orange">
            <Icon name="ph:motorcycle-fill" class="h-4 w-4 animate-bounce" />
          </span>
          <div>
            <span class="font-bold text-candy-orange uppercase tracking-wider text-xs">Incoming Delivery:</span>
            <span class="ml-1.5 font-semibold">"{{ latestDispatch.document_title || 'Document' }}"</span>
            <span class="ml-1 text-gray-300/80">is in transit{{ latestDispatch.target_office_name ? ` to ${latestDispatch.target_office_name}` : '' }} (Courier: {{ latestDispatch.messenger_name || 'Courier' }})</span>
          </div>
        </div>
        <button
          type="button"
          class="text-candy-orange hover:text-white"
          @click="latestDispatch = null"
        >
          <Icon name="ph:x-bold" class="h-3.5 w-3.5" />
        </button>
      </div>
    </Transition>

    <!-- ── KPI Stat Cards ─────────────────────────────────────────────── -->
    <div ref="stripEl" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div
        v-for="col in pipelineColumns"
        :key="col.id"
        class="flex flex-col gap-4 rounded-card border p-5 shadow-card"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure'"
      >
        <div class="flex items-center gap-3">
          <Icon :name="col.icon" class="h-6 w-6 flex-none" :class="phaseAccent(col.id).text" />
          <span class="text-3xl font-bold tabular-nums" :class="headingClass">{{ columnDocs(col.id).length }}</span>
        </div>
        <p class="text-sm font-medium" :class="mutedClass">{{ col.label }}</p>
      </div>
    </div>

    <!-- ── Kanban Board ───────────────────────────────────────────────── -->
    <div
      v-if="loading && !allDocs.length"
      class="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div
        v-for="n in 4"
        :key="n"
        class="min-h-[280px] animate-pulse rounded-xl border"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure'"
      />
    </div>

    <div
      v-else
      ref="boardEl"
      class="grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <section
        v-for="col in pipelineColumns"
        :key="col.id"
        class="flex min-h-[200px] flex-col gap-3"
      >
        <!-- Column header pill -->
        <div
          class="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5"
          :class="isDark ? 'bg-white/[0.06]' : 'bg-gray-100'"
        >
          <div class="flex items-center gap-2 min-w-0">
            <Icon :name="col.icon" class="h-5 w-5 flex-none" :class="phaseAccent(col.id).text" />
            <h2 class="truncate text-sm font-semibold" :class="headingClass">
              {{ col.label }}
            </h2>
          </div>
          <span class="flex-none text-sm font-semibold tabular-nums" :class="mutedClass">
            {{ columnDocs(col.id).length }}
          </span>
        </div>

        <!-- Token list -->
        <div class="overflow-y-auto pr-1 sm:h-[calc(100vh-25rem)]">
          <TransitionGroup name="token-fade" tag="div" class="flex flex-col gap-3">
            <button
              v-for="doc in columnDocs(col.id)"
              :key="doc.id"
              type="button"
              class="group relative block w-full overflow-hidden rounded-xl border py-3.5 pl-5 pr-4 text-left shadow-card transition-colors duration-200"
              :class="[
                isDark
                  ? 'border-onyx-border bg-onyx-card hover:border-candy-orange/50'
                  : 'border-gray-200 bg-white-pure hover:border-candy-orange/50',
                activeDocument?.id === doc.id ? 'border-candy-orange' : '',
              ]"
              @click="openDocument(doc)"
            >
              <span class="absolute inset-y-0 left-0 w-1" :class="phaseAccent(col.id).bar" />

              <p class="line-clamp-2 text-sm font-semibold leading-snug" :class="headingClass">
                {{ doc.title || 'Untitled' }}
              </p>

              <div class="mt-2.5 flex items-center gap-1.5">
                <span
                  v-for="n in 3"
                  :key="n"
                  class="h-2 w-2 rounded-full"
                  :class="n <= (col.id === 'verified' ? 3 : 1) ? phaseAccent(col.id).bar : (isDark ? 'bg-white/10' : 'bg-gray-200')"
                />
              </div>

              <p class="mt-2.5 flex items-center gap-1.5 truncate text-xs" :class="mutedClass">
                <Icon name="ph:user-light" class="h-3.5 w-3.5 flex-none" />
                {{ personLabel(doc, col.id) }}
              </p>
            </button>
          </TransitionGroup>

          <div
            v-if="!columnDocs(col.id).length"
            class="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-10 text-center"
            :class="isDark ? 'border-onyx-border' : 'border-gray-200'"
          >
            <Icon :name="col.icon" class="h-6 w-6 opacity-15" />
            <p class="text-xs font-medium" :class="mutedClass">No documents</p>
          </div>
        </div>
      </section>
    </div>

    <!-- Detail drawer -->
    <DocumentPreviewDrawer
      :is-open="!!activeDocument"
      :document="activeDocument"
      show-compliance-actions
      show-completion-actions
      pipeline-messaging-enabled
      :messaging-offices="myOffices"
      width-class="lg:w-[60%] lg:max-w-4xl"
      :office-resolver="resolveOfficeName"
      @close="closeDocument"
      @flag-issue="issueChatRef?.openReportForm()"
      @compliance-updated="handleDocUpdated"
    >
      <template #footer>
        <DocumentIssueChatPanel
          v-if="activeDocument"
          ref="issueChatRef"
          :document="activeDocument"
          :offices="myOffices"
          @updated="handleDocUpdated"
        />
      </template>
    </DocumentPreviewDrawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useStageStore } from '~/stores/stage'
import { gsap } from 'gsap'
import DocumentPreviewDrawer, { type PreviewDocument } from '~/components/documents/DocumentPreviewDrawer.vue'
import DocumentIssueChatPanel from '~/components/employee/documents/DocumentIssueChatPanel.vue'
import { useEmployeeSettings } from '~/composables/useEmployeeSettings'
import { useInboundDispatchRealtime, type InboundDispatchPayload } from '~/composables/useInboundDispatchRealtime'

definePageMeta({ layout: 'employee' })


type PipelinePhase = 'awaiting_pickup' | 'in_transit' | 'under_review' | 'verified'

interface QueueDoc extends PreviewDocument {
  current_step: number
  total_steps: number
  stage_name: string | null
  messenger_name: string | null
  office_label: string | null
  origin_label: string | null
  current_label: string | null
  is_own_upload: boolean
  checkpoint_cleared_step?: number | null
}

interface OfficeRecord { id: string; name: string; code?: string }

const ACTIVE_STATUSES = 'CREATED,PICKED_UP,IN_TRANSIT,ARRIVED_AT_OFFICE'

const auth = useAuthStore()
const stageStore = useStageStore()
const route = useRoute()
const router = useRouter()
const { isDark } = useTheme()
const {
  defaultPipelineView,
  workingBoardPollIntervalMs,
  hydrate: hydrateSettings,
  ready: settingsReady,
} = useEmployeeSettings()

const pipelineColumns = [
  { id: 'awaiting_pickup' as PipelinePhase, label: 'Awaiting Pickup', icon: 'ph:package-light' },
  { id: 'in_transit' as PipelinePhase, label: 'On the Way', icon: 'ph:motorcycle-light' },
  { id: 'under_review' as PipelinePhase, label: 'Under Review', icon: 'ph:clipboard-text-light' },
  { id: 'verified' as PipelinePhase, label: 'Verified / Processing', icon: 'ph:check-square-light' },
]

const allDocs = ref<QueueDoc[]>([])
const myOffices = ref<OfficeRecord[]>([])
const myOfficeIds = computed(() => new Set(myOffices.value.map((o) => String(o.id))))
const loading = ref(false)
const lastSyncedAt = ref<Date | null>(null)
const activeDocument = ref<QueueDoc | null>(null)
const issueChatRef = ref<InstanceType<typeof DocumentIssueChatPanel> | null>(null)

// ── Inbound Dispatch Realtime Subscription (ASN) ───────────────────────────
const orgIdComputed = computed(() => (auth.user?.org_id ? String(auth.user.org_id) : null))
const { latestDispatch } = useInboundDispatchRealtime(orgIdComputed, myOfficeIds, (dispatch) => {
  console.log('[Working] Inbound dispatch alert received via Realtime:', dispatch)
  refreshQueue(true)
})

// GSAP refs
const pageRoot = ref<HTMLElement | null>(null)
const headerEl = ref<HTMLElement | null>(null)
const stripEl  = ref<HTMLElement | null>(null)
const boardEl  = ref<HTMLElement | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null

const headingClass = computed(() => (isDark.value ? 'text-white' : 'text-gray-900'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

const lastSyncedLabel = computed(() => {
  if (!lastSyncedAt.value) return ''
  return lastSyncedAt.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

function classifyPhase(doc: QueueDoc): PipelinePhase {
  const status = doc.tracking_status ?? 'CREATED'
  
  if (status === 'COMPLETED') return 'verified'
  if (status === 'PICKED_UP' || status === 'IN_TRANSIT') return 'in_transit'
  
  if (status === 'ARRIVED_AT_OFFICE') {
    const step = doc.current_step ?? 0
    // If the document has cleared the checkpoint for its current step (or beyond)
    if (doc.checkpoint_cleared_step != null && doc.checkpoint_cleared_step >= step) {
      return 'verified'
    }
    return 'under_review'
  }
  
  // Fallback for CREATED or other unmapped statuses
  return 'awaiting_pickup'
}

const visibleDocs = computed(() => allDocs.value)

const columnDocs = (phase: PipelinePhase) =>
  visibleDocs.value.filter((doc) => classifyPhase(doc) === phase)

// Shopee-style tiering: pending work reads amber, anything moving/under review
// reads brand orange, and only a fully verified document reads green.
const PHASE_ACCENT: Record<PipelinePhase, { text: string; bar: string }> = {
  awaiting_pickup: { text: 'text-warning', bar: 'bg-warning' },
  in_transit: { text: 'text-candy-orange', bar: 'bg-candy-orange' },
  under_review: { text: 'text-candy-orange', bar: 'bg-candy-orange' },
  verified: { text: 'text-success', bar: 'bg-success' },
}
const phaseAccent = (phase: PipelinePhase) => PHASE_ACCENT[phase]

function personLabel(doc: QueueDoc, phase: PipelinePhase): string {
  if (phase === 'verified') return 'Completed'
  if (doc.messenger_name) return doc.messenger_name
  if (phase === 'under_review') return doc.current_label || doc.office_label || 'At office review desk'
  if (phase === 'in_transit') return 'Courier en route'
  return 'Not yet assigned'
}

const resolveOfficeName = (officeId: string | number | null | undefined) => {
  if (officeId == null) return 'Unassigned'
  const found = myOffices.value.find((o) => String(o.id) === String(officeId))
  return found?.name ?? `Office ${String(officeId).slice(0, 6)}`
}

async function fetchMyOffices() {
  const orgId = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return
  try {
    const res = await $fetch<{ success: boolean; data: OfficeRecord[] }>('/api/employee/my-offices', {
      params: { orgId, userId },
    })
    myOffices.value = res.data ?? []
  } catch { /* silent */ }
}

async function refreshQueue(silent = false) {
  if (!silent) loading.value = true
  try {
    const res = await $fetch<{
      success: boolean
      data: QueueDoc[]
    }>('/api/tracking/queue', {
      params: { limit: 300 },
    })
    allDocs.value = res.data ?? []
    lastSyncedAt.value = new Date()
    syncActiveDocument()
  } catch (err) {
    console.error('[Working] queue fetch error:', err)
  } finally {
    loading.value = false
  }
}

function syncActiveDocument() {
  if (!activeDocument.value) return
  const fresh = allDocs.value.find((d) => d.id === activeDocument.value!.id)
  if (fresh) activeDocument.value = fresh
}

function openDocument(doc: QueueDoc) {
  activeDocument.value = doc
  router.replace({ query: { ...route.query, document: doc.id } })
}

function closeDocument() {
  activeDocument.value = null
  const query = { ...route.query }
  delete query.document
  router.replace({ query })
}

async function openDocumentFromQuery() {
  const documentId = String(route.query.document ?? '').trim()
  if (!documentId) return

  const existing = allDocs.value.find((d) => String(d.id) === documentId)
  if (existing) {
    activeDocument.value = existing
    return
  }

  if (!allDocs.value.length) await refreshQueue(true)
  const match = allDocs.value.find((d) => String(d.id) === documentId)
  if (match) {
    activeDocument.value = match
    return
  }

  // Not in the default queue window (e.g. an older/completed document pushed out
  // by the row limit) — resolve it directly by id instead of silently giving up.
  try {
    const res = await $fetch<{ success: boolean; data: QueueDoc[] }>('/api/tracking/queue', {
      params: { id: documentId, limit: 1 },
    })
    const direct = res.data?.[0]
    if (direct) activeDocument.value = direct
  } catch (err) {
    console.error('[Working] direct document fetch error:', err)
  }
}

function handleDocUpdated(data: {
  tracking_status: string
  issueClosed?: boolean
  status?: string
  checkpoint_cleared_step?: number | null
}) {
  const id = activeDocument.value?.id
  if (!id) return

  const patch = (doc: QueueDoc): QueueDoc => ({
    ...doc,
    tracking_status: data.tracking_status,
    ...(data.status ? { status: data.status } : {}),
    ...(data.checkpoint_cleared_step != null
      ? { checkpoint_cleared_step: data.checkpoint_cleared_step }
      : {}),
  })

  const idx = allDocs.value.findIndex((d) => d.id === id)
  if (idx !== -1) allDocs.value[idx] = patch(allDocs.value[idx])
  if (activeDocument.value?.id === id) activeDocument.value = patch(activeDocument.value)
}

watch(() => route.query.document, async () => {
  if (route.query.document) await openDocumentFromQuery()
  else activeDocument.value = null
})

function restartPollTimer() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(() => refreshQueue(true), workingBoardPollIntervalMs.value)
}

watch(workingBoardPollIntervalMs, () => {
  if (import.meta.client) restartPollTimer()
})



// ── GSAP Entrance ──────────────────────────────────────────────────────
const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) {
    tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  }
  if (stripEl.value) {
    tl.fromTo(stripEl.value, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, 0.15)
  }
}

const animateBoard = () => {
  if (!boardEl.value) return
  const cols = boardEl.value.querySelectorAll(':scope > section')
  gsap.fromTo(cols,
    { opacity: 0, x: -20 },
    { opacity: 1, x: 0, duration: 0.45, stagger: 0.08, ease: 'power3.out' }
  )
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  hydrateSettings()

  runEntranceAnimation()
  await Promise.all([fetchMyOffices(), stageStore.fetchStages(), refreshQueue()])
  animateBoard()
  await openDocumentFromQuery()
  restartPollTimer()
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.token-fade-enter-active,
.token-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.token-fade-enter-from,
.token-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
.token-fade-move {
  transition: transform 0.2s ease;
}
</style>
