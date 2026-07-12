<template>
  <div ref="pageRoot" class="space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <!-- Breadcrumb + Greeting -->
      <div>
        <div class="mb-3 flex items-center gap-2 text-xs font-medium" :class="mutedText">
          <Icon name="ph:squares-four-fill" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Dashboard</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight">
          Hello, {{ auth.user?.full_name?.split(' ')[0] || 'Employee' }} 👋
        </h1>
        <p class="mt-1.5 text-sm" :class="mutedText">
          {{ currentScope === 'LOCAL'
            ? 'Here\'s your personal office workspace at a glance.'
            : 'Organisation-wide document stream and live analytics.' }}
        </p>
      </div>

      <!-- Right side: scope toggle + org badge -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Animated scope toggle pill -->
        <div
          class="relative flex items-center gap-1 rounded-2xl border p-1.5"
          :class="isDark
            ? 'bg-white/[0.04] border-white/10 backdrop-blur-md'
            : 'bg-white border-gray-200 shadow-sm'"
        >
          <div
            class="absolute inset-y-1.5 rounded-xl bg-candy-orange shadow-lg shadow-candy-orange/30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            :style="indicatorStyle"
          />
          <button
            v-for="opt in scopeOptions"
            :key="opt.value"
            :ref="(el) => setTabRef(el, opt.value)"
            type="button"
            class="relative z-10 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors duration-200 select-none"
            :class="currentScope === opt.value
              ? 'text-white'
              : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'"
            @click="setScope(opt.value)"
          >
            <Icon :name="opt.icon" class="h-3.5 w-3.5 flex-none" />
            <span class="whitespace-nowrap">{{ opt.label }}</span>
          </button>
        </div>

        <!-- Org badge -->
        <div
          v-if="auth.currentOrg"
          class="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm"
          :class="isDark ? 'bg-white/[0.04] border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'"
        >
          <Icon name="ph:building-office-fill" class="h-4 w-4 text-candy-orange" />
          <span class="font-semibold">{{ auth.currentOrg.name }}</span>
          <span class="font-mono text-xs opacity-50">{{ auth.currentOrg.code }}</span>
        </div>
      </div>
    </div>

    <!-- ── Scope Context Banner ───────────────────────────────────────── -->
    <div ref="bannerEl">
      <Transition name="scope-fade" mode="out-in">
        <div
          :key="currentScope"
          class="flex items-center gap-4 rounded-2xl border px-5 py-4 text-sm"
          :class="currentScope === 'LOCAL'
            ? isDark ? 'border-candy-orange/25 bg-candy-orange/[0.06]' : 'border-orange-200 bg-orange-50'
            : isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'"
        >
          <div class="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-candy-orange/15 ring-1 ring-candy-orange/20">
            <Icon
              :name="currentScope === 'LOCAL' ? 'ph:buildings-fill' : 'ph:globe-hemisphere-west-fill'"
              class="h-4.5 w-4.5 text-candy-orange"
            />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-bold text-candy-orange text-[10px] uppercase tracking-[0.12em]">
              {{ currentScope === 'LOCAL' ? 'Office View — Your Station' : 'Org View — Global Pipeline' }}
            </p>
            <p class="mt-0.5 text-xs" :class="mutedText">
              {{ currentScope === 'LOCAL'
                ? `Showing data scoped to your ${myOffices.length} sub-office${myOffices.length === 1 ? '' : 's'} within ${auth.currentOrg?.name || 'your organisation'}.`
                : `Showing all ${queueSummary.total} in-flight documents across the entire organisation.` }}
            </p>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-candy-orange/30 text-candy-orange">
              <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-candy-orange" />
              Live
            </span>
            <NuxtLink
              :to="`/employee/ai?scope=${currentScope}`"
              class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition hover:scale-[1.03]"
              :class="isDark
                ? 'border-white/10 bg-white/5 text-gray-300 hover:border-candy-orange/30 hover:text-candy-orange'
                : 'border-gray-200 bg-white text-gray-500 hover:border-candy-orange/30 hover:text-candy-orange'"
            >
              <Icon name="ph:sparkle-fill" class="h-3 w-3" />
              Ask AI
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ── KPI Cards ─────────────────────────────────────────────────── -->
    <Transition name="scope-fade" mode="out-in">
      <div ref="kpiEl" :key="`kpi-${currentScope}`" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div
          v-for="(card, i) in kpiCards"
          :key="card.label"
          class="group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg"
          :class="isDark
            ? 'bg-onyx-card border-onyx-border hover:border-candy-orange/30 hover:shadow-candy-orange/10'
            : 'bg-white border-gray-200 hover:border-candy-orange/30 hover:shadow-candy-orange/10'"
          :style="{ transitionDelay: `${i * 40}ms` }"
        >
          <!-- Subtle accent glow on hover -->
          <div class="pointer-events-none absolute inset-0 rounded-2xl bg-candy-orange/[0.04] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div class="flex items-start gap-4">
            <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ring-1" :class="card.iconBg">
              <Icon :name="card.icon" class="h-5 w-5" :class="card.iconColor" />
            </span>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest" :class="mutedText">{{ card.label }}</p>
              <p class="mt-1 text-2xl font-bold tracking-tight">
                <span v-if="ledgerLoading" class="inline-block h-6 w-12 animate-pulse rounded-lg" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
                <span v-else>{{ card.value }}</span>
              </p>
              <p class="mt-0.5 text-[10px] font-medium" :class="card.trendColor">{{ card.trend }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── GLOBAL only: Pipeline Status Bar ──────────────────────────── -->
    <Transition name="scope-slide">
      <div
        v-if="currentScope === 'GLOBAL'"
        class="grid grid-cols-2 gap-3 sm:grid-cols-5"
      >
        <div
          v-for="chip in pipelineChips"
          :key="chip.label"
          class="flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4 text-center transition-all duration-200"
          :class="isDark ? 'border-onyx-border bg-onyx-card hover:border-candy-orange/20' : 'border-gray-200 bg-white hover:border-candy-orange/20'"
        >
          <span class="h-2 w-2 rounded-full" :class="chip.dot" />
          <p class="text-2xl font-bold tracking-tight">{{ chip.count }}</p>
          <p class="text-[10px] font-bold uppercase tracking-wider" :class="mutedText">{{ chip.label }}</p>
        </div>
      </div>
    </Transition>

    <!-- ── Main Two-Column Layout ─────────────────────────────────────── -->
    <div ref="mainGridEl" class="grid grid-cols-1 gap-5 lg:grid-cols-5">

      <!-- ── Left Column: Document Ledger (3/5) ───────────────────────── -->
      <section
        class="rounded-2xl border lg:col-span-3 flex flex-col overflow-hidden transition-all duration-200"
        :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
      >
        <!-- Section header -->
        <div
          class="flex items-center justify-between border-b px-6 py-4"
          :class="isDark ? 'border-onyx-border' : 'border-gray-100'"
        >
          <div>
            <h2 class="text-sm font-bold">
              {{ currentScope === 'LOCAL' ? 'Personal Action Ledger' : 'Organisation Document Stream' }}
            </h2>
            <p class="mt-0.5 text-[11px]" :class="mutedText">
              {{ currentScope === 'LOCAL'
                ? 'Documents in your offices or uploaded by you'
                : 'All document transactions across the organisation' }}
            </p>
          </div>
          <div class="flex items-center gap-2.5">
            <span
              class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300"
              :class="currentScope === 'LOCAL'
                ? 'border-candy-orange/30 bg-candy-orange/10 text-candy-orange'
                : isDark ? 'border-white/20 bg-white/5 text-gray-300' : 'border-gray-300 bg-gray-100 text-gray-600'"
            >
              <Icon
                :name="currentScope === 'LOCAL' ? 'ph:shield-check-fill' : 'ph:globe-simple-fill'"
                class="h-2.5 w-2.5"
              />
              {{ currentScope === 'LOCAL' ? 'Isolated' : 'Org-Wide' }}
            </span>
            <NuxtLink
              to="/employee/documents"
              class="text-xs font-semibold text-candy-orange transition-colors hover:text-candy-hover"
            >
              View all →
            </NuxtLink>
          </div>
        </div>

        <!-- Loading skeleton -->
        <Transition name="scope-fade" mode="out-in">
          <div v-if="ledgerLoading" :key="'loading'" class="flex-1 space-y-3 p-5">
            <div
              v-for="n in 5"
              :key="n"
              class="h-14 animate-pulse rounded-xl"
              :class="isDark ? 'bg-white/5' : 'bg-gray-100'"
            />
          </div>

          <!-- Ledger rows -->
          <div
            v-else-if="ledger.length"
            :key="`rows-${currentScope}`"
            class="flex-1 overflow-y-auto divide-y"
            :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'"
          >
            <div
              v-for="doc in ledger.slice(0, 12)"
              :key="doc.id"
              class="flex items-start gap-4 px-6 py-4 transition-colors"
              :class="isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50/80'"
            >
              <span
                class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                :class="doc.is_own_upload
                  ? 'bg-candy-orange/10'
                  : isDark ? 'bg-purple-500/10' : 'bg-purple-50'"
              >
                <Icon
                  :name="doc.is_own_upload ? 'ph:upload-simple-fill' : 'ph:buildings-fill'"
                  class="h-4 w-4"
                  :class="doc.is_own_upload ? 'text-candy-orange' : 'text-purple-500'"
                />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold" :class="isDark ? 'text-gray-100' : 'text-gray-800'">
                  {{ doc.title || 'Untitled Document' }}
                </p>
                <div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0 text-[11px]" :class="mutedText">
                  <span v-if="doc.origin_label || doc.office_label" class="flex items-center gap-1">
                    <Icon name="ph:buildings" class="h-3 w-3" />
                    {{ doc.origin_label || doc.office_label }}
                  </span>
                  <span>{{ formatDate(doc.created_at) }}</span>
                  <span
                    class="font-medium"
                    :class="doc.is_own_upload ? 'text-candy-orange' : 'text-purple-500'"
                  >
                    {{ doc.is_own_upload ? 'You uploaded' : 'Routed in' }}
                  </span>
                  <span
                    v-if="doc.tracking_status && doc.tracking_status !== 'CREATED'"
                    class="rounded-full px-1.5 py-0.5 font-semibold"
                    :class="trackingBadge(doc.tracking_status)"
                  >
                    {{ doc.tracking_status?.replace('_', ' ') }}
                  </span>
                </div>
              </div>
              <span
                class="flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                :class="statusClass(doc.status)"
              >
                {{ doc.status || '—' }}
              </span>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-else
            :key="'empty'"
            class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center"
          >
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-candy-orange/10 ring-1 ring-candy-orange/20">
              <Icon name="ph:clipboard-text" class="h-7 w-7 text-candy-orange/50" />
            </div>
            <p class="font-semibold" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
              {{ currentScope === 'LOCAL' ? 'No documents in your personal ledger.' : 'No documents in the organisation yet.' }}
            </p>
            <p class="text-xs max-w-[220px]" :class="mutedText">
              {{ currentScope === 'LOCAL' ? 'Upload a document from one of your offices to get started.' : 'Documents will appear here once uploaded.' }}
            </p>
          </div>
        </Transition>
      </section>

      <!-- ── Right Column (2/5) ──────────────────────────────────────── -->
      <div class="lg:col-span-2 flex flex-col gap-5">

        <!-- My Sub-Offices -->
        <div
          class="rounded-2xl border p-5 transition-all duration-200"
          :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
        >
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold">My Sub-Offices</h2>
              <p class="mt-0.5 text-[11px]" :class="mutedText">Registered branch nodes</p>
            </div>
            <NuxtLink
              to="/employee/offices"
              class="text-xs font-semibold text-candy-orange transition-colors hover:text-candy-hover"
            >
              Manage →
            </NuxtLink>
          </div>

          <div v-if="officesLoading" class="space-y-2">
            <div v-for="n in 2" :key="n" class="h-10 animate-pulse rounded-xl" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
          </div>

          <div v-else-if="myOffices.length" class="space-y-2">
            <div
              v-for="office in myOffices.slice(0, 4)"
              :key="office.id"
              class="flex items-center gap-3 rounded-xl border p-3 transition-colors"
              :class="isDark ? 'border-onyx-border hover:bg-white/[0.03]' : 'border-gray-100 hover:bg-gray-50'"
            >
              <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-candy-orange/10">
                <Icon name="ph:buildings-fill" class="h-3.5 w-3.5 text-candy-orange" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                  {{ office.name }}
                </p>
                <p class="font-mono text-[10px]" :class="mutedText">
                  {{ office.code || `OFF-${String(office.id).padStart(6, '0')}` }}
                </p>
              </div>
              <Icon name="ph:qr-code" class="h-4 w-4 opacity-30" />
            </div>
            <p v-if="myOffices.length > 4" class="text-center text-[11px]" :class="mutedText">
              +{{ myOffices.length - 4 }} more
            </p>
          </div>

          <div v-else class="flex flex-col items-center gap-3 py-6 text-center">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5">
              <Icon name="ph:building-office" class="h-5 w-5" :class="mutedText" />
            </div>
            <p class="text-xs" :class="mutedText">No offices assigned yet.</p>
            <NuxtLink to="/employee/offices" class="text-xs font-semibold text-candy-orange hover:text-candy-hover">
              Register one →
            </NuxtLink>
          </div>
        </div>

        <!-- LOCAL: Tasks / GLOBAL: Queue Stats -->
        <Transition name="scope-fade" mode="out-in">
          <!-- LOCAL view: Tasks -->
          <div
            v-if="currentScope === 'LOCAL'"
            key="tasks"
            class="flex-1 rounded-2xl border p-5 transition-all duration-200"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
          >
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-sm font-bold">Assigned Tasks</h2>
              <NuxtLink to="/employee/working" class="text-xs font-semibold text-candy-orange hover:text-candy-hover">
                View all →
              </NuxtLink>
            </div>
            <div class="space-y-2.5">
              <div
                v-for="task in tasks"
                :key="task.id"
                class="flex items-center gap-3 rounded-xl border p-3 transition-colors"
                :class="isDark ? 'border-onyx-border hover:bg-white/[0.03]' : 'border-gray-100 hover:bg-gray-50'"
              >
                <span
                  class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                  :class="task.priority === 'High'
                    ? 'bg-red-500/10 text-red-500'
                    : task.priority === 'Medium'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-emerald-500/10 text-emerald-500'"
                >
                  {{ task.priority[0] }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-medium" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                    {{ task.title }}
                  </p>
                  <p class="mt-0.5 text-[10px]" :class="mutedText">Due {{ task.due }}</p>
                </div>
                <span
                  class="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  :class="task.status === 'In Progress'
                    ? 'bg-candy-orange/10 text-candy-orange'
                    : isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'"
                >
                  {{ task.status }}
                </span>
              </div>
            </div>
          </div>

          <!-- GLOBAL view: Tracking queue stats -->
          <div
            v-else
            key="queue-stats"
            class="flex-1 rounded-2xl border p-5 transition-all duration-200"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
          >
            <div class="mb-4 flex items-center justify-between">
              <div>
                <h2 class="text-sm font-bold">Tracking Queue</h2>
                <p class="mt-0.5 text-[11px]" :class="mutedText">Live org-wide pipeline</p>
              </div>
              <NuxtLink to="/employee/working" class="text-xs font-semibold text-candy-orange hover:text-candy-hover">
                Full queue →
              </NuxtLink>
            </div>

            <div v-if="queueLoading" class="space-y-2">
              <div v-for="n in 4" :key="n" class="h-10 animate-pulse rounded-xl" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
            </div>

            <div v-else class="space-y-2.5">
              <div
                v-for="stat in queueStats"
                :key="stat.label"
                class="flex items-center gap-3 rounded-xl border p-3"
                :class="isDark ? 'border-onyx-border bg-white/[0.02]' : 'border-gray-100 bg-gray-50'"
              >
                <span class="h-2.5 w-2.5 flex-none rounded-full" :class="stat.dot" />
                <span class="flex-1 text-xs font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
                  {{ stat.label }}
                </span>
                <span class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ stat.count }}
                </span>
              </div>

              <div
                class="mt-2 rounded-xl border px-3 py-2.5 text-center text-[11px] font-semibold text-candy-orange"
                :class="isDark ? 'border-candy-orange/20 bg-candy-orange/5' : 'border-orange-200 bg-orange-50'"
              >
                {{ queueSummary.total }} total in-flight documents
              </div>
            </div>
          </div>
        </Transition>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { gsap } from 'gsap'

