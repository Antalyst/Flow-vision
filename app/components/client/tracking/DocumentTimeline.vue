<template>
  <div class="space-y-6">
    <!-- Status + progress -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
          :class="statusStyle(summary.tracking_status).badge"
        >
          <span class="h-1.5 w-1.5 rounded-full" :class="statusStyle(summary.tracking_status).dot" />
          {{ STATUS_LABELS[summary.tracking_status] ?? summary.tracking_status }}
        </span>
        <span class="text-xs font-semibold" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
          {{ summary.current_step }} of {{ summary.total_steps }} stops
        </span>
      </div>

      <div class="h-2 w-full overflow-hidden rounded-full" :class="isDark ? 'bg-white/10' : 'bg-gray-200'">
        <div
          class="h-full rounded-full transition-all duration-700"
          :class="summary.is_complete ? 'bg-success' : 'bg-candy-orange'"
          :style="{ width: `${summary.progress_pct}%` }"
        />
      </div>

      <p v-if="summary.is_complete" class="flex items-center gap-1.5 text-xs font-semibold text-success">
        <Icon name="ph:check-circle-fill" class="h-3.5 w-3.5" />
        Delivered — every stop is complete.
      </p>
    </div>

    <!-- Delivery route (Shopee-style stepper) -->
    <div v-if="routeSteps.length">
      <p class="mb-3 text-sm font-bold uppercase tracking-widest" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
        Delivery Route
      </p>
      <div class="flex items-start">
        <template v-for="(step, idx) in routeSteps" :key="step.step_number">
          <div class="flex flex-1 flex-col items-center text-center">
            <div class="relative flex items-center w-full">
              <div
                v-if="idx > 0"
                class="h-0.5 flex-1"
                :class="idx <= summary.current_step - 1 ? 'bg-candy-orange' : (isDark ? 'bg-white/10' : 'bg-gray-200')"
              />
              <div
                class="relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 transition-colors"
                :class="routeStepClass(idx + 1).circle"
              >
                <Icon
                  :name="idx + 1 < summary.current_step
                    ? 'ph:check-bold'
                    : idx + 1 === summary.current_step
                    ? 'ph:map-pin-fill'
                    : 'ph:circle-fill'"
                  :class="idx + 1 === summary.current_step + 1 || idx + 1 > summary.current_step
                    ? 'h-2 w-2'
                    : 'h-3.5 w-3.5'"
                />
              </div>
              <div
                v-if="idx < routeSteps.length - 1"
                class="h-0.5 flex-1"
                :class="idx + 1 <= summary.current_step - 1 ? 'bg-candy-orange' : (isDark ? 'bg-white/10' : 'bg-gray-200')"
              />
            </div>
            <span
              class="mt-2 max-w-[150px] break-words text-sm font-semibold leading-tight"
              :class="routeStepClass(idx + 1).label"
              :title="step.office_name"
            >
              {{ step.office_name }}
            </span>

            <div
              v-if="step.delivered_by || step.arrived_at"
              class="mt-2.5 flex w-[150px] flex-col overflow-hidden rounded-xl border"
              :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure'"
            >
              <div
                v-if="step.delivered_by"
                class="flex items-center justify-center gap-1.5 border-b px-2.5 py-1.5"
                :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'"
              >
                <Icon name="ph:user-fill" class="h-3 w-3 flex-none text-candy-orange" />
                <span
                  class="truncate text-sm font-bold"
                  :class="isDark ? 'text-white-pure' : 'text-onyx-black'"
                >
                  {{ step.delivered_by }}
                </span>
              </div>

              <div class="flex flex-col gap-1.5 px-2.5 py-2">
                <div v-if="step.arrived_at" class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold uppercase tracking-wide" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
                    In
                  </span>
                  <span class="text-xs font-semibold" :class="isDark ? 'text-gray-300' : 'text-gray-600'">
                    {{ formatStopTime(step.arrived_at) }}
                  </span>
                </div>

                <div v-if="step.released_at" class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold uppercase tracking-wide" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
                    {{ step.released_status === 'COMPLETED' ? 'Done' : 'Out' }}
                  </span>
                  <span
                    class="text-xs font-semibold"
                    :class="step.released_status === 'COMPLETED' ? 'text-success' : (isDark ? 'text-gray-300' : 'text-gray-600')"
                  >
                    {{ formatStopTime(step.released_at) }}
                  </span>
                </div>
                <div
                  v-else-if="step.arrived_at"
                  class="mt-0.5 flex items-center justify-center gap-1 rounded-full bg-candy-orange/10 py-1 text-xs font-bold text-candy-orange"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-candy-orange animate-pulse" />
                  Still here
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Activity log -->
    <div v-if="events.length" class="relative">
      <p class="mb-3 text-sm font-bold uppercase tracking-widest" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
        What's Happened So Far
      </p>

      <div class="relative space-y-0 pt-1">
        <div
          class="absolute left-[15px] top-9 bottom-2 w-px"
          :class="isDark ? 'bg-white/10' : 'bg-gray-200'"
        />

        <div v-for="ev in events" :key="ev.id" class="relative flex gap-3 pb-4">
          <div
            class="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white dark:bg-[#1A1A1A]"
            :class="statusStyle(ev.status).iconBorder"
          >
            <Icon :name="STATUS_ICONS[ev.status] ?? 'ph:circle'" class="h-3.5 w-3.5" :class="statusStyle(ev.status).iconColor" />
          </div>

          <div class="min-w-0 flex-1 pt-0.5">
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span class="text-xs font-bold" :class="isDark ? 'text-gray-100' : 'text-gray-800'">
                {{ STATUS_LABELS[ev.status] ?? ev.status }}
              </span>
              <span v-if="ev.office_name" class="text-sm font-semibold" :class="statusStyle(ev.status).textAccent">
                at {{ ev.office_name }}
              </span>
            </div>

            <p class="mt-0.5 text-sm" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
              <span v-if="ev.actor_name">by {{ ev.actor_name }}</span>
              <span v-if="ev.actor_role" class="ml-1 rounded-full px-1.5 py-0.5 text-sm font-bold uppercase"
                :class="isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'">
                {{ ev.actor_role }}
              </span>
              <span class="ml-2">{{ formatRelative(ev.created_at) }}</span>
            </p>

            <p v-if="ev.notes" class="mt-1 text-sm italic" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
              "{{ ev.notes }}"
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="py-6 text-center text-sm" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
      Nothing to show yet — this document hasn't moved.
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
  delivered_by: string | null
  arrived_at: string | null
  released_at: string | null
  released_by: string | null
  released_status?: string | null
}

