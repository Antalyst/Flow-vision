<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Chart as ChartJSChart } from 'chart.js'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import type { ClientDashboardPayload } from '~~/server/utils/dashboardAnalytics'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  load: ClientDashboardPayload['workstationLoad'] | null | undefined
  loading?: boolean
}>()

const {
  themeKey,
  candy,
  isDark,
  donutBorderColor,
  buildTooltipPlugin,
  watchChartTheme,
} = useChartTheme()

const donutChartRef = ref<{ chart: ChartJSChart } | null>(null)
watchChartTheme(() => donutChartRef.value?.chart)

const chartData = computed(() => {
  const l = props.load
  if (!l) return null
  return {
    labels: ['Busy', 'Available', 'In Transit', 'Idle'],
    datasets: [
      {
        data: [l.busy, l.available, l.inTransit, l.idle],
        backgroundColor: [
          '#EE4D2D', // Busy (brand accent)
          '#16A34A', // Available (success)
          '#D6431F', // In Transit (accent hover)
          'rgba(143, 143, 148, 0.35)', // Waiting (muted)
        ],
        borderColor: donutBorderColor.value,
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  plugins: {
    legend: { display: false },
    tooltip: buildTooltipPlugin(),
  },
}))

const totalDesks = computed(() => {
  const l = props.load
  if (!l) return 0
  return l.busy + l.available + l.inTransit + l.idle
})

const toneClass: Record<string, string> = {
  amber: 'text-candy-orange',
  emerald: 'text-success',
  orange: 'text-candy-hover',
  zinc: 'text-zinc-500 dark:text-white-muted',
}

const toneDot: Record<string, string> = {
  amber: 'bg-candy-orange',
  emerald: 'bg-success',
  orange: 'bg-candy-hover',
  zinc: 'bg-white-muted',
}

type CategoryKey = 'busy' | 'available' | 'inTransit' | 'waiting'

const CATEGORY_BY_LABEL: Record<string, CategoryKey> = {
  'Busy Desks': 'busy',
  'Available': 'available',
  'In Transit': 'inTransit',
  'Waiting': 'waiting',
}

const CATEGORY_META: Record<CategoryKey, { title: string, emptyText: string, icon: string }> = {
  busy: { title: 'Busy Desks', emptyText: 'No desks are busy right now.', icon: 'ph:buildings-fill' },
  available: { title: 'Available Desks', emptyText: 'No desks are free right now.', icon: 'ph:check-circle-fill' },
  inTransit: { title: 'Documents In Transit', emptyText: 'Nothing is in transit right now.', icon: 'ph:motorcycle-fill' },
  waiting: { title: 'Documents Waiting', emptyText: 'Nothing is waiting right now.', icon: 'ph:hourglass-fill' },
}

const activeCategory = ref<CategoryKey | null>(null)

function selectCategory(label: string) {
  const key = CATEGORY_BY_LABEL[label]
  if (!key) return
  activeCategory.value = activeCategory.value === key ? null : key
}

const activeMeta = computed(() => (activeCategory.value ? CATEGORY_META[activeCategory.value] : null))

const activeItems = computed(() => {
  const details = props.load?.details
  if (!details || !activeCategory.value) return []
  if (activeCategory.value === 'busy') {
    return details.busyOffices.map((o) => ({
      id: o.id,
      title: o.name,
      subtitle: `${o.docCount} document${o.docCount === 1 ? '' : 's'} waiting here`,
    }))
  }
  if (activeCategory.value === 'available') {
    return details.availableOffices.map((o) => ({
      id: o.id,
      title: o.name,
      subtitle: 'No documents here right now',
    }))
  }
  if (activeCategory.value === 'inTransit') {
    return details.inTransitDocs.map((d) => ({
      id: d.id,
      title: d.title,
      subtitle: d.originOfficeName ? `On the way from ${d.originOfficeName}` : 'On the way',
    }))
  }
  return details.waitingDocs.map((d) => ({
    id: d.id,
    title: d.title,
    subtitle: `Waiting at ${d.officeName}`,
  }))
})
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all dark:border-white/10 dark:bg-[#111113]">
    <div class="mb-4">
      <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">Office Status</p>
      <h3 class="mt-1 text-sm font-semibold text-onyx-black dark:text-white-pure">Desk Availability</h3>
      <p class="mt-0.5 text-xs text-zinc-500 dark:text-white-muted">How busy your office desks are right now</p>
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-zinc-500 dark:text-white-muted">
      <Icon name="ph:spinner-gap" class="mr-2 h-5 w-5 animate-spin text-candy-orange" />
      Loading…
    </div>

    <template v-else>
      <div class="relative mx-auto h-44 w-44">
        <ClientOnly>
          <Doughnut
            v-if="chartData"
            :key="themeKey"
            ref="donutChartRef"
            :data="chartData"
            :options="chartOptions"
          />
        </ClientOnly>
        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-2xl font-bold text-onyx-black dark:text-white-pure">{{ totalDesks }}</span>
          <span class="text-[13px] uppercase tracking-wider text-zinc-500 dark:text-white-muted">Desks</span>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-3">
        <button
          v-for="item in load?.legend ?? []"
          :key="item.label"
          type="button"
          class="group rounded-xl border px-3 py-2.5 text-left transition-all hover:border-candy-orange/40 hover:shadow-card-hover"
          :class="[
            isDark ? 'bg-onyx-black/60' : 'bg-white-surface',
            activeCategory === CATEGORY_BY_LABEL[item.label]
              ? 'border-candy-orange bg-candy-orange/5'
              : (isDark ? 'border-onyx-border' : 'border-zinc-200'),
          ]"
          @click="selectCategory(item.label)"
        >
          <div class="mb-1 flex items-center justify-between gap-2">
            <span class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full" :class="toneDot[item.tone]" />
              <span class="text-[13px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-white-muted">{{ item.label }}</span>
            </span>
            <Icon
              name="ph:caret-down-bold"
              class="h-3 w-3 flex-none text-gray-400 transition-transform"
              :class="activeCategory === CATEGORY_BY_LABEL[item.label] ? 'rotate-180 text-candy-orange' : ''"
            />
          </div>
          <p class="text-lg font-bold" :class="toneClass[item.tone]">{{ item.value }}</p>
        </button>
      </div>

      <!-- Drill-down: who/what is actually behind the selected number -->
      <div
        v-if="activeCategory"
        class="mt-3 flex-1 overflow-hidden rounded-xl border"
        :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'"
      >
        <div class="flex items-center justify-between border-b px-3 py-2" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
          <span class="flex items-center gap-1.5 text-xs font-bold" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
            <Icon :name="activeMeta?.icon" class="h-3.5 w-3.5 text-candy-orange" />
            {{ activeMeta?.title }}
          </span>
          <button
            type="button"
            class="rounded-lg p-1 transition-colors"
            :class="isDark ? 'text-white-muted hover:bg-onyx-black hover:text-white-pure' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'"
            @click="activeCategory = null"
          >
            <Icon name="ph:x-bold" class="h-3.5 w-3.5" />
          </button>
        </div>

        <div class="max-h-[220px] overflow-y-auto p-2">
          <div v-if="activeItems.length" class="space-y-1.5">
            <div
              v-for="entry in activeItems"
              :key="entry.id"
              class="rounded-lg px-2.5 py-2"
              :class="isDark ? 'bg-onyx-card' : 'bg-white'"
            >
              <p class="truncate text-[13px] font-semibold" :class="isDark ? 'text-gray-100' : 'text-gray-900'">
                {{ entry.title }}
              </p>
              <p class="mt-0.5 text-[11px]" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
                {{ entry.subtitle }}
              </p>
            </div>
          </div>
          <div v-else class="flex flex-col items-center gap-1.5 py-6 text-center">
            <Icon name="ph:package-fill" class="h-6 w-6 text-gray-300" />
            <p class="text-[11px]" :class="isDark ? 'text-gray-500' : 'text-gray-400'">{{ activeMeta?.emptyText }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
