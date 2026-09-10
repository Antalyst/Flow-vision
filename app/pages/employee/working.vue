<template>
  <div ref="pageRoot" class="flex h-full min-h-0 flex-col gap-5 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <header ref="headerEl" class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedClass">
          <Icon name="ph:briefcase-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="headingClass">Live Workspace</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="headingClass">
          Live Workspace
        </h1>
        <p class="mt-1.5 text-sm" :class="mutedClass">
          Documents at your station awaiting action, review, or hand-off.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">


        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-none border px-3.5 py-2 text-xs font-semibold transition-colors hover:border-candy-orange hover:text-candy-orange disabled:opacity-50"
          :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
          :disabled="loading"
          @click="refreshQueue(true)"
        >
          <Icon name="ph:arrows-clockwise-light" class="h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" />
          Sync
        </button>

        <span
          v-if="lastSyncedAt"
          class="text-[10px] font-medium tabular-nums"
          :class="mutedClass"
        >
          {{ lastSyncedLabel }}
        </span>
      </div>
    </header>

    <!-- ── Inbound Dispatch Banner (Realtime ASN Alert) ───────────────── -->
    <Transition name="token-fade">
      <div
        v-if="latestDispatch"
        class="flex items-center justify-between gap-4 rounded-none border border-sky-500/30 bg-sky-950/40 px-5 py-3 text-xs text-sky-200"
      >
        <div class="flex items-center gap-3">
          <span class="flex h-7 w-7 items-center justify-center rounded-none bg-sky-500/20 text-sky-400">
            <Icon name="ph:motorcycle-fill" class="h-4 w-4 animate-bounce" />
          </span>
          <div>
            <span class="font-bold text-sky-400 uppercase tracking-wider text-[10px]">Inbound Dispatch Alert:</span>
            <span class="ml-1.5 font-semibold">"{{ latestDispatch.document_title || 'Document' }}"</span>
            <span class="ml-1 text-sky-300/80">is in transit{{ latestDispatch.target_office_name ? ` to ${latestDispatch.target_office_name}` : '' }} (Courier: {{ latestDispatch.messenger_name || 'Courier' }})</span>
          </div>
        </div>
        <button
          type="button"
          class="text-sky-400 hover:text-white"
          @click="latestDispatch = null"
        >
          <Icon name="ph:x-bold" class="h-3.5 w-3.5" />
        </button>
      </div>
    </Transition>

    <!-- ── Pipeline Summary Strip ─────────────────────────────────────── -->
    <div
      ref="stripEl"
      class="flex flex-wrap items-center gap-4 rounded-none border px-5 py-3.5 text-xs"
      :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
    >
      <div class="flex items-center gap-2">
        <span class="h-2 w-2 animate-pulse rounded-none bg-candy-orange" />
        <span class="font-bold uppercase tracking-widest text-candy-orange text-[10px]">Active Pipeline</span>
      </div>
      <span class="hidden h-3 w-px sm:inline" :class="isDark ? 'bg-onyx-border' : 'bg-gray-200'" />
      <span :class="mutedClass">{{ visibleDocs.length }} documents</span>
      <span class="hidden h-3 w-px sm:inline" :class="isDark ? 'bg-onyx-border' : 'bg-gray-200'" />
      <span
        v-for="col in pipelineColumns"
        :key="col.id"
        class="inline-flex items-center gap-1.5"
        :class="mutedClass"
      >
        <Icon :name="col.icon" class="h-3 w-3" />
        {{ col.label }}: <strong :class="headingClass">{{ columnDocs(col.id).length }}</strong>
      </span>
    </div>

    <!-- ── Kanban Board ───────────────────────────────────────────────── -->
    <div
      v-if="loading && !allDocs.length"
      class="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div
        v-for="n in 4"
        :key="n"
        class="min-h-[320px] animate-pulse rounded-none border"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
      />
    </div>

    <div
      v-else
      ref="boardEl"
      class="grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <section
        v-for="(col, colIdx) in pipelineColumns"
        :key="col.id"
        class="flex min-h-[280px] flex-col rounded-none border overflow-hidden transition-all duration-200"
        :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-white'"
      >
        <!-- Column accent strip -->
        <div
          class="h-0.5 w-full"
          :class="colIdx === 0 ? 'bg-candy-orange' : colIdx === 1 ? 'bg-blue-500' : colIdx === 2 ? 'bg-amber-500' : 'bg-emerald-500'"
        />
        <!-- Column header -->
        <div
          class="flex items-center justify-between border-b px-4 py-3"
          :class="isDark ? 'border-onyx-border' : 'border-gray-100'"
        >
          <div class="flex items-center gap-2 min-w-0">
            <Icon
              :name="col.icon"
              class="h-3.5 w-3.5 flex-none"
              :class="colIdx === 0 ? 'text-candy-orange' : colIdx === 1 ? 'text-blue-500' : colIdx === 2 ? 'text-amber-500' : 'text-emerald-500'"
            />
            <h2 class="truncate text-xs font-bold uppercase tracking-wider" :class="headingClass">
              {{ col.label }}
            </h2>
          </div>
          <span
            class="flex h-5 min-w-[1.25rem] items-center justify-center rounded-none px-1.5 text-[10px] font-bold tabular-nums border"
            :class="isDark ? 'border-onyx-border bg-white/5 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'"
          >
            {{ columnDocs(col.id).length }}
          </span>
        </div>

        <!-- Token list -->
        <div class="flex-1 overflow-y-auto p-2.5">
          <TransitionGroup name="token-fade" tag="div" class="flex flex-col gap-2">
            <button
              v-for="doc in columnDocs(col.id)"
              :key="doc.id"
              type="button"
              class="group w-full rounded-none border px-3 py-2.5 text-left transition-colors duration-200"
              :class="[
                isDark
                  ? 'border-onyx-border bg-onyx-card hover:border-candy-orange'
                  : 'border-gray-200 bg-white hover:border-candy-orange',
                activeDocument?.id === doc.id ? 'border-candy-orange' : '',
              ]"
              @click="openDocument(doc)"
            >
              <div class="flex items-start justify-between gap-2">
                <span
                  class="font-mono text-[10px] font-bold uppercase tracking-wide text-candy-orange"
                >
                  {{ truncateId(doc.id) }}
                </span>
                <span
                  v-if="doc.total_steps"
                  class="flex-none rounded-none border px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
                  :class="isDark ? 'border-onyx-border text-gray-400' : 'border-gray-200 text-gray-500'"
                >
                  Step {{ doc.current_step }}/{{ doc.total_steps }}
                </span>
              </div>
              <p class="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug" :class="headingClass">
                {{ doc.title || 'Untitled' }}
              </p>

              <p
                v-if="doc.messenger_name"
                class="mt-1.5 truncate text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1"
              >
                <Icon name="ph:motorcycle-light" class="inline h-2.5 w-2.5 flex-none" />
                {{ doc.messenger_name }}
              </p>
            </button>
          </TransitionGroup>

          <div
            v-if="!columnDocs(col.id).length"
            class="flex flex-col items-center justify-center gap-2 px-3 py-12 text-center"
          >
            <Icon :name="col.icon" class="h-6 w-6 opacity-15" />
            <p class="text-[10px] font-medium" :class="mutedClass">No documents</p>
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
  { id: 'in_transit' as PipelinePhase, label: 'In Transit', icon: 'ph:motorcycle-light' },
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
  return `Synced ${lastSyncedAt.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
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

const truncateId = (id: string) => String(id).replace(/-/g, '').slice(0, 8).toUpperCase()

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
  if (match) activeDocument.value = match
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