interface TrackingSummary {
  total_steps: number
  current_step: number
  tracking_status: string
  is_complete: boolean
  progress_pct: number
}

const props = defineProps<{
  events:    TrackingEvent[]
  routeSteps: RouteStep[]
  summary:   TrackingSummary
}>()

// Shopee-style palette: not-yet-reached stops stay neutral gray, anything the
// document has passed through or is currently at glows brand-orange, and only
// a fully completed document turns green.
const STATUS_LABELS: Record<string, string> = {
  CREATED:           'Registered',
  PICKED_UP:         'Picked Up',
  IN_TRANSIT:        'On the Way',
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
  if (status === 'COMPLETED') {
    return {
      badge:      'bg-success/10 text-success',
      dot:        'bg-success',
      iconBorder: 'border-success',
      iconColor:  'text-success',
      textAccent: 'text-success',
    }
  }
  if (status === 'CREATED') {
    return {
      badge:      'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400',
      dot:        'bg-gray-400',
      iconBorder: 'border-gray-300 dark:border-gray-600',
      iconColor:  'text-gray-400',
      textAccent: 'text-gray-500',
    }
  }
  // PICKED_UP, IN_TRANSIT, ARRIVED_AT_OFFICE — all "in motion" states share the brand accent
  return {
    badge:      'bg-candy-orange/10 text-candy-orange',
    dot:        'bg-candy-orange animate-pulse',
    iconBorder: 'border-candy-orange',
    iconColor:  'text-candy-orange',
    textAccent: 'text-candy-orange',
  }
}

const routeStepClass = (stepNumber: number) => {
  const { current_step, is_complete } = props.summary
  if (stepNumber < current_step || (stepNumber === current_step && is_complete)) {
    return {
      circle: 'border-candy-orange bg-candy-orange text-white',
      label: isDark.value ? 'text-white-pure' : 'text-onyx-black',
    }
  }
  if (stepNumber === current_step) {
    return {
      circle: 'border-candy-orange bg-candy-orange/10 text-candy-orange',
      label: 'text-candy-orange',
    }
  }
  return {
    circle: isDark.value
      ? 'border-white/15 bg-transparent text-white/20'
      : 'border-gray-200 bg-transparent text-gray-300',
    label: isDark.value ? 'text-gray-500' : 'text-gray-400',
  }
}

const formatStopTime = (dateStr: string | null) => {
  if (!dateStr) return null
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' })
    .format(new Date(dateStr))
    .replace(',', '')
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
