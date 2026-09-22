<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <header>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:shield-check-fill" class="h-4 w-4 text-candy-orange" />
        <span>Reports & Insights</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="headingClass">On-Time Status</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">On-Time Status</h1>
      <p class="mt-1 max-w-2xl text-sm" :class="mutedClass">
        Every stop has a time limit. Documents that go over are marked late.
      </p>
    </header>

    <div v-if="!loading" class="rounded-xl border p-4 text-sm font-medium" :class="[panelClass, headingClass]">
      <template v-if="summary.total === 0">No documents are currently being tracked.</template>
      <template v-else-if="summary.overdue === 0">All {{ summary.total }} documents are on time.</template>
      <template v-else>{{ summary.overdue }} of {{ summary.total }} documents are running late. {{ summary.in_compliance }} are on time.</template>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div v-for="chip in summaryChips" :key="chip.label" class="rounded-xl border p-4" :class="panelClass">
        <p class="text-sm font-bold uppercase tracking-wider" :class="mutedClass">{{ chip.label }}</p>
        <p class="mt-1 text-2xl font-bold" :class="chip.tone">{{ chip.value }}</p>
      </div>
    </div>

    <div
      v-if="!loading && looksUnusual"
      class="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm"
    >
      <Icon name="ph:warning-fill" class="mt-0.5 h-5 w-5 flex-shrink-0 text-danger" />
      <div>
        <p class="font-semibold text-danger">This looks unusual.</p>
        <p class="mt-0.5" :class="mutedClass">
          Every tracked document is showing as overdue, which is uncommon. Try refreshing — if it still looks like this, contact support so we can check for a data or configuration issue.
        </p>
      </div>
      <button type="button" class="ml-auto flex-shrink-0 text-xs font-semibold text-candy-orange" :disabled="loading" @click="loadData">
        Refresh
      </button>
    </div>

    <section class="overflow-hidden rounded-2xl border" :class="panelClass">
      <div class="flex items-center justify-between border-b px-4 py-3" :class="borderClass">
        <h2 class="text-sm font-bold" :class="headingClass">Documents Being Tracked</h2>
        <button type="button" class="text-xs font-semibold text-candy-orange" :disabled="loading" @click="loadData">Refresh</button>
      </div>

      <div v-if="loading" class="p-10 text-center text-sm" :class="mutedClass">Checking document status…</div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b text-sm font-bold uppercase tracking-wider" :class="borderClass">
            <tr :class="mutedClass">
              <th class="px-4 py-3">Document</th>
              <th class="px-4 py-3">Current Location</th>
              <th class="px-4 py-3">Time There</th>
              <th class="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y" :class="borderClass">
            <tr v-for="row in rows" :key="row.id" class="transition hover:opacity-90">
              <td class="px-4 py-3 font-semibold" :class="headingClass">{{ row.title }}</td>
              <td class="px-4 py-3 text-xs" :class="mutedClass">
                {{ row.checkpoint_label }}
                <span class="block text-sm tabular-nums opacity-70">Step {{ row.current_step }} of {{ row.total_steps }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="h-1.5 w-20 overflow-hidden rounded-full" :class="isDark ? 'bg-white/10' : 'bg-gray-200'">
                    <div
                      class="h-full rounded-full"
                      :class="row.sla_status === 'overdue' ? 'bg-danger' : 'bg-candy-orange'"
                      :style="{ width: `${Math.min(100, (row.hours_at_checkpoint / row.sla_hours_allowed) * 100)}%` }"
                    />
                  </div>
                  <span class="text-xs tabular-nums whitespace-nowrap" :class="mutedClass">
                    {{ humanizeTime(row) }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full border px-2 py-0.5 text-sm font-bold uppercase tracking-wide"
                  :class="row.sla_status === 'overdue'
                    ? 'border-danger/40 text-danger'
                    : 'border-candy-orange/40 text-candy-orange'"
                >
                  {{ row.sla_status === 'overdue' ? 'Late' : 'On Time' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!rows.length" class="p-10 text-center text-sm" :class="mutedClass">No active documents in the SLA queue.</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | On-Time Status',
  description: 'See which documents are on time and which are running late at their current stop.'
})
definePageMeta({ layout: 'client' })

interface SlaRow {
  id: string
  title: string
  tracking_id: string
  checkpoint_label: string
  current_step: number
  total_steps: number
  hours_at_checkpoint: number
  sla_hours_allowed: number
  sla_status: 'in_compliance' | 'overdue'
}

const { isDark } = useTheme()
const loading = ref(true)
const rows = ref<SlaRow[]>([])
const summary = ref({ total: 0, overdue: 0, in_compliance: 0 })

const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white'))
const borderClass = computed(() => (isDark.value ? 'border-onyx-border' : 'border-zinc-200'))

const summaryChips = computed(() => [
  { label: 'Being Tracked', value: summary.value.total, tone: headingClass.value },
  { label: 'On Time', value: summary.value.in_compliance, tone: 'text-candy-orange' },
  { label: 'Late', value: summary.value.overdue, tone: 'text-danger' },
])

// Flags the case where every active document is overdue — often a sign of stale/
// untouched data or a misconfigured SLA rather than a genuine, actionable crisis.
const looksUnusual = computed(() => summary.value.total > 0 && summary.value.overdue === summary.value.total)

// Turns raw "1478.3h used / 24h allowed" into a sentence a non-technical
// user can read at a glance, instead of making them do the subtraction.
const humanizeTime = (row: SlaRow) => {
  const overBy = row.hours_at_checkpoint - row.sla_hours_allowed
  if (overBy <= 0) {
    const remaining = Math.abs(overBy)
    return remaining >= 24 ? `${Math.round(remaining / 24)}d left` : `${Math.round(remaining)}h left`
  }
  return overBy >= 24 ? `Late by ${Math.round(overBy / 24)}d` : `Late by ${Math.round(overBy)}h`
}

const truncateId = (id: string) => (id.length > 16 ? `${id.slice(0, 12)}…` : id)

async function loadData() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; rows: SlaRow[]; summary: typeof summary.value }>('/api/client/sla-compliance')
    rows.value = res.rows ?? []
    summary.value = res.summary ?? { total: 0, overdue: 0, in_compliance: 0 }
  } catch (err) {
    console.error('[SLA]', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
