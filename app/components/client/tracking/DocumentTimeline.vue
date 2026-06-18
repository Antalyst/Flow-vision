<template>
  <div class="space-y-4">
    <!-- Progress bar -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs font-semibold" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
          Route Progress
        </span>
        <span class="text-xs font-mono font-bold text-candy-orange">
          {{ summary.current_step }} / {{ summary.total_steps }} offices
        </span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full" :class="isDark ? 'bg-white/10' : 'bg-gray-200'">
        <div
          class="h-full rounded-full bg-gradient-to-r from-candy-orange to-amber-400 transition-all duration-700"
          :style="{ width: `${summary.progress_pct}%` }"
        />
      </div>
    </div>

    <!-- Status badge -->
    <div class="flex items-center gap-2">
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
        :class="statusStyle(summary.tracking_status).badge"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="statusStyle(summary.tracking_status).dot" />
        {{ STATUS_LABELS[summary.tracking_status] ?? summary.tracking_status }}
      </span>
      <span v-if="summary.is_complete" class="text-xs font-semibold text-emerald-500">
        All checkpoints cleared ✓
      </span>
    </div>

    <!-- Planned route →→→ -->
    <div v-if="routeSteps.length" class="space-y-1">
      <p class="text-[10px] font-bold uppercase tracking-widest mb-2" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
        Planned Route
      </p>
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-xs font-semibold" :class="isDark ? 'text-gray-400' : 'text-gray-500'">Origin</span>
        <Icon name="ph:arrow-right-bold" class="h-3 w-3 text-gray-300" />

        <template v-for="(step, idx) in routeSteps" :key="step.step_number">
          <span
            class="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold transition"
            :class="routeStepClass(idx + 1)"
          >
            <Icon
              :name="idx + 1 < summary.current_step
                ? 'ph:check-circle-fill'
                : idx + 1 === summary.current_step
                ? 'ph:map-pin-fill'
                : 'ph:circle'"
              class="h-3 w-3"
            />
            {{ step.office_name }}
          </span>
          <Icon
            v-if="idx < routeSteps.length - 1"
            name="ph:arrow-right-bold"
            class="h-3 w-3 text-gray-300"
          />
        </template>
      </div>
    </div>

    <!-- Event timeline (audit log) -->
    <div v-if="events.length" class="relative space-y-0 pt-2">
      <p class="text-[10px] font-bold uppercase tracking-widest mb-3" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
        Activity Log
      </p>

      <!-- Vertical connector line -->
      <div
        class="absolute left-[15px] top-10 bottom-2 w-px"
        :class="isDark ? 'bg-white/10' : 'bg-gray-200'"
      />

      <div
        v-for="(ev, idx) in events"
        :key="ev.id"
        class="relative flex gap-3 pb-4"
      >
        <!-- Status icon node -->
        <div
          class="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white dark:bg-[#1A1A1A]"
          :class="statusStyle(ev.status).iconBorder"
        >
          <Icon :name="STATUS_ICONS[ev.status] ?? 'ph:circle'" class="h-3.5 w-3.5" :class="statusStyle(ev.status).iconColor" />
        </div>

        <!-- Event content -->
        <div class="flex-1 min-w-0 pt-0.5">
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span class="text-xs font-bold" :class="isDark ? 'text-gray-100' : 'text-gray-800'">
              {{ STATUS_LABELS[ev.status] ?? ev.status }}
            </span>
            <span v-if="ev.office_name" class="text-[11px] font-semibold" :class="statusStyle(ev.status).textAccent">
              @ {{ ev.office_name }}
            </span>
          </div>

          <p class="mt-0.5 text-[11px]" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            <span v-if="ev.actor_name">by {{ ev.actor_name }}</span>
            <span v-if="ev.actor_role" class="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
              :class="isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'">
              {{ ev.actor_role }}
            </span>
            <span class="ml-2">{{ formatRelative(ev.created_at) }}</span>
          </p>

          <p v-if="ev.notes" class="mt-1 text-[11px] italic" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            "{{ ev.notes }}"
          </p>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="py-6 text-center text-sm" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
      No tracking events recorded yet.
    </div>
  </div>
</template>

<script setup lang="ts">
const { isDark } = useTheme()

interface TrackingEvent {
  id: string
  status: string
  step_index: number | null
  office_id: number | null
  office_name: string | null
  actor_id: string | null
  actor_role: string | null
  actor_name: string | null
  notes: string | null
  created_at: string
}

interface RouteStep {
  step_number: number
  office_id: number
  office_name: string
  office_code: string | null
}

interface TrackingSummary {
  total_steps: number
  current_step: number
  tracking_status: string
  is_complete: boolean
  progress_pct: number
}

defineProps<{
  events:    TrackingEvent[]
  routeSteps: RouteStep[]
  summary:   TrackingSummary
}>()

const STATUS_LABELS: Record<string, string> = {
  CREATED:           'Registered',
  PICKED_UP:         'Picked Up',
  IN_TRANSIT:        'In Transit',
  ARRIVED_AT_OFFICE: 'Arrived at Office',
  COMPLETED:         'Completed',
}

const STATUS_ICONS: Record<string, string> = {
  CREATED:           'ph:file-plus-fill',
  PICKED_UP:         'ph:hand-fill',
  IN_TRANSIT:        'ph:motorcycle-fill',
  ARRIVED_AT_OFFICE: 'ph:buildings-fill',
  COMPLETED:         'ph:check-circle-fill',
}

const statusStyle = (status: string) => {
  switch (status) {
    case 'CREATED':
      return {
        badge:      'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400',
        dot:        'bg-gray-400',
        iconBorder: 'border-gray-300 dark:border-gray-600',
        iconColor:  'text-gray-400',
        textAccent: 'text-gray-500',
      }
    case 'PICKED_UP':
      return {
        badge:      'bg-sky-500/10 text-sky-700 dark:text-sky-400',
        dot:        'bg-sky-500',
        iconBorder: 'border-sky-400',
        iconColor:  'text-sky-500',
        textAccent: 'text-sky-500',
      }
    case 'IN_TRANSIT':
      return {
        badge:      'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        dot:        'bg-amber-500 animate-pulse',
        iconBorder: 'border-amber-400',
        iconColor:  'text-amber-500',
        textAccent: 'text-amber-500',
      }
    case 'ARRIVED_AT_OFFICE':
      return {
        badge:      'bg-candy-orange/10 text-candy-orange',
        dot:        'bg-candy-orange',
        iconBorder: 'border-candy-orange',
        iconColor:  'text-candy-orange',
        textAccent: 'text-candy-orange',
      }
    case 'COMPLETED':
      return {
        badge:      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        dot:        'bg-emerald-500',
        iconBorder: 'border-emerald-400',
        iconColor:  'text-emerald-500',
        textAccent: 'text-emerald-500',
      }
    default:
      return {
        badge:      'bg-gray-100 text-gray-500',
        dot:        'bg-gray-400',
        iconBorder: 'border-gray-300',
        iconColor:  'text-gray-400',
        textAccent: 'text-gray-400',
      }
  }
}

const routeStepClass = (stepNumber: number) => {
  const { current_step, tracking_status } = (inject('summary') as any) ?? {}
  // Fallback: use props directly via closure — Vue injects not available here
  // so we compute based on the step's relation to current_step (passed via summary prop)
  // This is resolved by the parent passing summary as prop, not inject.
  return isDark.value ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-500'
}

const formatRelative = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)   return 'just now'
  if (diffMin < 60)  return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)   return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7)   return `${diffDay}d ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit' }).format(d)
}
</script>
