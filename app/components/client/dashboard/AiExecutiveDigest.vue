<template>
  <div class="flex h-full min-h-0 w-full flex-col gap-5">
    <!-- Clickable KPI strip: click any figure to see the documents behind it, right here in the drawer. Always full-width so cards never squeeze. -->
    <div v-if="!loading && !error" class="grid flex-none grid-cols-2 gap-3 sm:grid-cols-4">
      <button
        v-for="stat in digestStats"
        :key="stat.key"
        type="button"
        class="group flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all hover:border-candy-orange/40 hover:shadow-card-hover"
        :class="[
          isDark ? 'bg-onyx-black/40' : 'bg-gray-50',
          activeStat === stat.key ? 'border-candy-orange bg-candy-orange/5' : (isDark ? 'border-onyx-border' : 'border-gray-200'),
        ]"
        @click="selectStat(stat.key)"
      >
        <span class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider" :class="isDark ? 'text-white-muted' : 'text-gray-500'">
            {{ stat.label }}
          </span>
          <Icon
            name="ph:arrow-up-right-bold"
            class="h-3 w-3 transition-opacity group-hover:opacity-100 group-hover:text-candy-orange"
            :class="activeStat === stat.key ? 'opacity-100 text-candy-orange' : 'opacity-0 text-gray-400'"
          />
        </span>
        <span class="text-xl font-extrabold tracking-tight" :class="isDark ? 'text-white-pure' : 'text-gray-900'">
          {{ stat.value }}
        </span>
      </button>
    </div>

    <div class="flex min-h-0 flex-1 gap-5">
      <!-- Narrative column -->
      <div class="min-w-0 flex-1 overflow-y-auto pr-1" :class="{ 'hidden lg:block': activeStat }">
        <div v-if="loading" class="flex flex-col gap-8">
          <div class="flex items-center gap-2.5 text-sm font-medium text-candy-orange">
            <Icon name="ph:sparkle-fill" class="h-4 w-4 animate-pulse" />
            Analyzing your dashboard…
          </div>
          <div class="animate-pulse space-y-6">
            <div class="space-y-3">
              <div class="h-4 w-1/3 rounded-md" :class="skeletonClass"></div>
              <div class="h-3 w-full rounded-md" :class="skeletonClass"></div>
              <div class="h-3 w-5/6 rounded-md" :class="skeletonClass"></div>
              <div class="h-3 w-4/6 rounded-md" :class="skeletonClass"></div>
            </div>
            <div class="space-y-3">
              <div class="h-4 w-1/4 rounded-md" :class="skeletonClass"></div>
              <div class="h-3 w-full rounded-md" :class="skeletonClass"></div>
              <div class="h-3 w-3/6 rounded-md" :class="skeletonClass"></div>
            </div>
          </div>
        </div>

        <div v-else-if="error" class="flex flex-col items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-500 dark:text-red-300">
          <div class="flex items-center gap-2 font-semibold text-red-600 dark:text-red-200">
            <Icon name="ph:warning-circle-fill" class="h-4.5 w-4.5" />
            Couldn't generate the digest
          </div>
          <p>{{ error }}</p>
          <button
            type="button"
            class="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-200 transition hover:bg-red-500/10"
            @click="fetchDigest"
          >
            <Icon name="ph:arrow-clockwise-bold" class="h-3.5 w-3.5" />
            Try again
          </button>
        </div>

        <div
          v-else
          class="ai-digest max-w-none text-[17px] leading-[1.75]"
          :class="{ 'is-dark': isDark }"
          v-html="formattedNarrative"
          @click="handleDigestClick"
        ></div>
      </div>

      <!-- Drill-down panel: the documents behind whichever figure was clicked -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 w-0"
        enter-to-class="opacity-100 w-full"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 w-full"
        leave-to-class="opacity-0 w-0"
      >
        <aside
        v-if="activeStat"
        class="flex w-full flex-1 flex-col overflow-hidden rounded-2xl border"
        :class="isDark ? 'border-onyx-border bg-onyx-black/60' : 'border-gray-200 bg-gray-50'"
      >
        <div class="flex flex-none items-center justify-between border-b px-6 py-4" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
          <div class="min-w-0">
            <button
              v-if="selectedDocId"
              type="button"
              class="mb-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-candy-orange"
              @click="closeDocDetail"
            >
              <Icon name="ph:arrow-left-bold" class="h-3 w-3" />
              Back to list
            </button>
            <h3 class="truncate text-base font-bold" :class="isDark ? 'text-white-pure' : 'text-gray-900'">
              {{ selectedDocId ? (selectedDocTitle || 'Document') : statLabel(activeStat) }}
            </h3>
            <p v-if="!selectedDocId" class="text-xs" :class="isDark ? 'text-white-muted' : 'text-gray-500'">
              {{ panelLoading ? 'Loading…' : `${panelDocs.length} document${panelDocs.length === 1 ? '' : 's'}` }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 transition-colors"
            :class="isDark ? 'text-white-muted hover:bg-onyx-black hover:text-white-pure' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'"
            @click="closePanel"
          >
            <Icon name="ph:x-bold" class="h-4 w-4" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5">
          <!-- List mode -->
          <template v-if="!selectedDocId">
            <div v-if="panelLoading" class="space-y-2">
              <div v-for="n in 6" :key="n" class="flex items-center gap-4 rounded-xl p-3.5" :class="isDark ? 'bg-onyx-card' : 'bg-white'">
                <div class="h-10 w-10 flex-none animate-pulse rounded-full" :class="skeletonClass"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-3 w-1/3 animate-pulse rounded-md" :class="skeletonClass"></div>
                  <div class="h-2.5 w-1/5 animate-pulse rounded-md" :class="skeletonClass"></div>
                </div>
              </div>
            </div>

            <div v-else-if="panelDocs.length" class="space-y-2">
              <button
                v-for="doc in panelDocs"
                :key="doc.id"
                type="button"
                class="flex w-full items-center gap-4 rounded-xl border p-3.5 text-left transition-all"
                :class="isDark
                  ? 'border-onyx-border bg-onyx-card hover:border-candy-orange/40 hover:shadow-card-hover'
                  : 'border-gray-200 bg-white hover:border-candy-orange/40 hover:shadow-card-hover'"
                @click="openDocDetail(doc)"
              >
                <span class="flex h-10 w-10 flex-none items-center justify-center rounded-full" :class="statusIconBg(doc.tracking_status)">
                  <Icon :name="STATUS_ICONS[doc.tracking_status] ?? 'ph:file'" class="h-4 w-4" :class="statusIconColor(doc.tracking_status)" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold" :class="isDark ? 'text-gray-100' : 'text-gray-900'">
                    {{ doc.title || 'Untitled Document' }}
                  </p>
                  <p class="mt-0.5 text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
                    {{ formatDate(doc.created_at) }}
                  </p>
                </div>
                <span
                  class="flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  :class="[statusIconBg(doc.tracking_status), statusIconColor(doc.tracking_status)]"
                >
                  {{ STATUS_LABELS[doc.tracking_status] ?? doc.tracking_status }}
                </span>
                <Icon name="ph:caret-right-bold" class="h-3.5 w-3.5 flex-none text-gray-400" />
              </button>
            </div>

            <div v-else class="flex flex-col items-center gap-2 py-16 text-center">
              <Icon name="ph:package-fill" class="h-8 w-8 text-gray-300" />
              <p class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">No documents match this figure.</p>
            </div>
          </template>

          <!-- Detail mode -->
          <template v-else>
            <div v-if="timelineLoading" class="space-y-3">
              <div v-for="n in 3" :key="n" class="flex items-center gap-3">
                <div class="h-8 w-8 animate-pulse rounded-full" :class="skeletonClass"></div>
                <div class="flex-1 space-y-1.5">
                  <div class="h-3 w-28 animate-pulse rounded-md" :class="skeletonClass"></div>
                  <div class="h-2.5 w-20 animate-pulse rounded-md" :class="skeletonClass"></div>
                </div>
              </div>
            </div>
            <DocumentTimeline
              v-else-if="timelineData"
              :events="timelineData.events"
              :route-steps="timelineData.routeSteps"
              :summary="timelineData.summary"
            />
          </template>
        </div>
      </aside>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import DocumentTimeline from '~/components/client/tracking/DocumentTimeline.vue'

type StatKey = 'total' | 'active' | 'speed' | 'sla'

interface PanelDoc {
  id: string
  title: string | null
  tracking_status: string
  status: string | null
  created_at: string
  current_office_id: string | null
}

const props = defineProps<{
  metrics: Record<string, any> | null
  officeName?: string
  officeId?: string | null
}>()

const emit = defineEmits<{ (e: 'panel-open', value: boolean): void }>()

const { isDark } = useTheme()

const loading = ref(false)
const error = ref<string | null>(null)
const narrative = ref<string>('')

const skeletonClass = computed(() => (isDark.value ? 'bg-onyx-border' : 'bg-gray-200'))

// ── Status vocabulary shared with the Live Tracking page's 3-tier palette ──
const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Registered',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_OFFICE: 'Arrived',
  COMPLETED: 'Completed',
}
const STATUS_ICONS: Record<string, string> = {
  CREATED: 'ph:file-plus-fill',
  PICKED_UP: 'ph:hand-fill',
  IN_TRANSIT: 'ph:motorcycle-fill',
  ARRIVED_AT_OFFICE: 'ph:buildings-fill',
  COMPLETED: 'ph:check-circle-fill',
}
const statusIconBg = (status: string) => {
  if (status === 'COMPLETED') return 'bg-success/10'
  if (status === 'CREATED') return isDark.value ? 'bg-white/5' : 'bg-gray-100'
  return 'bg-candy-orange/10'
}
const statusIconColor = (status: string) => {
  if (status === 'COMPLETED') return 'text-success'
  if (status === 'CREATED') return 'text-gray-400'
  return 'text-candy-orange'
}
const formatDate = (value?: string) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit' }).format(new Date(value))
}

