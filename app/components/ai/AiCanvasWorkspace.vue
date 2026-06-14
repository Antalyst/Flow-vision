<template>
  <div class="relative flex h-screen max-h-screen w-full overflow-hidden bg-[#F9F9FB] text-slate-800 dark:bg-[#0E0E10] dark:text-slate-100">
    <!-- ── Mobile backdrop ───────────────────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="isSidebarOpen && isMobile"
        class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
        @click="isSidebarOpen = false"
      ></div>
    </Transition>

    <!-- ── Collapsible sidebar (chat history) ────────────────────────── -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-white/5 dark:bg-[#161616] md:static md:z-auto"
      :class="isSidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0'"
    >
      <div class="flex h-full w-64 flex-col">
        <!-- Brand + close (mobile) -->
        <div class="flex items-center justify-between px-4 py-4">
          <div class="flex items-center gap-2">
            <img :src="brandLogo" alt="FlowVision" class="h-7 w-7" />
            <span class="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">FlowVision</span>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-neutral-500 transition hover:bg-black/5 md:hidden dark:text-neutral-400 dark:hover:bg-white/5"
            @click="isSidebarOpen = false"
          >
            <Icon name="ph:x" class="h-4 w-4" />
          </button>
        </div>

        <!-- New chat -->
        <div class="px-3">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-200 dark:hover:text-orange-400"
            @click="newChat"
          >
            <Icon name="ph:plus" class="h-4 w-4" />
            New chat
          </button>
        </div>

        <!-- Recents -->
        <p class="px-5 pb-2 pt-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
          Recents
        </p>
        <div class="custom-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          <button
            v-for="session in sessions"
            :key="session.id"
            type="button"
            class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition"
            :class="session.id === activeSessionId
              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
              : 'text-neutral-600 hover:bg-orange-500/10 hover:text-orange-600 dark:text-neutral-300 dark:hover:text-orange-400'"
            @click="selectSession(session.id)"
          >
            <Icon name="ph:chat-circle-dots" class="h-4 w-4 flex-shrink-0 opacity-70" />
            <span class="truncate">{{ session.title }}</span>
          </button>

          <p
            v-if="sessions.length === 0"
            class="px-3 py-6 text-center text-xs text-neutral-400 dark:text-neutral-600"
          >
            No conversations yet.
          </p>
        </div>
      </div>
    </aside>

    <!-- ── Main column ───────────────────────────────────────────────── -->
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Top control strip -->
      <header class="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-3 lg:px-5">
        <div class="flex items-center gap-1.5">
          <!-- Gemini-style toggle -->
          <button
            type="button"
            class="rounded-lg p-2 text-neutral-500 transition hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/5"
            aria-label="Toggle sidebar"
            @click="toggleSidebar"
          >
            <Icon name="ph:list" class="h-5 w-5" />
          </button>

          <button
            type="button"
            class="group inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-500 transition hover:bg-black/5 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
            @click="backToDashboard"
          >
            <Icon name="ph:arrow-left" class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Dashboard
          </button>
        </div>

        <span class="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300">
          <span class="relative flex h-1.5 w-1.5">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
            <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500"></span>
          </span>
          FlowVision Intelligence
        </span>
      </header>

      <!-- Split workspace: chat timeline (left 40%) + sliding document canvas (right 60%) -->
      <div class="relative flex min-h-0 flex-1 overflow-hidden">
        <!-- Chat timeline column -->
        <div
          class="flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          :class="isCanvasOpen ? 'lg:pr-[60%]' : ''"
        >
        <!-- Empty welcome hero -->
        <div
          v-if="showSplash && chatHistory.length === 0 && !isLoading && !isHydrating"
          class="flex flex-1 flex-col items-center justify-center px-4 text-center"
        >
          <div class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
            <img :src="brandLogo" alt="FlowVision" class="h-9 w-9" />
          </div>
          <h1 class="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            Where should we start?
          </h1>
          <p class="mt-3 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            Ask in plain language and FlowVision will assemble it from your organization's records —
            securely scoped to your tenant.
          </p>

          <div class="mt-8 flex w-full max-w-md flex-col gap-2.5">
            <button
              v-for="chip in suggestionChips"
              :key="chip.label"
              type="button"
              class="group flex items-center gap-3 rounded-xl border border-gray-200 bg-black/[0.02] px-4 py-3 text-left text-sm text-neutral-600 transition-all duration-200 hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-600 dark:border-white/5 dark:bg-white/[0.02] dark:text-neutral-300 dark:hover:text-white"
              @click="useSuggestion(chip.label)"
            >
              <Icon :name="chip.icon" class="h-4 w-4 flex-shrink-0 text-orange-400/80" />
              <span class="flex-1 truncate">{{ chip.label }}</span>
              <Icon name="ph:arrow-up-right" class="h-3.5 w-3.5 text-neutral-400 transition group-hover:text-orange-500 dark:text-neutral-600" />
            </button>
          </div>
        </div>

        <!-- Fluid chat stream -->
        <div v-else ref="scrollContainer" class="custom-scrollbar flex-1 overflow-y-auto px-4">
          <div class="mx-auto w-full max-w-3xl space-y-6 py-6">
            <div
              v-for="(msg, idx) in chatHistory"
              :key="idx"
              class="flex animate-fadeIn gap-3"
              :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <!-- Assistant / error avatar -->
              <div
                v-if="msg.role !== 'user'"
                class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-xs font-bold text-white shadow-md"
              >
                FV
              </div>

              <!-- User bubble -->
              <div
                v-if="msg.role === 'user'"
                class="max-w-[80%] rounded-2xl rounded-br-md bg-orange-600 px-4 py-2.5 text-sm text-white shadow-md"
              >
                <p class="whitespace-pre-line">{{ msg.content }}</p>
              </div>

              <!-- Error bubble -->
              <div
                v-else-if="msg.role === 'error'"
                class="flex max-w-[85%] items-start gap-2.5 rounded-2xl rounded-tl-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-300"
              >
                <Icon name="ph:warning-circle" class="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{{ msg.content }}</p>
              </div>

              <!-- Assistant bubble -->
              <div v-else class="min-w-0 max-w-[85%] space-y-3">
                <div class="rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-700 shadow-sm dark:border-white/5 dark:bg-neutral-900/60 dark:text-neutral-200 dark:shadow-none">
                  <p class="whitespace-pre-line">{{ msg.content }}</p>
                </div>

                <!-- Document canvas call-to-action -->
                <button
                  v-if="msg.documentPayload"
                  type="button"
                  class="group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition"
                  :class="activeDoc === msg.documentPayload && isCanvasOpen
                    ? 'border-orange-500/60 bg-orange-500/10'
                    : 'border-orange-500/30 bg-orange-500/[0.06] hover:border-orange-500/60 hover:bg-orange-500/10'"
                  @click="openCanvas(msg.documentPayload)"
                >
                  <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow">
                    <Icon name="ph:file-text" class="h-4 w-4" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                      {{ msg.documentPayload.title }}
                    </span>
                    <span class="block text-[11px] text-neutral-500 dark:text-neutral-400">
                      Open document canvas
                    </span>
                  </span>
                  <Icon
                    name="ph:arrow-right"
                    class="h-4 w-4 flex-shrink-0 text-orange-500 transition-transform group-hover:translate-x-0.5"
                  />
                </button>

                <span class="block px-1 font-mono text-[11px] text-neutral-400 dark:text-neutral-600">{{ msg.timestamp }}</span>
              </div>
            </div>

            <!-- Typing / hydration loader -->
            <div v-if="isLoading || isHydrating" class="flex animate-fadeIn gap-3">
              <div class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-xs font-bold text-white shadow-md">
                FV
              </div>
              <div class="flex items-center gap-3 rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-3 dark:border-white/5 dark:bg-neutral-900/60">
                <div class="flex items-center gap-1">
                  <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:-0.3s]"></span>
                  <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:-0.15s]"></span>
                  <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400"></span>
                </div>
                <Transition name="think" mode="out-in">
                  <span :key="thinkingStageText" class="text-xs italic text-neutral-500 dark:text-neutral-400">{{ thinkingStageText }}</span>
                </Transition>
              </div>
            </div>
          </div>
        </div>

        <!-- Input console -->
        <div class="flex-shrink-0 px-4 pb-5 pt-2">
          <div class="mx-auto w-full max-w-3xl">
            <form
              class="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg transition focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/20 dark:border-white/10 dark:bg-neutral-900/60 dark:shadow-2xl dark:backdrop-blur-xl"
              @submit.prevent="submitQuery"
            >
              <textarea
                v-model="inputPrompt"
                :disabled="isLoading"
                rows="1"
                placeholder="Ask FlowVision anything about your documents…"
                class="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder-neutral-400 focus:outline-none disabled:opacity-50 dark:text-slate-200 dark:placeholder-neutral-600"
                @keydown.enter.exact.prevent="submitQuery"
              ></textarea>
              <button
                type="submit"
                :disabled="isLoading || !inputPrompt.trim()"
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow transition-all hover:bg-orange-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Icon v-if="isLoading" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
                <Icon v-else name="ph:arrow-up" class="h-4 w-4" />
              </button>
            </form>
            <p class="mt-2 text-center text-[11px] text-neutral-400 dark:text-neutral-600">
              FlowVision Intelligence can make mistakes. Verify important records.
            </p>
          </div>
        </div>
        </div>
        <!-- ── End chat timeline column ─────────────────────────────────── -->

        <!-- ── Sliding document canvas (right 60%) ──────────────────────── -->
        <section
          class="absolute right-0 top-0 z-20 h-full w-full transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:w-[60%]"
          :class="isCanvasOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'"
          aria-label="Document canvas"
        >
          <div class="flex h-full w-full flex-col border-l border-gray-200 bg-[#EEF0F3] shadow-2xl dark:border-white/10 dark:bg-[#0B0B0D]">
            <!-- Canvas header -->
            <div class="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white/70 px-5 py-3 backdrop-blur dark:border-white/10 dark:bg-white/[0.03]">
              <Icon
                :name="isSpreadsheetCanvas ? 'ph:table' : 'ph:file-text'"
                class="h-4 w-4 flex-shrink-0"
                :class="isSpreadsheetCanvas ? 'text-emerald-500' : 'text-orange-500'"
              />
              <span class="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {{ documentPayload?.title || 'Document Canvas' }}
              </span>

              <!-- Export action group -->
              <div v-if="documentPayload" class="flex flex-shrink-0 items-center gap-1.5">
                <button
                  v-if="isSpreadsheetCanvas"
                  type="button"
                  :disabled="isExporting"
                  class="group inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-500/50 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
                  @click="downloadAsExcel"
                >
                  <Icon
                    :name="isExporting ? 'ph:spinner-gap' : 'ph:file-arrow-down'"
                    class="h-4 w-4 transition group-hover:translate-y-0.5"
                    :class="isExporting ? 'animate-spin' : ''"
                  />
                  <span class="hidden sm:inline">Download as Excel (.xlsx)</span>
                  <span class="sm:hidden">Excel</span>
                </button>

                <button
                  v-else
                  type="button"
                  :disabled="isExporting"
                  class="group inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:border-orange-500/50 hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-orange-400 dark:hover:bg-orange-500/15"
                  @click="downloadAsDocx"
                >
                  <Icon
                    :name="isExporting ? 'ph:spinner-gap' : 'ph:file-arrow-down'"
                    class="h-4 w-4 transition group-hover:translate-y-0.5"
                    :class="isExporting ? 'animate-spin' : ''"
                  />
                  <span class="hidden sm:inline">Download as Word (.docx)</span>
                  <span class="sm:hidden">Word</span>
                </button>
              </div>

              <button
                type="button"
                class="rounded-lg p-1.5 text-neutral-500 transition hover:bg-black/5 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
                aria-label="Close canvas"
                @click="closeCanvas"
              >
                <Icon name="ph:x" class="h-4 w-4" />
              </button>
            </div>

            <!-- Paper scroll surface (vertical page movement) -->
            <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
              <article
                v-if="documentPayload"
                class="fv-canvas-article mx-auto w-full min-w-0 rounded-sm bg-white text-neutral-800 shadow-xl ring-1 ring-black/5 transition-all duration-500 dark:bg-[#141416] dark:text-neutral-200 dark:ring-white/10"
                :class="isSpreadsheetCanvas
                  ? 'max-w-none px-4 py-5 sm:px-6 sm:py-6'
                  : 'max-w-3xl px-7 py-9 sm:px-12 sm:py-14'"
              >
                <header
                  class="border-b border-neutral-200 pb-6 dark:border-neutral-700"
                  :class="isSpreadsheetCanvas ? 'mb-4' : 'mb-8'"
                >
                  <p class="text-[11px] font-bold uppercase tracking-[0.25em] text-orange-600 dark:text-orange-400">
                    {{ isSpreadsheetCanvas ? 'FlowVision Data Matrix' : 'FlowVision Report' }}
                  </p>
                  <h1
                    class="mt-2 font-bold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50"
                    :class="isSpreadsheetCanvas ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'"
                  >
                    {{ documentPayload.title }}
                  </h1>
                </header>

                <!-- Horizontal scroll lane for wide matrix / table columns -->
                <div
                  class="fv-doc-viewport min-w-0"
                  :class="needsHorizontalScroll ? 'custom-scrollbar overflow-x-auto' : ''"
                >
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <div
                    ref="canvasBodyRef"
                    class="fv-doc-body leading-relaxed text-neutral-700 dark:text-neutral-300"
                    :class="[
                      isSpreadsheetCanvas ? 'fv-doc-body--matrix text-sm' : 'text-sm',
                    ]"
                    v-html="documentPayload.content"
                  ></div>
                </div>
              </article>

              <div
                v-else
                class="flex h-full flex-col items-center justify-center text-center text-neutral-400 dark:text-neutral-600"
              >
                <Icon name="ph:file-dashed" class="mb-3 h-10 w-10" />
                <p class="text-sm">No document is open yet.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

