<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <header>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:chart-bar-fill" class="h-4 w-4 text-candy-orange" />
        <span>{{ portalLabel }}</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="headingClass">Reports</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">
        {{ pageTitle }}
      </h1>
      <p class="mt-1 text-sm" :class="mutedClass">{{ pageDescription }}</p>
    </header>

    <section
      v-if="context"
      class="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      <div
        v-for="stat in contextStats"
        :key="stat.label"
        class="rounded-lg border p-4"
        :class="panelClass"
      >
        <p class="text-[10px] font-bold uppercase tracking-wider" :class="mutedClass">{{ stat.label }}</p>
        <p class="mt-1 text-xl font-bold" :class="headingClass">{{ stat.value }}</p>
      </div>
    </section>

    <section class="rounded-lg border p-6" :class="panelClass">
      <h2 class="text-sm font-bold" :class="headingClass">Submit Operational Report</h2>
      <p class="mt-1 text-xs" :class="mutedClass">{{ submitHint }}</p>

      <form class="mt-5 space-y-4" @submit.prevent="submitReport">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedClass">Report Type</span>
          <select v-model="form.report_type" class="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-candy-orange" :class="inputClass">
            <option v-for="opt in reportTypes" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedClass">Title</span>
          <input v-model="form.title" type="text" required class="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-candy-orange" :class="inputClass" placeholder="Daily desk summary" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedClass">Summary / Incident Details</span>
          <textarea v-model="form.body" required rows="5" class="w-full resize-y rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-candy-orange" :class="inputClass" placeholder="Describe operational findings…" />
        </label>
        <button
          type="submit"
          class="inline-flex items-center gap-2 rounded-lg bg-candy-orange px-5 py-2.5 text-sm font-bold text-white-pure transition hover:opacity-90 disabled:opacity-50"
          :disabled="submitting"
        >
          <Icon v-if="submitting" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
          <Icon v-else name="ph:paper-plane-tilt-fill" class="h-4 w-4" />
          Submit Report
        </button>
      </form>
    </section>

    <section class="rounded-lg border" :class="panelClass">
      <div class="flex items-center justify-between border-b px-4 py-3" :class="borderClass">
        <h2 class="text-sm font-bold" :class="headingClass">Report Archive</h2>
        <button type="button" class="text-xs font-semibold text-candy-orange hover:underline" :disabled="loading" @click="loadReports">
          Refresh
        </button>
      </div>

      <div v-if="loading" class="p-8 text-center text-sm" :class="mutedClass">Loading reports…</div>
      <div v-else-if="!reports.length" class="p-8 text-center text-sm" :class="mutedClass">No reports submitted yet.</div>
      <div v-else class="divide-y" :class="borderClass">
        <article v-for="report in reports" :key="report.id" class="px-4 py-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="text-sm font-semibold" :class="headingClass">{{ report.title }}</p>
              <p class="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-candy-orange">
                {{ report.report_type.replace(/_/g, ' ') }}
              </p>
            </div>
            <span class="text-[10px] tabular-nums" :class="mutedClass">{{ formatDate(report.created_at) }}</span>
          </div>
          <p class="mt-2 text-xs leading-relaxed" :class="mutedClass">{{ report.body }}</p>
          <p v-if="report.submitter_name" class="mt-2 text-[10px]" :class="mutedClass">
            Submitted by {{ report.submitter_name }} · {{ report.submitter_role }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useClientToast } from '~/composables/useClientToast'

const props = defineProps<{
  role: 'client' | 'employee' | 'messenger'
}>()

const { isDark } = useTheme()
const { show: showToast } = useClientToast()

interface ReportRow {
  id: string
  title: string
  body: string
  report_type: string
  submitter_role: string
  submitter_name?: string | null
  created_at: string
}

const loading = ref(false)
const submitting = ref(false)
const reports = ref<ReportRow[]>([])
const context = ref<Record<string, number> | null>(null)

const form = reactive({
  report_type: props.role === 'messenger' ? 'trip_log' : props.role === 'employee' ? 'desk_summary' : 'lifecycle_summary',
  title: '',
  body: '',
})