// ── KPI strip + inline-markdown linking ─────────────────────────────────
const KPI_LINKS: Array<{ label: string; key: StatKey }> = [
  { label: 'Total Documents', key: 'total' },
  { label: 'Active Processing', key: 'active' },
  { label: 'Processing Speed', key: 'speed' },
  { label: 'SLA Compliance', key: 'sla' },
]

const statLabel = (key: StatKey | null) => KPI_LINKS.find((k) => k.key === key)?.label ?? ''

const digestStats = computed(() => {
  const kpis = props.metrics?.kpis
  if (!kpis) return []
  return [
    { key: 'total' as StatKey, label: 'Total Documents', value: kpis.totalDocuments?.display ?? '0' },
    { key: 'active' as StatKey, label: 'Active Processing', value: kpis.activeProcessing?.display ?? '0' },
    { key: 'speed' as StatKey, label: 'Processing Speed', value: kpis.processingSpeed?.display ?? '0' },
    { key: 'sla' as StatKey, label: 'SLA Compliance', value: kpis.slaCompliance?.display ?? '0' },
  ]
})

function linkifyKpis(text: string): string {
  let out = text
  for (const { label, key } of KPI_LINKS) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\*\\*${escaped}\\*\\*|${escaped}`, 'g')
    out = out.replace(re, (match) =>
      match.startsWith('**') ? `[**${label}**](#kpi-${key})` : `[${label}](#kpi-${key})`
    )
  }
  return out
}

