<template>
  <div class="flex h-full min-h-0 flex-col gap-5 pb-24 lg:pb-8">
    <!-- Header + view controller -->
    <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
          <Icon name="ph:squares-four-fill" class="h-4 w-4 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right" class="h-3 w-3" />
          <span class="font-medium" :class="headingClass">Working</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">
          Live Workspace
        </h1>
        <p class="mt-1 text-sm" :class="mutedClass">
          {{ viewScope === 'LOCAL'
            ? 'Documents at your station awaiting action, review, or hand-off.'
            : 'Organisation-wide pipeline — every active document across checkpoints.' }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Flat scope toggle (no glow / blur) -->
        <div
          class="flex items-center gap-0.5 rounded-lg border p-0.5"
          :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-white'"
        >
          <button
            v-for="opt in scopeOptions"
            :key="opt.value"
            type="button"
            class="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors duration-200"
            :class="viewScope === opt.value
              ? 'bg-candy-orange text-white'
              : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800')"
            @click="viewScope = opt.value"
          >
            <Icon :name="opt.icon" class="h-3.5 w-3.5" />
            {{ opt.label }}
          </button>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:border-candy-orange hover:text-candy-orange disabled:opacity-50"
          :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
          :disabled="loading"
          @click="refreshQueue(true)"
        >
          <Icon name="ph:arrows-clockwise" class="h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" />
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

    <!-- Pipeline summary strip -->
    <div
      class="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-xs"
      :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-white'"
    >
      <span class="font-bold uppercase tracking-widest text-candy-orange">Active</span>
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

    <!-- Kanban board -->
    <div
      v-if="loading && !allDocs.length"
      class="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div
        v-for="n in 4"
        :key="n"
        class="min-h-[320px] animate-pulse rounded-lg border"
        :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-white'"
      />
    </div>

    <div
      v-else
      class="grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <section
        v-for="col in pipelineColumns"
        :key="col.id"
        class="flex min-h-[280px] flex-col rounded-lg border"
        :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-white'"
      >
        <!-- Column header -->
        <div
          class="flex items-center justify-between border-b px-3 py-2.5"
          :class="isDark ? 'border-onyx-border' : 'border-gray-200'"
        >
          <div class="flex items-center gap-2 min-w-0">
            <Icon :name="col.icon" class="h-4 w-4 flex-none text-candy-orange" />
            <h2 class="truncate text-xs font-bold uppercase tracking-wider" :class="headingClass">
              {{ col.label }}
            </h2>
          </div>
          <span
            class="flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1.5 text-[10px] font-bold tabular-nums"
            :class="isDark ? 'bg-onyx-card text-gray-300' : 'bg-gray-100 text-gray-600'"
          >
            {{ columnDocs(col.id).length }}
          </span>
        </div>

        <!-- Token list -->
        <div class="flex-1 overflow-y-auto p-2">
          <TransitionGroup name="token-fade" tag="div" class="flex flex-col gap-1.5">
            <button
              v-for="doc in columnDocs(col.id)"
              :key="doc.id"
              type="button"
              class="group w-full rounded-md border px-2.5 py-2 text-left transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0"
              :class="[
                isDark
                  ? 'border-onyx-border bg-onyx-card hover:border-candy-orange/50'
                  : 'border-gray-200 bg-white-surface hover:border-candy-orange/40',
                activeDocument?.id === doc.id ? 'ring-1 ring-candy-orange' : '',
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
                  class="flex-none rounded border px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
                  :class="isDark ? 'border-onyx-border text-gray-400' : 'border-gray-200 text-gray-500'"
                >
                  Step {{ doc.current_step }}/{{ doc.total_steps }}
                </span>
              </div>
              <p class="mt-1 line-clamp-2 text-xs font-semibold leading-snug" :class="headingClass">
                {{ doc.title || 'Untitled' }}
              </p>
              <p
                v-if="viewScope === 'GLOBAL' && doc.current_label"
                class="mt-1 truncate text-[10px]"
                :class="mutedClass"
              >
                <Icon name="ph:map-pin-fill" class="mr-0.5 inline h-2.5 w-2.5" />
                {{ doc.current_label }}
              </p>
              <p
                v-else-if="doc.messenger_name"
                class="mt-1 truncate text-[10px] text-amber-600 dark:text-amber-400"
              >
                <Icon name="ph:motorcycle-fill" class="mr-0.5 inline h-2.5 w-2.5" />
                {{ doc.messenger_name }}
              </p>
            </button>
          </TransitionGroup>

          <div
            v-if="!columnDocs(col.id).length"
            class="flex flex-col items-center justify-center gap-2 px-3 py-10 text-center"
          >
            <Icon :name="col.icon" class="h-6 w-6 opacity-20" />
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
import DocumentPreviewDrawer, { type PreviewDocument } from '~/components/documents/DocumentPreviewDrawer.vue'
import DocumentIssueChatPanel from '~/components/employee/documents/DocumentIssueChatPanel.vue'
import { useEmployeeSettings } from '~/composables/useEmployeeSettings'

definePageMeta({ layout: 'employee' })

type ViewScope = 'LOCAL' | 'GLOBAL'
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

const scopeOptions = [
  { value: 'LOCAL' as ViewScope, label: 'Local Workspace', icon: 'ph:buildings-fill' },
  { value: 'GLOBAL' as ViewScope, label: 'Global Pipeline', icon: 'ph:globe-hemisphere-west-fill' },
]

const pipelineColumns = [
  { id: 'awaiting_pickup' as PipelinePhase, label: 'Awaiting Pickup', icon: 'ph:package-fill' },
  { id: 'in_transit' as PipelinePhase, label: 'In Transit', icon: 'ph:motorcycle-fill' },
  { id: 'under_review' as PipelinePhase, label: 'Under Review', icon: 'ph:clipboard-text-fill' },
  { id: 'verified' as PipelinePhase, label: 'Verified / Processing', icon: 'ph:check-square-fill' },
]

const viewScope = ref<ViewScope>('LOCAL')
const allDocs = ref<QueueDoc[]>([])
const myOffices = ref<OfficeRecord[]>([])
const myOfficeIds = computed(() => new Set(myOffices.value.map((o) => String(o.id))))
const loading = ref(false)
const lastSyncedAt = ref<Date | null>(null)
const activeDocument = ref<QueueDoc | null>(null)
const issueChatRef = ref<InstanceType<typeof DocumentIssueChatPanel> | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null

const headingClass = computed(() => (isDark.value ? 'text-white' : 'text-gray-900'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

const lastSyncedLabel = computed(() => {
  if (!lastSyncedAt.value) return ''
  return `Synced ${lastSyncedAt.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
})

function classifyPhase(doc: QueueDoc): PipelinePhase {
  const status = doc.tracking_status ?? 'CREATED'
  if (status === 'IN_TRANSIT') return 'in_transit'
  if (status === 'ARRIVED_AT_OFFICE') {
    const step = doc.current_step ?? 0
    if ((doc.checkpoint_cleared_step ?? null) === step) return 'verified'
    return 'under_review'
  }
  if (status === 'COMPLETED') return 'verified'
  return 'awaiting_pickup'
}

const visibleDocs = computed(() => {
  if (viewScope.value === 'GLOBAL') return allDocs.value
  const ids = myOfficeIds.value
  return allDocs.value.filter((doc) => {
    const current = doc.current_office_id ? String(doc.current_office_id) : ''
    if (current && ids.has(current)) return true
    if (doc.tracking_status === 'CREATED') {
      const origin = doc.origin_office_id ? String(doc.origin_office_id) : ''
      if (origin && ids.has(origin)) return true
    }
    return false
  })
})

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
  const orgId = auth.user?.org_id
  if (!orgId) return
  if (!silent) loading.value = true
  try {
    const res = await $fetch<{
      success: boolean
      data: QueueDoc[]
    }>('/api/tracking/queue', {
      params: { orgId, scope: 'GLOBAL', status: ACTIVE_STATUSES, limit: 300 },
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

function handleDocUpdated(payload: {
  tracking_status: string
  issueClosed?: boolean
  status?: string
  checkpoint_cleared_step?: number | null
}) {
  const id = activeDocument.value?.id
  if (!id) return

  const patch = (doc: QueueDoc): QueueDoc => ({
    ...doc,
    tracking_status: payload.tracking_status,
    ...(payload.status ? { status: payload.status } : {}),
    ...(payload.checkpoint_cleared_step != null
      ? { checkpoint_cleared_step: payload.checkpoint_cleared_step }
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

watch(settingsReady, (ready) => {
  if (ready) viewScope.value = defaultPipelineView.value
})

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  hydrateSettings()
  if (settingsReady.value) {
    viewScope.value = defaultPipelineView.value
  }
  await Promise.all([fetchMyOffices(), stageStore.fetchStages(), refreshQueue()])
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
