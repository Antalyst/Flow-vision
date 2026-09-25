<template>
  <section ref="pageRoot" class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
          <Icon name="ph:shield-star-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Super Admin</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Dashboard</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          Platform Overview
        </h1>
        <p class="mt-1.5 text-sm" :class="mutedText">
          A birds-eye view of every organization, account, and document on FlowVision.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
        :class="isDark ? 'border-onyx-border text-gray-300 hover:bg-onyx-card' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
        :disabled="loading"
        @click="fetchDashboard"
      >
        <Icon name="ph:arrow-clockwise-light" class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
        Refresh
      </button>
    </div>

    <!-- ── KPI Cards ─────────────────────────────────────────────────── -->
    <div ref="kpiEl" class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="card in kpiCards"
        :key="card.label"
        class="rounded-2xl border p-5"
        :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
      >
        <div class="flex items-center justify-between">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-candy-orange/10 border border-candy-orange/20">
            <Icon :name="card.icon" class="h-5 w-5 text-candy-orange" />
          </span>
        </div>
        <p class="mt-4 text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
          {{ loading ? '—' : card.value.toLocaleString() }}
        </p>
        <p class="mt-1 text-xs font-medium" :class="mutedText">{{ card.label }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- ── Accounts by Role ────────────────────────────────────────── -->
      <div
        ref="roleEl"
        class="rounded-2xl border p-6 lg:col-span-1"
        :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
      >
        <h2 class="text-sm font-bold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">Accounts by Role</h2>
        <div class="space-y-4">
          <div v-for="role in roleBreakdown" :key="role.label">
            <div class="flex items-center justify-between mb-1.5 text-xs font-semibold">
              <span :class="isDark ? 'text-gray-300' : 'text-gray-700'">{{ role.label }}</span>
              <span :class="mutedText">{{ role.value }}</span>
            </div>
            <div class="h-2 w-full rounded-full overflow-hidden" :class="isDark ? 'bg-white/5' : 'bg-gray-100'">
              <div
                class="h-full rounded-full bg-candy-orange transition-all duration-500"
                :style="{ width: `${role.pct}%` }"
              />
            </div>
          </div>
        </div>
        <div class="mt-5 pt-5 border-t flex items-center justify-between text-xs font-semibold" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
          <span :class="mutedText">Active / Suspended</span>
          <span :class="isDark ? 'text-white' : 'text-gray-900'">
            <span class="text-success">{{ totals.activeUsers }}</span>
            <span :class="mutedText"> / </span>
            <span class="text-danger">{{ totals.inactiveUsers }}</span>
          </span>
        </div>
      </div>

      <!-- ── Recent Activity ─────────────────────────────────────────── -->
      <div
        ref="activityEl"
        class="rounded-2xl border overflow-hidden lg:col-span-1"
        :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
      >
        <div class="flex items-center justify-between border-b px-5 py-4" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
          <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Recent Activity</h2>
          <NuxtLink to="/superadmin/activity" class="text-xs font-semibold text-candy-orange hover:text-candy-hover">View all</NuxtLink>
        </div>
        <div class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
          <div v-if="!loading && !recentActivity.length" class="px-5 py-8 text-center text-xs" :class="mutedText">
            No activity recorded yet.
          </div>
          <div v-for="entry in recentActivity" :key="entry.id" class="px-5 py-3.5">
            <p class="text-xs font-semibold truncate" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
              {{ entry.actor_name || entry.user_name || 'System' }}
              <span class="font-normal" :class="mutedText">· {{ entry.org_name || 'Unassigned org' }}</span>
            </p>
            <p class="mt-0.5 text-xs truncate" :class="mutedText">{{ entry.message || entry.details }}</p>
            <p class="mt-1 text-sm text-gray-400 dark:text-gray-600">{{ formatTime(entry.created_at) }}</p>
          </div>
        </div>
      </div>

      <!-- ── Recent Feedback & Reports ────────────────────────────────── -->
      <div
        ref="reportsEl"
        class="rounded-2xl border overflow-hidden lg:col-span-1"
        :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
      >
        <div class="flex items-center justify-between border-b px-5 py-4" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
          <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Recent Reports</h2>
          <NuxtLink to="/superadmin/feedback" class="text-xs font-semibold text-candy-orange hover:text-candy-hover">View all</NuxtLink>
        </div>
        <div class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
          <div v-if="!loading && !recentReports.length" class="px-5 py-8 text-center text-xs" :class="mutedText">
            No reports submitted yet.
          </div>
          <div v-for="entry in recentReports" :key="entry.id" class="px-5 py-3.5">
            <div class="flex items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-sm font-bold uppercase tracking-wide"
                :class="isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'">
                {{ entry.submitter_role }}
              </span>
              <p class="text-xs font-semibold truncate" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ entry.title }}</p>
            </div>
            <p class="mt-1.5 text-sm text-gray-400 dark:text-gray-600">{{ formatTime(entry.created_at) }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'
import { gsap } from 'gsap'

definePageMeta({ layout: 'superadmin' })
useSeoMeta({ title: 'Super Admin · Platform Overview', description: 'Platform-wide accounts, activity, and report totals.' })

const { isDark } = useTheme()
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

const loading = ref(true)
const totals = reactive({
  organizations: 0, clients: 0, employees: 0, employeeSubUsers: 0, messengers: 0,
  totalUsers: 0, activeUsers: 0, inactiveUsers: 0, documents: 0,
})
const recentActivity = ref([])
const recentReports = ref([])

const kpiCards = computed(() => [
  { label: 'Organizations', value: totals.organizations, icon: 'ph:buildings-light' },
  { label: 'Total Accounts', value: totals.totalUsers, icon: 'ph:users-three-light' },
  { label: 'Active Accounts', value: totals.activeUsers, icon: 'ph:check-circle-light' },
  { label: 'Documents Tracked', value: totals.documents, icon: 'ph:files-light' },
])

const roleBreakdown = computed(() => {
  const max = Math.max(totals.clients, totals.employees, totals.employeeSubUsers, totals.messengers, 1)
  return [
    { label: 'Clients', value: totals.clients, pct: (totals.clients / max) * 100 },
    { label: 'Employees', value: totals.employees, pct: (totals.employees / max) * 100 },
    { label: 'Sub-Users', value: totals.employeeSubUsers, pct: (totals.employeeSubUsers / max) * 100 },
    { label: 'Messengers', value: totals.messengers, pct: (totals.messengers / max) * 100 },
  ]
})

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

async function fetchDashboard() {
  loading.value = true
  try {
    const res = await $fetch('/api/superadmin/dashboard')
    Object.assign(totals, res.data.totals)
    recentActivity.value = res.data.recentActivity || []
    recentReports.value = res.data.recentReports || []
  } catch (err) {
    console.error('Failed to load dashboard:', err)
  } finally {
    loading.value = false
  }
}

// GSAP refs
const pageRoot = ref(null)
const headerEl = ref(null)
const kpiEl = ref(null)
const roleEl = ref(null)
const activityEl = ref(null)
const reportsEl = ref(null)

const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  if (kpiEl.value) tl.fromTo(kpiEl.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.14)
  ;[roleEl, activityEl, reportsEl].forEach((el, i) => {
    if (el.value) tl.fromTo(el.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.2 + i * 0.06)
  })
}

onMounted(() => {
  runEntranceAnimation()
  fetchDashboard()
})
</script>