definePageMeta({ layout: 'employee' })

const auth = useAuthStore()
const { isDark } = useTheme()

// ── Types ──────────────────────────────────────────────────────────────
type Scope = 'LOCAL' | 'GLOBAL'

interface LedgerDoc {
  id: string
  title: string | null
  status: string | null
  tracking_status?: string | null
  office_id?: string | null
  office_label?: string | null
  origin_label?: string | null
  current_label?: string | null
  is_own_upload: boolean
  created_at: string
}

interface OfficeRecord {
  id: string | number
  name: string
  code?: string
}

interface QueueSummary {
  total: number
  created: number
  picked_up: number
  in_transit: number
  arrived_at_office: number
  completed: number
}

// ── Scope state ────────────────────────────────────────────────────────
const currentScope = ref<Scope>('LOCAL')

const scopeOptions: { value: Scope; label: string; icon: string }[] = [
  { value: 'LOCAL',  label: 'Office View',  icon: 'ph:buildings-fill' },
  { value: 'GLOBAL', label: 'Org View',     icon: 'ph:globe-hemisphere-west-fill' },
]

// ── Sliding indicator geometry ─────────────────────────────────────────
const tabRefs = ref<Record<string, HTMLElement>>({})
const indicatorStyle = ref({ left: '6px', width: '120px' })