interface DatasetColumn {
  key: string
  label: string
  type: 'text' | 'longtext' | 'date' | 'number' | 'status'
}
interface SynthesizedDataset {
  format: 'EXCEL' | 'WORD'
  structureType: 'TABULAR_GRID' | 'NARRATIVE_REPORT'
  metadata: { title: string; brandingContext: string; generationDate: string; theme: string; recordCount: number }
  columns: DatasetColumn[]
  canvas: { table: { columns: DatasetColumn[]; rows: Array<Record<string, unknown>> } }
  warnings: string[]
}
interface ChatMessage {
  role: 'user' | 'assistant' | 'error'
  content: string
  timestamp: string
  documentPayload?: DocumentPayload | null
}
interface ChatSession {
  id: string
  title: string
  created_at?: string
}

interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, any> | null
  created_at?: string
}

const { isDark } = useTheme()
const brandLogo = computed(() => (isDark.value ? '/logo/new-logo.png' : '/logo/new-logo-dark.png'))

const inputPrompt = ref('')
const isLoading = ref(false)
const isHydrating = ref(false)
const showSplash = ref(true)
const chatHistory = ref<ChatMessage[]>([])
const sessions = ref<ChatSession[]>([])
const activeSessionId = ref<string | null>(null)
const thinkingStageText = ref('Reading secure organization token…')
const scrollContainer = ref<HTMLElement | null>(null)