const formattedNarrative = computed(() => {
  if (!narrative.value) return ''
  const html = marked.parse(linkifyKpis(narrative.value)) as string
  return DOMPurify.sanitize(html)
})

function handleDigestClick(e: MouseEvent) {
  const anchor = (e.target as HTMLElement).closest('a[href^="#kpi-"]') as HTMLAnchorElement | null
  if (!anchor) return
  e.preventDefault()
  const key = anchor.getAttribute('href')!.replace('#kpi-', '') as StatKey
  selectStat(key)
}

// ── Drill-down panel state ───────────────────────────────────────────────
const activeStat = ref<StatKey | null>(null)
const panelDocs = ref<PanelDoc[]>([])
const panelLoading = ref(false)
const allDocsCache = ref<PanelDoc[] | null>(null)

const selectedDocId = ref<string | null>(null)
const selectedDocTitle = ref<string | null>(null)
const timelineData = ref<{ events: any[]; routeSteps: any[]; summary: any } | null>(null)
const timelineLoading = ref(false)

const ACTIVE_STATUSES = ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_OFFICE']

watch(activeStat, (v) => emit('panel-open', !!v))

async function ensureDocsLoaded() {
  if (allDocsCache.value) return allDocsCache.value
  try {
    const res = await $fetch<{ success: boolean; data: PanelDoc[] }>('/api/client/dashboard-documents', {
      params: props.officeId ? { officeId: props.officeId } : undefined,
    })
    allDocsCache.value = res.data ?? []
  } catch (err) {
    console.error('[AiExecutiveDigest] documents fetch error:', err)
    allDocsCache.value = []
  }
  return allDocsCache.value
}

async function selectStat(key: StatKey) {
  if (activeStat.value === key) {
    closePanel()
    return
  }
  activeStat.value = key
  selectedDocId.value = null
  timelineData.value = null
  panelLoading.value = true
  const docs = (await ensureDocsLoaded()) ?? []
  if (key === 'total') {
    panelDocs.value = docs
  } else if (key === 'active') {
    panelDocs.value = docs.filter((d) => ACTIVE_STATUSES.includes(String(d.tracking_status).toUpperCase()))
  } else {
    // Processing Speed / SLA Compliance are both derived from completed cycles
    panelDocs.value = docs.filter((d) => String(d.tracking_status).toUpperCase() === 'COMPLETED')
  }
  panelLoading.value = false
}