const setTabRef = (el: any, value: string) => {
  if (el instanceof HTMLElement) tabRefs.value[value] = el
}

const updateIndicator = () => {
  nextTick(() => {
    const btn = tabRefs.value[currentScope.value]
    if (!btn) return
    indicatorStyle.value = {
      left:  `${btn.offsetLeft}px`,
      width: `${btn.offsetWidth}px`,
    }
  })
}

const setScope = (scope: Scope) => {
  if (currentScope.value === scope) return
  currentScope.value = scope
}

// ── Data state ─────────────────────────────────────────────────────────
const ledger         = ref<LedgerDoc[]>([])
const ledgerLoading  = ref(false)
const myOffices      = ref<OfficeRecord[]>([])
const officesLoading = ref(false)
const queueSummary   = ref<QueueSummary>({ total: 0, created: 0, picked_up: 0, in_transit: 0, arrived_at_office: 0, completed: 0 })
const queueLoading   = ref(false)

// ── GSAP refs ──────────────────────────────────────────────────────────
const pageRoot  = ref<HTMLElement | null>(null)
const headerEl  = ref<HTMLElement | null>(null)
const bannerEl  = ref<HTMLElement | null>(null)
const kpiEl     = ref<HTMLElement | null>(null)
const mainGridEl = ref<HTMLElement | null>(null)