// ── Document canvas state ──────────────────────────────────────────────
interface DocumentPayload {
  title: string
  content: string
  /** Pre-built row matrix from legacy dataset metadata (header row + data rows). */
  matrix?: string[][]
}
const isCanvasOpen = ref(false)
const documentPayload = ref<DocumentPayload | null>(null)
const activeDoc = ref<DocumentPayload | null>(null)
const canvasBodyRef = ref<HTMLElement | null>(null)
const isExporting = ref(false)

const SPREADSHEET_MARKER = 'fv-spreadsheet-matrix'
const isSpreadsheetCanvas = computed(
  () => Boolean(documentPayload.value?.content?.includes(SPREADSHEET_MARKER))
)
const needsHorizontalScroll = computed(() => {
  const content = documentPayload.value?.content ?? ''
  return isSpreadsheetCanvas.value || /<table[\s>]/i.test(content)
})

// ── Sidebar state ──────────────────────────────────────────────────────
const isSidebarOpen = ref(true)
const isMobile = ref(false)

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 768
}
const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const suggestionChips = [
  { label: 'Summarize all approved documents this quarter', icon: 'ph:check-circle' },
  { label: 'Find records missing verification stages', icon: 'ph:magnifying-glass' },
  { label: 'Generate a subsidy ledger review', icon: 'ph:table' },
]

