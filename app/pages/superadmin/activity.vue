<template>
  <section ref="pageRoot" class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
          <Icon name="ph:shield-star-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Super Admin</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Activity Log</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          Platform Activity Log
        </h1>
        <p class="mt-1.5 text-sm" :class="mutedText">
          Every tracked action taken by every user, across every organization.
        </p>
      </div>
      <div
        class="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold"
        :class="isDark ? 'border-onyx-border bg-onyx-card text-gray-300' : 'border-gray-200 bg-white text-gray-700'"
      >
        <span class="h-2 w-2 rounded-full bg-candy-orange" />
        {{ totalCount.toLocaleString() }} events
      </div>
    </div>

    <!-- ── Filters ───────────────────────────────────────────────────── -->
    <div ref="filtersEl" class="flex flex-col gap-3 lg:flex-row lg:items-center">
      <select
        v-model="filters.org_id"
        class="rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-candy-orange"
        :class="isDark ? 'border-onyx-border bg-onyx-card text-white' : 'border-gray-300 bg-white text-gray-900'"
        @change="offset = 0; fetchLogs()"
      >
        <option value="">All Organizations</option>
        <option v-for="org in orgs" :key="org.org_id" :value="org.org_id">{{ org.name }}</option>
      </select>
      <select
        v-model="filters.action_type"
        class="rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-candy-orange"
        :class="isDark ? 'border-onyx-border bg-onyx-card text-white' : 'border-gray-300 bg-white text-gray-900'"
        @change="offset = 0; fetchLogs()"
      >
        <option value="all">All Action Types</option>
        <option v-for="type in actionTypes" :key="type" :value="type">{{ formatActionType(type) }}</option>
      </select>
      <div class="relative flex-1">
        <Icon name="ph:magnifying-glass-light" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" :class="mutedText" />
        <input
          v-model="filters.search"
          type="text"
          placeholder="Search by user or message…"
          class="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-candy-orange"
          :class="isDark ? 'border-onyx-border bg-onyx-card text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
          @keyup.enter="offset = 0; fetchLogs()"
          @input="debouncedSearch()"
        />
      </div>
    </div>

    <!-- ── Timeline Card ──────────────────────────────────────────────── -->
    <div
      ref="cardEl"
      class="rounded-2xl border overflow-hidden"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
    >
      <div v-if="loading" class="px-6 py-16 text-center" :class="mutedText">
        <Icon name="ph:spinner-gap-light" class="h-6 w-6 animate-spin mx-auto mb-3 text-candy-orange" />
        <p class="text-xs font-medium">Loading activity…</p>
      </div>
      <div v-else-if="!logs.length" class="px-6 py-16 text-center">
        <div class="flex flex-col items-center gap-3">
          <div class="flex h-14 w-14 items-center justify-center rounded-full bg-candy-orange/10 border border-candy-orange/20">
            <Icon name="ph:activity-light" class="h-7 w-7 text-candy-orange/60" />
          </div>
          <p class="font-semibold text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">No activity found</p>
          <p class="text-xs" :class="mutedText">Try adjusting your filters.</p>
        </div>
      </div>
      <ul v-else class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
        <li v-for="entry in logs" :key="entry.id" class="flex items-start gap-4 px-6 py-4">
          <span class="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-candy-orange/10 border border-candy-orange/20">
            <Icon :name="actionIcon(entry.action_type)" class="h-4 w-4 text-candy-orange" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ entry.actor_name || entry.user_name || 'System' }}
              </p>
              <span class="rounded-full px-2 py-0.5 text-sm font-bold uppercase tracking-wide"
                :class="isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'">
                {{ formatActionType(entry.action_type) }}
              </span>
              <span v-if="entry.org_name" class="text-sm" :class="mutedText">· {{ entry.org_name }}</span>
            </div>
            <p class="mt-1 text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-600'">{{ entry.message }}</p>
            <p class="mt-1 text-sm" :class="mutedText">{{ formatTime(entry.created_at) }}</p>
          </div>
        </li>
      </ul>
    </div>

    <!-- ── Pagination ────────────────────────────────────────────────── -->
    <div v-if="!loading && totalCount > pageSize" class="flex items-center justify-between text-xs" :class="mutedText">
      <span>Showing {{ offset + 1 }}–{{ Math.min(offset + pageSize, totalCount) }} of {{ totalCount }}</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40"
          :class="isDark ? 'border-onyx-border hover:bg-onyx-card' : 'border-gray-200 hover:bg-gray-50'"
          :disabled="offset === 0"
          @click="offset = Math.max(0, offset - pageSize); fetchLogs()"
        >
          Previous
        </button>
        <button
          type="button"
          class="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40"
          :class="isDark ? 'border-onyx-border hover:bg-onyx-card' : 'border-gray-200 hover:bg-gray-50'"
          :disabled="offset + pageSize >= totalCount"
          @click="offset += pageSize; fetchLogs()"
        >
          Next
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'
import { gsap } from 'gsap'

definePageMeta({ layout: 'superadmin' })
useSeoMeta({ title: 'Super Admin · Activity Log', description: 'A chronological log of every tracked action across the platform.' })

const { isDark } = useTheme()
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

const actionTypes = ['upload', 'scan', 'pickup', 'dropoff', 'claim', 'issue_report', 'issue_resolve', 'advance', 'client_feedback', 'system']

function formatActionType(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function actionIcon(type) {
  const map = {
    upload: 'ph:upload-simple-light',
    scan: 'ph:scan-light',
    pickup: 'ph:hand-light',
    dropoff: 'ph:package-light',
    claim: 'ph:hand-pointing-light',
    issue_report: 'ph:warning-circle-light',
    issue_resolve: 'ph:check-circle-light',
    advance: 'ph:arrow-right-light',
    client_feedback: 'ph:chat-centered-text-light',
    system: 'ph:gear-six-light',
  }
  return map[type] || 'ph:activity-light'
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const loading = ref(true)
const logs = ref([])
const orgs = ref([])
const totalCount = ref(0)
const pageSize = 50
const offset = ref(0)

const filters = reactive({ org_id: '', action_type: 'all', search: '' })

let searchTimer = null
function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { offset.value = 0; fetchLogs() }, 400)
}

async function fetchOrgs() {
  try {
    const res = await $fetch('/api/superadmin/orgs')
    orgs.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch organizations:', err)
  }
}

async function fetchLogs() {
  loading.value = true
  try {
    const res = await $fetch('/api/superadmin/activity-logs', {
      params: {
        org_id: filters.org_id,
        action_type: filters.action_type,
        search: filters.search,
        limit: pageSize,
        offset: offset.value,
      },
    })
    logs.value = res.data || []
    totalCount.value = res.count || 0
  } catch (err) {
    console.error('Failed to fetch activity log:', err)
  } finally {
    loading.value = false
  }
}

// GSAP refs
const pageRoot = ref(null)
const headerEl = ref(null)
const filtersEl = ref(null)
const cardEl = ref(null)

const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  if (filtersEl.value) tl.fromTo(filtersEl.value, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, 0.1)
  if (cardEl.value) tl.fromTo(cardEl.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.18)
}

onMounted(() => {
  runEntranceAnimation()
  fetchOrgs()
  fetchLogs()
})
</script>