// ── Theming ────────────────────────────────────────────────────────────
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

// ── Computed KPI cards (scope-aware, data-driven) ──────────────────────
const kpiCards = computed(() => {
  if (currentScope.value === 'LOCAL') {
    const own     = ledger.value.filter((d) => d.is_own_upload).length
    const pending = ledger.value.filter((d) => (d.status ?? '').toLowerCase() === 'pending').length
    const transit = ledger.value.filter((d) => d.tracking_status === 'IN_TRANSIT').length
    return [
      {
        label: 'Office Docs', value: String(ledger.value.length),
        trend: 'in your offices', trendColor: 'text-candy-orange',
        icon: 'ph:files-fill', iconBg: 'bg-candy-orange/10 ring-candy-orange/20', iconColor: 'text-candy-orange',
      },
      {
        label: 'My Uploads', value: String(own),
        trend: 'uploaded by you', trendColor: mutedText.value,
        icon: 'ph:upload-simple-fill', iconBg: 'bg-emerald-500/10 ring-emerald-500/20', iconColor: 'text-emerald-500',
      },
      {
        label: 'Pending', value: String(pending),
        trend: 'awaiting action', trendColor: pending > 0 ? 'text-amber-500' : mutedText.value,
        icon: 'ph:clock-countdown-fill', iconBg: 'bg-amber-500/10 ring-amber-500/20', iconColor: 'text-amber-500',
      },
      {
        label: 'In Transit', value: String(transit),
        trend: 'currently moving', trendColor: transit > 0 ? 'text-blue-400' : mutedText.value,
        icon: 'ph:package-fill', iconBg: 'bg-blue-500/10 ring-blue-500/20', iconColor: 'text-blue-400',
      },
    ]
  }

  // GLOBAL view
  const { total, in_transit, arrived_at_office, completed } = queueSummary.value
  return [
    {
      label: 'Total Org Docs', value: String(total),
      trend: 'across organisation', trendColor: 'text-candy-orange',
      icon: 'ph:files-fill', iconBg: 'bg-candy-orange/10 ring-candy-orange/20', iconColor: 'text-candy-orange',
    },
    {
      label: 'In Transit', value: String(in_transit),
      trend: 'with messengers', trendColor: in_transit > 0 ? 'text-blue-400' : mutedText.value,
      icon: 'ph:truck-fill', iconBg: 'bg-blue-500/10 ring-blue-500/20', iconColor: 'text-blue-400',
    },
    {
      label: 'At Office', value: String(arrived_at_office),
      trend: 'awaiting next step', trendColor: arrived_at_office > 0 ? 'text-teal-500' : mutedText.value,
      icon: 'ph:buildings-fill', iconBg: 'bg-teal-500/10 ring-teal-500/20', iconColor: 'text-teal-500',
    },
    {
      label: 'Completed', value: String(completed),
      trend: 'fully delivered', trendColor: completed > 0 ? 'text-emerald-500' : mutedText.value,
      icon: 'ph:check-circle-fill', iconBg: 'bg-emerald-500/10 ring-emerald-500/20', iconColor: 'text-emerald-500',
    },
  ]
})