const thinkingStages = [
  'Reading secure organization token…',
  'Parsing document schema matchers…',
  'Executing tenant-isolated extraction logic…',
  'Hydrating distributed document blocks…',
  'Assembling data template structures…',
]

let thinkingTimer: ReturnType<typeof setInterval> | null = null

const startThinking = () => {
  let idx = 0
  thinkingStageText.value = thinkingStages[0]
  thinkingTimer = setInterval(() => {
    idx = (idx + 1) % thinkingStages.length
    thinkingStageText.value = thinkingStages[idx]
  }, 1400)
}
const stopThinking = () => {
  if (thinkingTimer) {
    clearInterval(thinkingTimer)
    thinkingTimer = null
  }
}

const nowLabel = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const formatTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : nowLabel()

const cellText = (value: unknown): string =>
  value === null || value === undefined || value === '' ? '—' : String(value)

const backToDashboard = () => {
  navigateTo('/client/dashboard')
}

// ── Document canvas synthesis & control ────────────────────────────────
const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Synthesize a clean, formal HTML report body from a dataset (inline-styled so
// it renders identically inside the v-html paper frame, independent of theme).
const buildDocumentHtml = (dataset: SynthesizedDataset): string => {
  const columns = dataset.canvas?.table?.columns?.length
    ? dataset.canvas.table.columns
    : dataset.columns
  const rows = dataset.canvas?.table?.rows ?? []

  const meta = dataset.metadata
  const intro = `${escapeHtml(meta?.brandingContext || 'FlowVision')}${
    meta?.generationDate ? ` · ${escapeHtml(meta.generationDate)}` : ''
  }`

  if (!rows.length || !columns.length) {
    return `
      <p style="color:#6b7280;font-style:italic;margin:0;">${intro}</p>
      <p style="margin-top:16px;">No structured records were assembled for this request.</p>
    `
  }

  const headCells = columns
    .map(
      (c) =>
        `<th style="text-align:left;padding:10px 12px;border-bottom:2px solid #e5e7eb;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#9ca3af;">${escapeHtml(
          c.label
        )}</th>`
    )
    .join('')

  const bodyRows = rows
    .map((row, ri) => {
      const cells = columns
        .map(
          (c) =>
            `<td style="padding:10px 12px;border-bottom:1px solid #f0f1f3;vertical-align:top;color:#374151;">${escapeHtml(
              cellText(row[c.key])
            )}</td>`
        )
        .join('')
      const zebra = ri % 2 ? 'background:#fafafa;' : ''
      return `<tr style="${zebra}">${cells}</tr>`
    })
    .join('')

  return `
    <p style="color:#9ca3af;font-size:12px;margin:0 0 20px;">${intro}</p>
    <h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 6px;">Records Overview</h2>
    <p style="margin:0 0 20px;color:#4b5563;">
      This report compiles <strong>${rows.length}</strong> record(s) assembled from your
      organization's documents.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr>${headCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `
}

const openCanvas = (payload: DocumentPayload | null | undefined) => {
  if (!payload) return
  activeDoc.value = payload
  documentPayload.value = payload
  isCanvasOpen.value = true
}

const closeCanvas = () => {
  isCanvasOpen.value = false
}

// ── Native file export (client-side blob compilation) ───────────────────
const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const buildExportFilename = (title: string, extension: 'docx' | 'xlsx'): string => {
  const base =
    title
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 100) || 'FlowVision_Export'
  return `${base}.${extension}`
}

