<template>
  <section ref="pageRoot" class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
          <Icon name="ph:identification-badge-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Staff Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Dashboard</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          Welcome back{{ auth.user?.full_name ? `, ${firstName}` : '' }}
        </h1>
        <p class="mt-1.5 text-sm" :class="mutedText">
          Create documents, hand them off to a messenger, or deliver them yourself — anywhere in {{ auth.currentOrg?.name || 'your organization' }}.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          to="/staff/documents"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-candy-hover active:scale-[0.97]"
        >
          <Icon name="ph:upload-simple-light" class="h-4 w-4" />
          New Document
        </NuxtLink>
        <NuxtLink
          to="/staff/scan"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
          :class="isDark ? 'border-onyx-border text-gray-200 hover:bg-onyx-card' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
        >
          <Icon name="ph:scan-light" class="h-4 w-4" />
          Scan
        </NuxtLink>
      </div>
    </div>

    <!-- ── My Office ─────────────────────────────────────────────────── -->
    <div
      ref="officeEl"
      class="flex items-center gap-4 rounded-2xl border p-5"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
    >
      <sqpan class="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-candy-orange/10 border border-candy-orange/20">
        <Icon name="ph:buildings-light" class="h-5 w-5 text-candy-orange" />
      </sqpan>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wide" :class="mutedText">Your account belongs to</p>
        <p v-if="loadingOffice" class="mt-0.5 text-sm" :class="mutedText">Loading…</p>
        <p v-else-if="myOffice" class="mt-0.5 truncate text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
          {{ myOffice.name }}
        </p>
        <p v-else class="mt-0.5 text-sm" :class="mutedText">No office on record yet.</p>
      </div>
    </div>

    <!-- ── KPI Cards ─────────────────────────────────────────────────── -->
    <div ref="kpiEl" class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="card in kpiCards"
        :key="card.label"
        class="rounded-2xl border p-5"
        :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
      >
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-candy-orange/10 border border-candy-orange/20">
          <Icon :name="card.icon" class="h-5 w-5 text-candy-orange" />
        </span>
        <p class="mt-4 text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
          {{ loading ? '—' : card.value }}
        </p>
        <p class="mt-1 text-xs font-medium" :class="mutedText">{{ card.label }}</p>
      </div>
    </div>

    <!-- ── Recent Documents ──────────────────────────────────────────── -->
    <div
      ref="recentEl"
      class="rounded-2xl border overflow-hidden"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
    >
      <div class="flex items-center justify-between border-b px-5 py-4" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
        <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Recent Documents</h2>
        <NuxtLink to="/staff/documents" class="text-xs font-semibold text-candy-orange hover:text-candy-hover">View all</NuxtLink>
      </div>
      <div v-if="!loading && !recentDocs.length" class="px-5 py-10 text-center text-xs" :class="mutedText">
        No documents yet — create your first one.
      </div>
      <ul v-else class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
        <li v-for="doc in recentDocs" :key="doc.id" class="flex items-center justify-between px-5 py-3.5">
          <div class="min-w-0">
            <p class="text-xs font-semibold truncate" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ doc.title }}</p>
            <p class="mt-0.5 text-sm" :class="mutedText">{{ doc.office_label || doc.origin_label || '—' }} · {{ formatTime(doc.created_at) }}</p>
          </div>
          <span class="ml-3 flex-none rounded-full px-2.5 py-1 text-sm font-bold uppercase tracking-wide"
            :class="statusClass(doc.tracking_status)">
            {{ statusLabel(doc.tracking_status) }}
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useTheme } from '~/composables/useTheme'
import { gsap } from 'gsap'

definePageMeta({ layout: 'staff' })
useSeoMeta({ title: 'FlowVision | Staff Dashboard', description: 'Create documents, assign messengers, and manage deliveries across your organization.' })

const auth = useAuthStore()
const { isDark } = useTheme()
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const firstName = computed(() => (auth.user?.full_name || '').split(' ')[0])

const loading = ref(true)
const docs = ref([])
const myOffice = ref(null)
const loadingOffice = ref(true)

const recentDocs = computed(() => docs.value.slice(0, 8))

const kpiCards = computed(() => {
  const mine = docs.value.filter((d) => d.is_own_upload)
  const inTransit = docs.value.filter((d) => ['PICKED_UP', 'IN_TRANSIT'].includes(d.tracking_status))
  const completed = docs.value.filter((d) => d.tracking_status === 'COMPLETED')
  return [
    { label: 'Org Documents', value: docs.value.length, icon: 'ph:files-light' },
    { label: 'My Uploads', value: mine.length, icon: 'ph:upload-simple-light' },
    { label: 'In Transit', value: inTransit.length, icon: 'ph:truck-light' },
    { label: 'Completed', value: completed.length, icon: 'ph:check-circle-light' },
  ]
})

function statusLabel(status) {
  const map = {
    CREATED: 'Registered', PICKED_UP: 'Picked Up', IN_TRANSIT: 'In Transit',
    ARRIVED_AT_OFFICE: 'Arrived', DISCREPANCY_REPORTED: 'Flagged', COMPLETED: 'Completed',
  }
  return map[status] || status || '—'
}

function statusClass(status) {
  if (status === 'COMPLETED') return 'bg-success/10 text-success'
  if (status === 'DISCREPANCY_REPORTED') return 'bg-danger/10 text-danger'
  if (status === 'PICKED_UP' || status === 'IN_TRANSIT') return 'bg-candy-orange/10 text-candy-orange'
  return isDark.value ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

async function fetchMyOffice() {
  loadingOffice.value = true
  try {
    const res = await $fetch('/api/staff/my-office')
    myOffice.value = res.data || null
  } catch (err) {
    console.error('Failed to load your office:', err)
  } finally {
    loadingOffice.value = false
  }
}

async function fetchDashboard() {
  const orgId = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return
  loading.value = true
  try {
    const res = await $fetch('/api/employee/ledger', { params: { orgId, userId, scope: 'GLOBAL', limit: 200 } })
    docs.value = res.data || []
  } catch (err) {
    console.error('Failed to load staff dashboard:', err)
  } finally {
    loading.value = false
  }
}

// GSAP refs
const pageRoot = ref(null)
const headerEl = ref(null)
const officeEl = ref(null)
const kpiEl = ref(null)
const recentEl = ref(null)

const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  if (officeEl.value) tl.fromTo(officeEl.value, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45 }, 0.1)
  if (kpiEl.value) tl.fromTo(kpiEl.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.18)
  if (recentEl.value) tl.fromTo(recentEl.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.28)
}

onMounted(() => {
  runEntranceAnimation()
  if (auth.isLoggedIn && !auth.currentOrg) auth.fetchMyOrg()
  fetchMyOffice()
  fetchDashboard()
})
</script>