// Pipeline chips for GLOBAL view
const pipelineChips = computed(() => [
  { label: 'Created',   count: queueSummary.value.created,           dot: 'bg-candy-orange' },
  { label: 'Picked Up', count: queueSummary.value.picked_up,         dot: 'bg-purple-400' },
  { label: 'In Transit',count: queueSummary.value.in_transit,        dot: 'bg-blue-400' },
  { label: 'At Office', count: queueSummary.value.arrived_at_office, dot: 'bg-teal-400' },
  { label: 'Completed', count: queueSummary.value.completed,         dot: 'bg-emerald-400' },
])

// Queue stats list for right panel
const queueStats = computed(() => [
  { label: 'Created — awaiting pickup',     count: queueSummary.value.created,           dot: 'bg-candy-orange' },
  { label: 'Picked Up',                     count: queueSummary.value.picked_up,         dot: 'bg-purple-400' },
  { label: 'In Transit',                    count: queueSummary.value.in_transit,        dot: 'bg-blue-400' },
  { label: 'Arrived at Office',             count: queueSummary.value.arrived_at_office, dot: 'bg-teal-400' },
  { label: 'Completed',                     count: queueSummary.value.completed,         dot: 'bg-emerald-400' },
])

// Static tasks (LOCAL view only)
const tasks = [
  { id: 1, title: 'Review subsidy application batch #221', priority: 'High',   due: 'Today',    status: 'In Progress' },
  { id: 2, title: 'Verify identification docs — Q3',       priority: 'Medium', due: 'Tomorrow', status: 'Pending' },
  { id: 3, title: 'Update SLA tracking records',           priority: 'Low',    due: 'Jun 18',   status: 'Pending' },
]

