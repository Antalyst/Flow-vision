<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <header>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:chart-line-up-fill" class="h-4 w-4 text-candy-orange" />
        <span>Analytics</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="headingClass">Workload Analytics</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">Structural Processing Matrix</h1>
      <p class="mt-1 text-sm" :class="mutedClass">
        Average desk speed and bottleneck identification across office sectors.
      </p>
    </header>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="kpi in kpiCards" :key="kpi.label" class="rounded-none border p-4" :class="panelClass">
        <p class="text-[10px] font-bold uppercase tracking-wider" :class="mutedClass">{{ kpi.label }}</p>
        <p class="mt-1 text-xl font-bold" :class="headingClass">{{ kpi.value }}</p>
      </div>
    </div>

    <section class="overflow-hidden rounded-none border" :class="panelClass">
      <div class="border-b px-4 py-3" :class="borderClass">
        <h2 class="text-sm font-bold" :class="headingClass">Station Workload Matrix</h2>
        <p v-if="data?.summary.bottleneck_office" class="mt-1 text-xs text-candy-orange">
          Structural bottleneck: {{ data.summary.bottleneck_office }}
        </p>
      </div>

      <div v-if="loading" class="p-10 text-center text-sm" :class="mutedClass">Loading workload data…</div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b text-[10px] font-bold uppercase tracking-wider" :class="borderClass">
            <tr :class="mutedClass">
              <th class="px-4 py-3">Station</th>
              <th class="px-4 py-3">Pending Stack</th>
              <th class="px-4 py-3">Flagged</th>
              <th class="px-4 py-3">In Transit</th>
              <th class="px-4 py-3">Avg Desk Hours</th>
              <th class="px-4 py-3">Bottleneck</th>
            </tr>
          </thead>
          <tbody class="divide-y" :class="borderClass">
            <tr v-for="station in data?.stations ?? []" :key="station.office_id">
              <td class="px-4 py-3 font-semibold" :class="headingClass">{{ station.office_name }}</td>
              <td class="px-4 py-3 tabular-nums" :class="mutedClass">{{ station.pending_count }}</td>
              <td class="px-4 py-3 tabular-nums" :class="mutedClass">{{ station.flagged_count }}</td>
              <td class="px-4 py-3 tabular-nums" :class="mutedClass">{{ station.in_transit_count }}</td>
              <td class="px-4 py-3 tabular-nums" :class="mutedClass">{{ station.avg_hours_at_desk }}h</td>
              <td class="px-4 py-3">
                <span
                  v-if="station.is_bottleneck"
                  class="inline-flex rounded-none border border-candy-orange/40 px-2 py-0.5 text-[10px] font-bold uppercase text-candy-orange"
                >
                  High Load
                </span>
                <span v-else class="text-[10px]" :class="mutedClass">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'client' })

interface WorkloadPayload {
  summary: {
    total_active: number
    total_pending: number
    total_flagged: number
    bottleneck_office: string | null
    org_avg_step_hours: number
  }
  stations: Array<{
    office_id: string
    office_name: string
    pending_count: number
    flagged_count: number
    in_transit_count: number
    avg_hours_at_desk: number
    is_bottleneck: boolean
  }>
}

const { isDark } = useTheme()
const loading = ref(true)
const data = ref<WorkloadPayload | null>(null)

const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white'))
const borderClass = computed(() => (isDark.value ? 'border-onyx-border' : 'border-zinc-200'))

const kpiCards = computed(() => {
  const s = data.value?.summary
  return [
    { label: 'Active Docs', value: s?.total_active ?? 0 },
    { label: 'Pending Stack', value: s?.total_pending ?? 0 },
    { label: 'Flagged Items', value: s?.total_flagged ?? 0 },
    { label: 'Avg Step Hours', value: `${s?.org_avg_step_hours ?? 0}h` },
  ]
})

onMounted(async () => {
  try {
    const res = await $fetch<{ success: boolean; data: WorkloadPayload }>('/api/client/workload-analytics')
    data.value = res.data
  } finally {
    loading.value = false
  }
})
</script>