const triggerNativeDownload = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}

const parseCanvasHtml = (htmlContent: string): globalThis.Document => {
  const parser = new DOMParser()
  return parser.parseFromString(htmlContent, 'text/html')
}

const htmlTableToMatrix = (table: HTMLTableElement): string[][] => {
  const matrix: string[][] = []

  if (table.tHead) {
    for (const row of Array.from(table.tHead.rows)) {
      matrix.push(Array.from(row.cells).map((cell) => cell.textContent?.trim() ?? ''))
    }
  }

  const bodyRows = table.tBodies.length
    ? Array.from(table.tBodies).flatMap((body) => Array.from(body.rows))
    : Array.from(table.rows).filter((row) => !row.closest('thead'))

  for (const row of bodyRows) {
    if (table.tHead && row.closest('thead')) continue
    matrix.push(Array.from(row.cells).map((cell) => cell.textContent?.trim() ?? ''))
  }

  return matrix.filter((row) => row.some((cell) => cell.length > 0))
}

const resolveTableMatrix = (payload: DocumentPayload): string[][] => {
  if (payload.matrix?.length) return payload.matrix

  const liveRoot = canvasBodyRef.value
  if (liveRoot) {
    const liveTable =
      liveRoot.querySelector<HTMLTableElement>('.fv-spreadsheet-matrix table') ??
      liveRoot.querySelector<HTMLTableElement>('table')
    if (liveTable) return htmlTableToMatrix(liveTable)
  }

  const parsed = parseCanvasHtml(payload.content)
  const parsedTable =
    parsed.querySelector<HTMLTableElement>('.fv-spreadsheet-matrix table') ??
    parsed.querySelector<HTMLTableElement>('table')
  return parsedTable ? htmlTableToMatrix(parsedTable) : []
}