// ── Helpers ────────────────────────────────────────────────────────────
const formatDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value))
    : '—'

const statusClass = (s: string | null) => {
  switch ((s ?? '').toLowerCase()) {
    case 'approved':   return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    case 'pending':    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    case 'rejected':   return 'bg-red-500/10 text-red-600 dark:text-red-400'
    case 'processing': return 'bg-blue-500/10 text-blue-500'
    default:           return isDark.value ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
  }
}

const trackingBadge = (s: string) => {
  switch (s) {
    case 'COMPLETED':         return 'bg-emerald-500/10 text-emerald-500'
    case 'IN_TRANSIT':        return 'bg-blue-500/10 text-blue-400'
    case 'ARRIVED_AT_OFFICE': return 'bg-teal-500/10 text-teal-400'
    case 'PICKED_UP':         return 'bg-purple-500/10 text-purple-400'
    default:                  return 'bg-candy-orange/10 text-candy-orange'
  }
}

// ── Data fetching ──────────────────────────────────────────────────────
const fetchLedger = async () => {
  ledgerLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: LedgerDoc[] }>('/api/employee/ledger', {
      params: { scope: currentScope.value, limit: 30 },
    })
    ledger.value = res.data ?? []
  } catch (err) {
    console.error('[EmployeeDashboard] ledger fetch error:', err)
  } finally {
    ledgerLoading.value = false
  }
}

