<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <header>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:shield-check-fill" class="h-4 w-4 text-candy-orange" />
        <span>Analytics</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="headingClass">SLA Compliance</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">SLA Compliance</h1>
      <p class="mt-1 max-w-2xl text-sm" :class="mutedClass">
        Every stop has a time limit. Documents that go over are marked overdue.
      </p>
    </header>

    <div class="grid grid-cols-3 gap-3">
      <div v-for="chip in summaryChips" :key="chip.label" class="rounded-xl border p-4" :class="panelClass">
        <p class="text-[13px] font-bold uppercase tracking-wider" :class="mutedClass">{{ chip.label }}</p>
        <p class="mt-1 text-2xl font-bold" :class="chip.tone">{{ chip.value }}</p>
      </div>
    </div>

    <section class="overflow-hidden rounded-2xl border" :class="panelClass">
      <div class="flex items-center justify-between border-b px-4 py-3" :class="borderClass">
        <h2 class="text-sm font-bold" :class="headingClass">Documents Being Tracked</h2>
        <button type="button" class="text-xs font-semibold text-candy-orange" :disabled="loading" @click="loadData">Refresh</button>
      </div>

      <div v-if="loading" class="p-10 text-center text-sm" :class="mutedClass">Checking document status…</div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b text-[13px] font-bold uppercase tracking-wider" :class="borderClass">
            <tr :class="mutedClass">
              <th class="px-4 py-3">Document</th>
              <th class="px-4 py-3">Checkpoint</th>
              <th class="px-4 py-3">Time Used</th>
              <th class="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y" :class="borderClass">
            <tr v-for="row in rows" :key="row.id" class="transition hover:opacity-90">
              <td class="px-4 py-3 font-semibold" :class="headingClass">{{ row.title }}</td>
              <td class="px-4 py-3 text-xs" :class="mutedClass">
                {{ row.checkpoint_label }}
                <span class="block text-[14px] tabular-nums opacity-70">Step {{ row.current_step }} of {{ row.total_steps }}</span>
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
                    {{ row.hours_at_checkpoint }}h / {{ row.sla_hours_allowed }}h
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full border px-2 py-0.5 text-[13px] font-bold uppercase tracking-wide"
                  :class="row.sla_status === 'overdue'
                    ? 'border-danger/40 text-danger'
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
useSeoMeta({
  title: 'FlowVision | SLA Compliance',
  description: 'Track delivery compliance, deadline management, and service level agreement performance for your physical documents.'
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
  { label: 'Active', value: summary.value.total, tone: headingClass.value },
  { label: 'In Compliance', value: summary.value.in_compliance, tone: 'text-candy-orange' },
  { label: 'Overdue', value: summary.value.overdue, tone: 'text-danger' },
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