const buildWordHtmlDocument = (title: string, htmlContent: string): string => {
  const parsed = parseCanvasHtml(htmlContent)
  const bodyMarkup = parsed.body.innerHTML.trim()

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeXml(title)}</title>
<!--[if gte mso 9]><xml>
<w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml><![endif]-->
<style>
  @page { margin: 1in; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1f2937; line-height: 1.45; }
  h1 { font-size: 22pt; font-weight: 700; color: #111827; margin: 0 0 14pt; }
  h2 { font-size: 14pt; font-weight: 700; color: #111827; margin: 18pt 0 8pt; }
  h3 { font-size: 12pt; font-weight: 700; color: #1f2937; margin: 14pt 0 6pt; }
  p { margin: 0 0 9pt; }
  ul, ol { margin: 0 0 9pt 18pt; }
  li { margin: 2pt 0; }
  strong, b { font-weight: 700; color: #111827; }
  table { border-collapse: collapse; width: 100%; margin: 10pt 0 16pt; }
  th, td { border: 1px solid #d1d5db; padding: 6pt 8pt; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 700; font-size: 9pt; text-transform: uppercase; color: #4b5563; }
</style>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  ${bodyMarkup}
</body>
</html>`
}

const buildSpreadsheetXml = (rows: string[][], sheetName: string): string => {
  const safeSheet = escapeXml(sheetName.slice(0, 31) || 'Data')
  const rowXml = rows
    .map((row) => {
      const cells = row
        .map(
          (cell) =>
            `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`
        )
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${safeSheet}">
  <Table>${rowXml}</Table>
 </Worksheet>
</Workbook>`
}

const downloadAsDocx = () => {
  const payload = documentPayload.value
  if (!payload?.content || isExporting.value) return

  isExporting.value = true
  try {
    const htmlContent = payload.content
    const wordDocument = buildWordHtmlDocument(payload.title, htmlContent)
    const blob = new Blob(['\ufeff', wordDocument], {
      type: 'application/msword',
    })
    triggerNativeDownload(blob, buildExportFilename(payload.title, 'docx'))
  } finally {
    isExporting.value = false
  }
}

const downloadAsExcel = () => {
  const payload = documentPayload.value
  if (!payload?.content || isExporting.value) return

  isExporting.value = true
  try {
    const matrix = resolveTableMatrix(payload)
    if (!matrix.length) return

    const spreadsheetXml = buildSpreadsheetXml(matrix, payload.title)
    const blob = new Blob(['\ufeff', spreadsheetXml], {
      type: 'application/vnd.ms-excel',
    })
    triggerNativeDownload(blob, buildExportFilename(payload.title, 'xlsx'))
  } finally {
    isExporting.value = false
  }
}

// Resolve a DocumentPayload from a persisted metadata object. Supports the
// unified { documentPayload: { title, htmlContent } } contract, and falls back
// to synthesizing HTML from any legacy dataset-grid metadata.
const extractDocumentPayload = (metadata: unknown): DocumentPayload | null => {
  if (!metadata || typeof metadata !== 'object') return null
  const meta = metadata as Record<string, any>

  if (meta.documentPayload?.htmlContent) {
    return {
      title: String(meta.documentPayload.title || 'Document'),
      content: String(meta.documentPayload.htmlContent),
    }
  }

  const legacyDataset = meta.canvas ? meta : meta.dataBuilderOutput ?? null
  if (legacyDataset?.canvas?.table?.rows) {
    const columns = legacyDataset.canvas?.table?.columns?.length
      ? legacyDataset.canvas.table.columns
      : legacyDataset.columns ?? []
    const rows = legacyDataset.canvas.table.rows as Array<Record<string, unknown>>
    const matrix =
      columns.length && rows.length
        ? [
            columns.map((c: DatasetColumn) => c.label),
            ...rows.map((row) => columns.map((c: DatasetColumn) => cellText(row[c.key]))),
          ]
        : undefined

    return {
      title: legacyDataset.metadata?.title || 'Document',
      content: buildDocumentHtml(legacyDataset as SynthesizedDataset),
      matrix,
    }
  }

  return null
}

// ── Multi-turn session control (DB-backed) ─────────────────────────────
const loadSessions = async () => {
  try {
    const res = await $fetch<{ sessions: ChatSession[] }>('/api/ai/sessions')
    sessions.value = res?.sessions ?? []
  } catch {
    sessions.value = []
  }
}

const newChat = () => {
  chatHistory.value = []
  activeSessionId.value = null
  inputPrompt.value = ''
  stopThinking()
  isLoading.value = false
  isHydrating.value = false
  showSplash.value = true
  isCanvasOpen.value = false
  documentPayload.value = null
  activeDoc.value = null
  if (isMobile.value) isSidebarOpen.value = false
}

const selectSession = async (id: string) => {
  console.log('🚀 selectSession triggered for ID:', id)
  if (isHydrating.value) return

  // Bind the active thread + force out of the splash view immediately.
  activeSessionId.value = id
  chatHistory.value = []
  isHydrating.value = true
  showSplash.value = false
  stopThinking()
  isLoading.value = false
  // Reset the canvas when switching threads.
  isCanvasOpen.value = false
  documentPayload.value = null
  activeDoc.value = null
  if (isMobile.value) isSidebarOpen.value = false

  try {
    const response = await $fetch<any>('/api/ai/messages', {
      query: { session_id: id },
    })
    console.log('📥 Raw DB Response received:', response)

    // Safely unwrap whether the array arrives raw or nested under a data/body key.
    const rawArray = Array.isArray(response)
      ? response
      : response?.messages ??
        response?.body?.messages ??
        response?.data?.messages ??
        response?.data ??
        response?.body ??
        []
    const rows = (Array.isArray(rawArray) ? rawArray : []) as StoredMessage[]

    chatHistory.value = rows.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
      timestamp: formatTime(m.created_at),
      documentPayload: m.role === 'assistant' ? extractDocumentPayload(m.metadata) : null,
    }))

    // Force-break the splash regardless of payload shape so the chat log renders.
    showSplash.value = false
    await scrollToBottom()
  } catch (err) {
    console.error('❌ selectSession failed to hydrate thread:', err)
    chatHistory.value = [
      { role: 'error', content: 'Failed to load this conversation.', timestamp: nowLabel() },
    ]
  } finally {
    isHydrating.value = false
  }
}

const useSuggestion = (query: string) => {
  inputPrompt.value = query
  submitQuery()
}

const scrollToBottom = async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

const submitQuery = async () => {
  const prompt = inputPrompt.value.trim()
  if (!prompt || isLoading.value) return

  const wasNewSession = !activeSessionId.value

  chatHistory.value.push({ role: 'user', content: prompt, timestamp: nowLabel() })
  inputPrompt.value = ''
  showSplash.value = false
  isLoading.value = true
  await scrollToBottom()
  startThinking()

  try {
    const data = await $fetch<any>('/api/rag/query', {
      method: 'POST',
      body: { prompt, session_id: activeSessionId.value },
    })

    // The server owns the session id (create-on-first-message) and the reply text.
    if (data?.session_id) {
      activeSessionId.value = data.session_id
    }

    // Prefer the unified documentPayload; fall back to legacy dataset metadata.
    const doc = extractDocumentPayload(data) ?? extractDocumentPayload({ dataBuilderOutput: data?.dataBuilderOutput })
    const reply =
      data?.reply || (doc ? `Prepared “${doc.title}”.` : 'Done.')

    chatHistory.value.push({
      role: 'assistant',
      content: reply,
      timestamp: nowLabel(),
      documentPayload: doc,
    })

    // A document payload was received — slide the canvas open automatically.
    if (doc) {
      openCanvas(doc)
    }

    // Refresh the Recents rail so a freshly-created session appears immediately.
    if (wasNewSession) {
      await loadSessions()
    }
  } catch (err: any) {
    chatHistory.value.push({
      role: 'error',
      content:
        err?.data?.statusMessage ||
        err?.statusMessage ||
        err?.message ||
        'An infrastructure compilation error occurred.',
      timestamp: nowLabel(),
    })
  } finally {
    stopThinking()
    isLoading.value = false
    await scrollToBottom()
  }
}

onMounted(() => {
  updateIsMobile()
  isSidebarOpen.value = !isMobile.value
  window.addEventListener('resize', updateIsMobile)
  loadSessions()
})

onBeforeUnmount(() => {
  stopThinking()
  window.removeEventListener('resize', updateIsMobile)
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(120, 120, 120, 0.25);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(249, 115, 22, 0.4);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.think-enter-active,
.think-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.think-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.think-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Formal document typography for synthesized HTML (rendered via v-html → :deep). */
.fv-doc-viewport {
  -webkit-overflow-scrolling: touch;
}

/* Wide matrix / table lanes: let columns breathe; parent handles horizontal scroll. */
.fv-doc-viewport.overflow-x-auto .fv-doc-body :deep(table),
.fv-doc-body--matrix :deep(table) {
  min-width: max-content;
  width: max-content;
  max-width: none;
}

.fv-doc-body :deep(h2) {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  margin: 1.5rem 0 0.5rem;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(h2) {
  color: #f3f4f6;
}
.fv-doc-body :deep(h3) {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
  margin: 1.25rem 0 0.5rem;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(h3) {
  color: #e5e7eb;
}
.fv-doc-body :deep(p) {
  margin: 0 0 0.85rem;
  color: #374151;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(p) {
  color: #d1d5db;
}
.fv-doc-body :deep(ul) {
  margin: 0 0 0.85rem 1.1rem;
  list-style: disc;
}
.fv-doc-body :deep(li) {
  margin: 0.2rem 0;
}
.fv-doc-body :deep(strong) {
  color: #111827;
  font-weight: 700;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(strong) {
  color: #f9fafb;
}

/* Tables — shared light sheet styling + sticky distinct headers. */
.fv-doc-body :deep(table) {
  border-collapse: collapse;
  margin: 0.5rem 0 1.25rem;
  font-size: 0.8125rem;
}
.fv-doc-body :deep(thead th) {
  position: sticky;
  top: 0;
  z-index: 2;
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 2px solid #e5e7eb;
  background: #f9fafb;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}
.fv-doc-body :deep(td) {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f0f1f3;
  color: #374151;
  vertical-align: top;
  white-space: nowrap;
}
.fv-doc-body :deep(tr:nth-child(even) td) {
  background: #fafafa;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(thead th) {
  background: #1e293b;
  border-bottom-color: #334155;
  color: #94a3b8;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(td) {
  border-bottom-color: #2a2a2a;
  color: #d1d5db;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(tr:nth-child(even) td) {
  background: rgba(255, 255, 255, 0.03);
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(tr:hover td) {
  background: rgba(249, 115, 22, 0.1);
}

/* Full-bleed spreadsheet matrix reinforcement. */
.fv-doc-body :deep(.fv-spreadsheet-matrix) {
  margin: 0;
  padding-bottom: 0.25rem;
}
.fv-doc-body :deep(.fv-spreadsheet-matrix table) {
  border-collapse: collapse;
}
.fv-doc-body :deep(.fv-spreadsheet-matrix thead th) {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.75rem 1rem;
}
.fv-doc-body :deep(.fv-spreadsheet-matrix td) {
  border: 1px solid #e2e8f0;
  padding: 0.625rem 1rem;
  color: #334155;
}
.fv-doc-body :deep(.fv-spreadsheet-matrix tbody tr:nth-child(even) td) {
  background: #f8fafc;
}
.fv-doc-body :deep(.fv-spreadsheet-matrix tbody tr:hover td) {
  background: rgba(249, 115, 22, 0.08);
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(.fv-spreadsheet-matrix thead th) {
  background: #1e293b;
  border-color: #334155;
  color: #94a3b8;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(.fv-spreadsheet-matrix td) {
  border-color: #334155;
  color: #d1d5db;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(.fv-spreadsheet-matrix tbody tr:nth-child(even) td) {
  background: rgba(255, 255, 255, 0.04);
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(.fv-spreadsheet-matrix tbody tr:hover td) {
  background: rgba(249, 115, 22, 0.12);
}
</style>
