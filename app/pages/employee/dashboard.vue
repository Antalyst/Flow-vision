<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-sm mb-2" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
          <Icon name="ph:squares-four-fill" class="w-4 h-4 text-sky-500" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right" class="w-3 h-3" />
          <span :class="isDark ? 'text-white font-medium' : 'text-gray-900 font-medium'">Dashboard</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          Hello, {{ auth.user?.full_name?.split(' ')[0] || 'Employee' }}!
        </h1>
        <p class="mt-1 text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
          Here's your workspace overview for today.
        </p>
      </div>

      <!-- Org scope badge -->
      <div
        v-if="auth.currentOrg"
        class="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm"
        :class="isDark ? 'bg-card-dark border-card-border text-gray-300' : 'bg-white border-gray-200 text-gray-700'"
      >
        <Icon name="ph:building-office-fill" class="w-4 h-4 text-sky-500" />
        <div>
          <span class="font-semibold">{{ auth.currentOrg.name }}</span>
          <span class="ml-2 text-xs font-mono opacity-60">{{ auth.currentOrg.code }}</span>
        </div>
      </div>
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <div
        v-for="card in kpiCards"
        :key="card.label"
        class="dashboard-card p-5 flex items-start gap-4"
      >
        <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
          :class="card.iconBg">
          <Icon :name="card.icon" class="w-5 h-5" :class="card.iconColor" />
        </span>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider" :class="isDark ? 'text-gray-400' : 'text-gray-500'">{{ card.label }}</p>
          <p class="mt-1 text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ card.value }}</p>
          <p class="mt-0.5 text-xs" :class="card.trendUp ? 'text-emerald-500' : 'text-red-500'">{{ card.trend }}</p>
        </div>
      </div>
    </div>

    <!-- Two-column lower section -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <!-- ── Personal Action Ledger (3/5 width) ────────────────────── -->
      <section class="dashboard-card lg:col-span-3 flex flex-col">
        <div class="flex items-center justify-between px-6 py-5 border-b"
          :class="isDark ? 'border-card-border' : 'border-gray-100'">
          <div>
            <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
              Personal Action Ledger
            </h2>
            <p class="text-xs mt-0.5" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              Documents you uploaded or are assigned to your offices
            </p>
          </div>
          <div class="flex items-center gap-2">
            <!-- Scope pill -->
            <span
              class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              :class="isDark ? 'bg-sky-500/10 text-sky-400' : 'bg-sky-50 text-sky-600'"
            >
              <Icon name="ph:shield-check-fill" class="h-3 w-3" />
              Isolated
            </span>
            <NuxtLink
              to="/employee/documents"
              class="text-xs font-semibold text-sky-500 hover:text-sky-400 transition-colors"
            >
              View all →
            </NuxtLink>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="ledgerLoading" class="flex-1 flex flex-col gap-3 p-5">
          <div
            v-for="n in 4"
            :key="n"
            class="h-14 animate-pulse rounded-xl"
            :class="isDark ? 'bg-white/5' : 'bg-gray-100'"
          />
        </div>

        <!-- Ledger rows -->
        <div v-else-if="ledger.length" class="flex-1 overflow-y-auto divide-y"
          :class="isDark ? 'divide-card-border' : 'divide-gray-100'">
          <div
            v-for="doc in ledger"
            :key="doc.id"
            class="flex items-start gap-4 px-6 py-4 transition-colors"
            :class="isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50'"
          >
            <!-- Icon -->
            <span
              class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              :class="doc.is_own_upload
                ? (isDark ? 'bg-sky-500/10' : 'bg-sky-50')
                : (isDark ? 'bg-purple-500/10' : 'bg-purple-50')"
            >
              <Icon
                :name="doc.is_own_upload ? 'ph:upload-simple-fill' : 'ph:buildings-fill'"
                class="h-4 w-4"
                :class="doc.is_own_upload ? 'text-sky-500' : 'text-purple-500'"
              />
            </span>

            <!-- Content -->
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold" :class="isDark ? 'text-gray-100' : 'text-gray-800'">
                {{ doc.title || 'Untitled Document' }}
              </p>
              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]"
                :class="isDark ? 'text-gray-500' : 'text-gray-400'">
                <span v-if="doc.office_label" class="flex items-center gap-1">
                  <Icon name="ph:building-office" class="h-3 w-3" />
                  {{ doc.office_label }}
                </span>
                <span>{{ formatDate(doc.created_at) }}</span>
                <span v-if="doc.is_own_upload" class="text-sky-500 font-medium">You uploaded</span>
                <span v-else class="text-purple-500 font-medium">Office assigned</span>
              </div>
            </div>

            <!-- Status badge -->
            <span
              class="flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              :class="statusClass(doc.status)"
            >
              {{ doc.status || 'Unknown' }}
            </span>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center"
        >
          <Icon name="ph:clipboard-text" class="h-10 w-10 text-gray-300" />
          <p class="text-sm" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            No documents in your personal ledger yet.
          </p>
        </div>
      </section>

      <!-- ── Right column (2/5) ────────────────────────────────────── -->
      <div class="lg:col-span-2 flex flex-col gap-5">
        <!-- My Offices Quick View -->
        <div class="dashboard-card p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">My Sub-Offices</h2>
              <p class="text-xs mt-0.5" :class="isDark ? 'text-gray-500' : 'text-gray-400'">Registered branches</p>
            </div>
            <NuxtLink
              to="/employee/offices"
              class="inline-flex items-center gap-1 text-xs font-semibold text-sky-500 hover:text-sky-400 transition-colors"
            >
              Manage →
            </NuxtLink>
          </div>

          <div v-if="officesLoading" class="space-y-2">
            <div
              v-for="n in 2" :key="n"
              class="h-10 animate-pulse rounded-lg"
              :class="isDark ? 'bg-white/5' : 'bg-gray-100'"
            />
          </div>

          <div v-else-if="myOffices.length" class="space-y-2">
            <div
              v-for="office in myOffices.slice(0, 4)"
              :key="office.id"
              class="flex items-center gap-3 rounded-lg border p-3 transition-colors"
              :class="isDark ? 'border-card-border hover:bg-white/[0.025]' : 'border-gray-100 hover:bg-gray-50'"
            >
              <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                <Icon name="ph:buildings-fill" class="h-3.5 w-3.5 text-sky-500" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                  {{ office.name }}
                </p>
                <p class="font-mono text-[10px]" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
                  {{ office.code || `OFF-${String(office.id).padStart(6, '0')}` }}
                </p>
              </div>
              <Icon name="ph:qr-code" class="h-4 w-4 text-gray-300" />
            </div>

            <p v-if="myOffices.length > 4" class="text-center text-[11px]"
              :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              +{{ myOffices.length - 4 }} more offices
            </p>
          </div>

          <div v-else class="flex flex-col items-center gap-3 py-6 text-center">
            <Icon name="ph:building-office" class="h-8 w-8 text-gray-300" />
            <p class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">No offices assigned yet.</p>
            <NuxtLink
              to="/employee/offices"
              class="text-xs font-semibold text-sky-500 hover:text-sky-400 transition-colors"
            >
              Register one →
            </NuxtLink>
          </div>
        </div>

        <!-- Assigned Tasks -->
        <div class="dashboard-card flex-1 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Assigned Tasks</h2>
            <NuxtLink to="/employee/working" class="text-xs font-semibold text-sky-500 hover:text-sky-400 transition-colors">
              View all →
            </NuxtLink>
          </div>

          <div class="space-y-3">
            <div
              v-for="task in tasks"
              :key="task.id"
              class="flex items-center gap-3 rounded-xl border p-3.5 transition-colors"
              :class="isDark ? 'border-card-border hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50'"
            >
              <span
                class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                :class="task.priority === 'High' ? 'bg-red-500/10 text-red-500' : task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'"
              >
                {{ task.priority[0] }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium truncate" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ task.title }}</p>
                <p class="text-[10px] mt-0.5" :class="isDark ? 'text-gray-500' : 'text-gray-400'">Due {{ task.due }}</p>
              </div>
              <span
                class="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                :class="task.status === 'In Progress' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'"
              >
                {{ task.status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'employee' })

const auth = useAuthStore()
const { isDark } = useTheme()

// ── Types ──────────────────────────────────────────────────────────────
interface LedgerDoc {
  id: string
  title: string | null
  status: string | null
  office_id: number | null
  office_label: string | null
  is_own_upload: boolean
  created_at: string
}

interface OfficeRecord {
  id: number
  name: string
  code?: string
}

// ── State ──────────────────────────────────────────────────────────────
const ledger         = ref<LedgerDoc[]>([])
const ledgerLoading  = ref(false)
const myOffices      = ref<OfficeRecord[]>([])
const officesLoading = ref(false)

// ── KPI cards (static placeholder — replace with real queries later) ───
const kpiCards = [
  { label: 'Tasks Today',    value: '12', trend: '+3 since yesterday', trendUp: true,  icon: 'ph:check-square-fill',    iconBg: 'bg-sky-500/10',     iconColor: 'text-sky-500' },
  { label: 'Docs Processed', value: '48', trend: '+8% this week',      trendUp: true,  icon: 'ph:files-fill',           iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
  { label: 'Pending Review', value: '5',  trend: '-2 from yesterday',  trendUp: false, icon: 'ph:clock-countdown-fill', iconBg: 'bg-amber-500/10',   iconColor: 'text-amber-500' },
]

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

const statusClass = (status: string | null) => {
  switch ((status ?? '').toLowerCase()) {
    case 'approved': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    case 'pending':  return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    case 'rejected': return 'bg-red-500/10 text-red-600 dark:text-red-400'
    default:         return isDark.value ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
  }
}

// ── Data fetching ──────────────────────────────────────────────────────
const fetchLedger = async () => {
  const orgId  = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return

  ledgerLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: LedgerDoc[] }>('/api/employee/ledger', {
      params: { orgId, userId, limit: 20 },
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

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await Promise.all([fetchLedger(), fetchOffices()])
})
</script>