const portalLabel = computed(() => ({
  client: 'Client Portal',
  employee: 'Employee Portal',
  messenger: 'Messenger Portal',
}[props.role]))

const pageTitle = computed(() => ({
  client: 'Organisation Reports',
  employee: 'Desk Operational Reports',
  messenger: 'Trip Log Reports',
}[props.role]))

const pageDescription = computed(() => ({
  client: 'Master logs of document lifecycles and field operational summaries broadcast from your network.',
  employee: 'Submit internal approval timelines and local compliance flags from your assigned desk.',
  messenger: 'Submit completed delivery summaries, pickup counts, and road processing notes.',
}[props.role]))

const submitHint = computed(() => ({
  client: 'Generate a lifecycle or submission summary for your organisation records.',
  employee: 'Submitting broadcasts a real-time alert to client organisation dashboards.',
  messenger: 'Submitting broadcasts a real-time alert to client organisation dashboards.',
}[props.role]))

const reportTypes = computed(() => {
  if (props.role === 'messenger') {
    return [
      { value: 'trip_log', label: 'Trip Log Summary' },
      { value: 'incident_log', label: 'Incident Log' },
    ]
  }
  if (props.role === 'employee') {
    return [
      { value: 'desk_summary', label: 'Desk Approval Summary' },
      { value: 'compliance_log', label: 'Compliance Flag Log' },
      { value: 'incident_log', label: 'Incident Log' },
    ]
  }
  return [
    { value: 'lifecycle_summary', label: 'Document Lifecycle Summary' },
    { value: 'incident_log', label: 'Incident Log' },
  ]
})

const contextStats = computed(() => {
  if (!context.value) return []
  if (props.role === 'messenger') {
    return [
      { label: 'Pickups', value: context.value.pickups ?? 0 },
      { label: 'Drop-offs', value: context.value.dropoffs ?? 0 },
      { label: 'Completed', value: context.value.completed_deliveries ?? 0 },
      { label: 'Active Span (h)', value: context.value.active_span_hours ?? 0 },
    ]
  }
  if (props.role === 'employee') {
    return [
      { label: 'Pending Reviews', value: context.value.pending_reviews ?? 0 },
      { label: 'Open Flags', value: context.value.open_compliance_flags ?? 0 },
      { label: 'Assigned Offices', value: context.value.assigned_offices ?? 0 },
    ]
  }
  return []
})

const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white'))
const borderClass = computed(() => (isDark.value ? 'border-onyx-border' : 'border-zinc-200'))
const inputClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-card text-white-pure' : 'border-zinc-200 bg-white text-onyx-black'))

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

async function loadReports() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: ReportRow[] }>('/api/reports')
    reports.value = res.data ?? []
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    showToast(e?.data?.message ?? 'Failed to load reports.', 'error')
  } finally {
    loading.value = false
  }
}

async function loadContext() {
  if (props.role === 'client') return
  try {
    const res = await $fetch<{ success: boolean; context: Record<string, number> }>('/api/reports/context')
    context.value = res.context ?? null
  } catch { /* silent */ }
}

async function submitReport() {
  submitting.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/reports/submit', {
      method: 'POST',
      body: { ...form },
    })
    showToast(res.message)
    form.title = ''
    form.body = ''
    await Promise.all([loadReports(), loadContext()])
    if (props.role === 'employee' || props.role === 'messenger') {
      const { refresh: refreshReportBadge } = useClientReportBadge()
      await refreshReportBadge()
    }
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    showToast(e?.data?.message ?? 'Failed to submit report.', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadReports(), loadContext()])
  if (props.role === 'client') {
    try {
      const { notifications, fetchNotifications, markAsRead } = useClientNotifications()
      await fetchNotifications(true)
      const operational = notifications.value.filter((n) =>
        (n.title || '').toLowerCase().includes('operational report'),
      )
      for (const row of operational) {
        await markAsRead(row.id)
      }
    } catch { /* silent */ }
    const { refresh: refreshReportBadge } = useClientReportBadge()
    await refreshReportBadge()
  }
})
</script>
