<template>
  <section ref="pageRoot" class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
          <Icon name="ph:shield-star-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Super Admin</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Feedback & Reports</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          Feedback & Reports
        </h1>
        <p class="mt-1.5 text-sm" :class="mutedText">
          Operational reports and platform feedback submitted by users across every organization.
        </p>
      </div>
    </div>

    <!-- ── Filters ───────────────────────────────────────────────────── -->
    <div ref="filtersEl" class="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tab in typeTabs"
          :key="tab.value"
          type="button"
          class="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors border"
          :class="filters.type === tab.value
            ? 'bg-candy-orange text-white border-candy-orange'
            : isDark ? 'border-onyx-border text-gray-400 hover:bg-onyx-card' : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
          @click="filters.type = tab.value; fetchEntries()"
        >
          {{ tab.label }}
        </button>
      </div>
      <select
        v-model="filters.org_id"
        class="rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-candy-orange lg:ml-auto"
        :class="isDark ? 'border-onyx-border bg-onyx-card text-white' : 'border-gray-300 bg-white text-gray-900'"
        @change="fetchEntries()"
      >
        <option value="">All Organizations</option>
        <option v-for="org in orgs" :key="org.org_id" :value="org.org_id">{{ org.name }}</option>
      </select>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <!-- ── List ──────────────────────────────────────────────────────── -->
      <div
        ref="listEl"
        class="rounded-2xl border overflow-hidden lg:col-span-2 lg:h-[calc(100vh_-_18rem)] lg:overflow-y-auto"
        :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
      >
        <div v-if="loading" class="px-6 py-16 text-center" :class="mutedText">
          <Icon name="ph:spinner-gap-light" class="h-6 w-6 animate-spin mx-auto mb-3 text-candy-orange" />
          <p class="text-xs font-medium">Loading…</p>
        </div>
        <div v-else-if="!entries.length" class="px-6 py-16 text-center">
          <div class="flex flex-col items-center gap-3">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-candy-orange/10 border border-candy-orange/20">
              <Icon name="ph:chat-centered-text-light" class="h-7 w-7 text-candy-orange/60" />
            </div>
            <p class="font-semibold text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">Nothing here yet</p>
            <p class="text-xs" :class="mutedText">Reports and feedback will appear as users submit them.</p>
          </div>
        </div>
        <ul v-else class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
          <li
            v-for="entry in entries"
            :key="`${entry.kind}-${entry.id}`"
            class="cursor-pointer px-5 py-4 transition-colors"
            :class="[
              isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50/80',
              selected?.id === entry.id && selected?.kind === entry.kind ? (isDark ? 'bg-white/[0.04]' : 'bg-orange-50/60') : '',
            ]"
            @click="selected = entry"
          >
            <div class="flex items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-sm font-bold uppercase tracking-wide"
                :class="entry.kind === 'feedback'
                  ? (isDark ? 'bg-candy-orange/15 text-candy-orange' : 'bg-orange-50 text-candy-orange')
                  : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500')"
              >
                {{ entry.kind === 'feedback' ? 'Feedback' : entry.submitter_role }}
              </span>
              <p class="min-w-0 flex-1 truncate text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ entry.title }}</p>
            </div>
            <p class="mt-1 truncate text-xs" :class="mutedText">{{ entry.org_name || 'Unassigned org' }} · {{ entry.submitter_name || 'Unknown' }}</p>
            <p class="mt-1 text-sm" :class="mutedText">{{ formatTime(entry.created_at) }}</p>
          </li>
        </ul>
      </div>

      <!-- ── Detail ────────────────────────────────────────────────────── -->
      <div
        class="rounded-2xl border p-6 lg:col-span-3 lg:h-[calc(100vh_-_18rem)] lg:overflow-y-auto lg:sticky lg:top-0"
        :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
      >
        <div v-if="!selected" class="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
          <Icon name="ph:file-text-light" class="mb-3 h-10 w-10 text-candy-orange/40" />
          <p class="text-sm font-semibold" :class="isDark ? 'text-gray-300' : 'text-gray-700'">Select an entry</p>
          <p class="mt-1 text-xs" :class="mutedText">Choose a report or feedback item from the list to read its details.</p>
        </div>
        <div v-else>
          <div class="flex items-center gap-2">
            <span
              class="rounded-full px-2.5 py-1 text-sm font-bold uppercase tracking-wide"
              :class="selected.kind === 'feedback'
                ? (isDark ? 'bg-candy-orange/15 text-candy-orange' : 'bg-orange-50 text-candy-orange')
                : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500')"
            >
              {{ selected.kind === 'feedback' ? 'Platform Feedback' : selected.submitter_role }}
            </span>
            <span class="text-xs" :class="mutedText">{{ selected.report_type }}</span>
          </div>
          <h2 class="mt-3 text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ selected.title }}</h2>
          <p class="mt-1 text-xs" :class="mutedText">
            {{ selected.submitter_name || 'Unknown submitter' }} · {{ selected.org_name || 'Unassigned org' }} · {{ formatTime(selected.created_at) }}
          </p>
          <div class="mt-5 whitespace-pre-wrap rounded-xl border p-4 text-sm leading-relaxed" :class="isDark ? 'border-onyx-border bg-onyx-black/40 text-gray-200' : 'border-gray-100 bg-gray-50 text-gray-700'">
            {{ selected.body }}
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
useSeoMeta({ title: 'Super Admin · Feedback & Reports', description: 'Operational reports and platform feedback from every organization.' })

const { isDark } = useTheme()
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

const typeTabs = [
  { value: 'all', label: 'All' },
  { value: 'report', label: 'Reports' },
  { value: 'feedback', label: 'Feedback' },
]

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const loading = ref(true)
const entries = ref([])
const orgs = ref([])
const selected = ref(null)
const filters = reactive({ type: 'all', org_id: '' })

async function fetchOrgs() {
  try {
    const res = await $fetch('/api/superadmin/orgs')
    orgs.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch organizations:', err)
  }
}

async function fetchEntries() {
  loading.value = true
  try {
    const res = await $fetch('/api/superadmin/reports', { params: { type: filters.type, org_id: filters.org_id } })
    entries.value = res.data || []
    selected.value = entries.value[0] || null
  } catch (err) {
    console.error('Failed to fetch reports:', err)
  } finally {
    loading.value = false
  }
}

// GSAP refs
const pageRoot = ref(null)
const headerEl = ref(null)
const filtersEl = ref(null)
const listEl = ref(null)

const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  if (filtersEl.value) tl.fromTo(filtersEl.value, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, 0.1)
  if (listEl.value) tl.fromTo(listEl.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.18)
}

onMounted(() => {
  runEntranceAnimation()
  fetchOrgs()
  fetchEntries()
})
</script>
