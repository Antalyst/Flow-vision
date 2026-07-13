<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <header>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:shield-check-fill" class="h-4 w-4 text-candy-orange" />
        <span>Analytics</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="headingClass">SLA Compliance</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">Service Level Agreement Tracking</h1>
      <p class="mt-1 max-w-2xl text-sm" :class="mutedClass">
        Each office milestone has a target processing window. Documents exceeding that deadline are marked Overdue.
      </p>
    </header>

    <div class="grid grid-cols-3 gap-3">
      <div v-for="chip in summaryChips" :key="chip.label" class="rounded-none border p-4" :class="panelClass">
        <p class="text-[10px] font-bold uppercase tracking-wider" :class="mutedClass">{{ chip.label }}</p>
        <p class="mt-1 text-2xl font-bold" :class="chip.tone">{{ chip.value }}</p>
      </div>
    </div>

    <section class="overflow-hidden rounded-none border" :class="panelClass">
      <div class="flex items-center justify-between border-b px-4 py-3" :class="borderClass">
        <h2 class="text-sm font-bold" :class="headingClass">Active Document SLA Ledger</h2>
        <button type="button" class="text-xs font-semibold text-candy-orange" :disabled="loading" @click="loadData">Sync</button>
      </div>

      <div v-if="loading" class="p-10 text-center text-sm" :class="mutedClass">Calculating SLA positions…</div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b text-[10px] font-bold uppercase tracking-wider" :class="borderClass">
            <tr :class="mutedClass">
              <th class="px-4 py-3">Document</th>
              <th class="px-4 py-3">Tracking ID</th>
              <th class="px-4 py-3">Checkpoint</th>
              <th class="px-4 py-3">Step</th>
              <th class="px-4 py-3">Hours at Desk</th>
              <th class="px-4 py-3">SLA Window</th>
              <th class="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y" :class="borderClass">
            <tr v-for="row in rows" :key="row.id" class="transition hover:opacity-90">
              <td class="px-4 py-3 font-semibold" :class="headingClass">{{ row.title }}</td>
              <td class="px-4 py-3 font-mono text-xs" :class="mutedClass">{{ truncateId(row.tracking_id) }}</td>
              <td class="px-4 py-3 text-xs" :class="mutedClass">{{ row.checkpoint_label }}</td>
              <td class="px-4 py-3 text-xs tabular-nums" :class="mutedClass">{{ row.current_step }}/{{ row.total_steps }}</td>
              <td class="px-4 py-3 text-xs tabular-nums" :class="headingClass">{{ row.hours_at_checkpoint }}h</td>
              <td class="px-4 py-3 text-xs tabular-nums" :class="mutedClass">{{ row.sla_hours_allowed }}h</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-none border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  :class="row.sla_status === 'overdue'
                    ? 'border-red-500/40 text-red-600 dark:text-red-400'
                    : 'border-candy-orange/40 text-candy-orange'"
                >
                  {{ row.sla_status === 'overdue' ? 'Overdue' : 'In Compliance' }}
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
  { label: 'Active', value: summary.value.total, tone: headingClass.value },
  { label: 'In Compliance', value: summary.value.in_compliance, tone: 'text-candy-orange' },
  { label: 'Overdue', value: summary.value.overdue, tone: 'text-red-600 dark:text-red-400' },
])

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