function closePanel() {
  activeStat.value = null
  selectedDocId.value = null
  timelineData.value = null
}

async function openDocDetail(doc: PanelDoc) {
  selectedDocId.value = doc.id
  selectedDocTitle.value = doc.title
  timelineData.value = null
  timelineLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/tracking/timeline', {
      params: { documentId: doc.id },
    })
    timelineData.value = res.data
  } catch (err) {
    console.error('[AiExecutiveDigest] timeline fetch error:', err)
  } finally {
    timelineLoading.value = false
  }
}

function closeDocDetail() {
  selectedDocId.value = null
  timelineData.value = null
}

// ── Digest fetching ───────────────────────────────────────────────────────
const fetchDigest = async () => {
  if (!props.metrics) return

  loading.value = true
  error.value = null
  try {
    const res = await $fetch<{ success: boolean; narrative: string; debugError?: string }>('/api/client/dashboard-ai', {
      method: 'POST',
      body: {
        metrics: props.metrics,
        officeName: props.officeName
      }
    })

    if (res.success) {
      narrative.value = res.narrative
    } else {
      error.value = `Failed to load executive digest. ${res.debugError || ''}`
    }
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Failed to load executive digest.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.metrics,
  () => {
    allDocsCache.value = null
    closePanel()
    fetchDigest()
  },
  { deep: true, immediate: true }
)
</script>

<style scoped>
/* The markdown comes back as raw HTML from marked + DOMPurify, so it has to be
   styled by element selector rather than component classes. Colors are driven
   by CSS variables that flip with the .is-dark class so the digest follows
   the app's light/dark theme instead of being hardcoded to dark. */
.ai-digest {
  --digest-body: #3F3F46;
  --digest-strong: #18181B;
  --digest-hr: #E4E4E7;
  --digest-code-bg: #F1F1F1;
  --digest-quote-text: #71717A;
  color: var(--digest-body);
}
.ai-digest.is-dark {
  --digest-body: #D4D4D8;
  --digest-strong: #FEFEFE;
  --digest-hr: #2A2A2A;
  --digest-code-bg: #2A2A2A;
  --digest-quote-text: #8F8F94;
}
.ai-digest :deep(h2),
.ai-digest :deep(h3) {
  display: flex;
  align-items: center;
  gap: 0.4em;
  margin-top: 2em;
  margin-bottom: 0.6em;
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #EE4D2D;
}
.ai-digest :deep(h2:first-child),
.ai-digest :deep(h3:first-child) {
  margin-top: 0;
}
.ai-digest :deep(h4) {
  margin-top: 1.4em;
  margin-bottom: 0.4em;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--digest-strong);
}
.ai-digest :deep(p) {
  margin-bottom: 1em;
}
.ai-digest :deep(strong) {
  font-weight: 700;
  color: var(--digest-strong);
}
.ai-digest :deep(ul),
.ai-digest :deep(ol) {
  margin: 0.75em 0 1.25em;
  padding-left: 1.4em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}
.ai-digest :deep(ul) {
  list-style: none;
  padding-left: 0.2em;
}
.ai-digest :deep(ul li) {
  position: relative;
  padding-left: 1.3em;
}
.ai-digest :deep(ul li)::before {
  content: '';
  position: absolute;
  left: 0.15em;
  top: 0.62em;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #EE4D2D;
}
.ai-digest :deep(ol) {
  list-style: decimal;
}
.ai-digest :deep(ol li)::marker {
  color: #EE4D2D;
  font-weight: 700;
}
.ai-digest :deep(hr) {
  margin: 1.75em 0;
  border: none;
  border-top: 1px solid var(--digest-hr);
}
.ai-digest :deep(code) {
  padding: 0.15em 0.4em;
  border-radius: 5px;
  background: var(--digest-code-bg);
  font-size: 0.9em;
}
.ai-digest :deep(blockquote) {
  margin: 1em 0;
  padding: 0.75em 1em;
  border-left: 3px solid #EE4D2D;
  background: rgba(238, 77, 45, 0.06);
  color: var(--digest-quote-text);
  border-radius: 0 10px 10px 0;
}
.ai-digest :deep(a) {
  color: #EE4D2D;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
</style>