const fetchOffices = async () => {
  const orgId  = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return

  officesLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: OfficeRecord[] }>('/api/employee/my-offices', {
      params: { orgId, userId },
    })
    myOffices.value = res.data ?? []
  } catch (err) {
    console.error('[EmployeeDashboard] offices fetch error:', err)
  } finally {
    officesLoading.value = false
  }
}

const fetchQueue = async () => {
  if (currentScope.value !== 'GLOBAL') return
  queueLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; summary: QueueSummary }>('/api/tracking/queue', {
      params: { scope: 'GLOBAL', limit: 1 },
    })
    if (res.summary) queueSummary.value = res.summary
  } catch (err) {
    console.error('[EmployeeDashboard] queue fetch error:', err)
  } finally {
    queueLoading.value = false
  }
}

const reloadScopedData = async () => {
  await Promise.all([
    fetchLedger(),
    fetchQueue(),
  ])
  updateIndicator()
}

// ── GSAP Entrance Animation ────────────────────────────────────────────
const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  if (headerEl.value) {
    tl.fromTo(headerEl.value,
      { opacity: 0, y: -18 },
      { opacity: 1, y: 0, duration: 0.5 },
      0
    )
  }
  if (bannerEl.value) {
    tl.fromTo(bannerEl.value,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.45 },
      0.12
    )
  }
  if (kpiEl.value) {
    const cards = kpiEl.value.querySelectorAll(':scope > div')
    tl.fromTo(cards,
      { opacity: 0, y: 20, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.07 },
      0.22
    )
  }
  if (mainGridEl.value) {
    const sections = mainGridEl.value.querySelectorAll(':scope > *')
    tl.fromTo(sections,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 },
      0.38
    )
  }
}

// ── Watchers ───────────────────────────────────────────────────────────
watch(currentScope, () => reloadScopedData())

// ── Lifecycle ──────────────────────────────────────────────────────────
onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  runEntranceAnimation()
  await Promise.all([fetchLedger(), fetchOffices()])
  updateIndicator()
  setTimeout(updateIndicator, 150)
})
</script>

<style scoped>
/* Scope fade — used for KPI cards, ledger content, right-panel swap */
.scope-fade-enter-active { transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16,1,0.3,1); }
.scope-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.scope-fade-enter-from   { opacity: 0; transform: translateY(6px); }
.scope-fade-leave-to     { opacity: 0; transform: translateY(-4px); }

/* Scope slide — used for pipeline bar */
.scope-slide-enter-active { transition: all 0.28s cubic-bezier(0.16,1,0.3,1); }
.scope-slide-leave-active { transition: all 0.18s ease; }
.scope-slide-enter-from   { opacity: 0; transform: translateY(-8px); max-height: 0; }
.scope-slide-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
