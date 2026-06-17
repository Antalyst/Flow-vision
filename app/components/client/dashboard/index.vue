<template>
  <div class="matrix-shell -mx-4 space-y-6 px-4 md:-mx-8 md:px-8">
    <div class="fv-enter-header" :class="entranceVisibleClass">
      <DashboardHeader :user-name="auth.user?.full_name || 'User'" />
    </div>

    <div
      v-if="error"
      class="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400"
    >
      {{ error }}
    </div>

    <TransitionGroup
      tag="div"
      name="matrix-layout"
      class="fv-enter-main space-y-6"
      :class="entranceVisibleClass"
    >
      <!-- KPI row -->
      <div
        key="kpi-row"
        :class="kpiGridClass"
      >
        <div
          v-for="(card, index) in displayKpiCards"
          :key="card.title"
          class="fv-enter-card"
          :class="entranceVisibleClass"
          :style="cardEnterDelay(index)"
        >
          <KpiCard
            :title="card.title"
            :value="card.value"
            :trend="card.trend"
            :trend-up="card.trendUp"
            :sparkline-data="card.sparklineData"
          />
        </div>
      </div>

      <!-- Middle asymmetric split -->
      <div
        key="middle-row"
        :class="middleGridClass"
      >
        <div :class="carouselColClass" :style="cardEnterDelay(4)">
          <PredictiveAnalyticsCarousel
            :charts="data?.charts"
            :micro-summaries="data?.microSummaries"
            :loading="loading"
          />
        </div>
        <div :class="donutColClass" :style="cardEnterDelay(5)">
          <WorkstationLoadDonut :load="data?.workstationLoad" :loading="loading" />
        </div>
      </div>

      <!-- Bottom data blocks -->
      <div
        key="bottom-row"
        :class="bottomGridClass"
      >
        <div :class="tableColClass" :style="cardEnterDelay(6)">
          <OfficeVelocityMatrix :offices="data?.topOfficesByVelocity" :loading="loading" />
        </div>
        <div :class="alertsColClass" :style="cardEnterDelay(7)">
          <AlertsMarqueeStream :alerts="data?.recentAlerts" :loading="loading" />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import DashboardHeader from './DashboardHeader.vue'
import KpiCard from './KpiCard.vue'
import PredictiveAnalyticsCarousel from './PredictiveAnalyticsCarousel.vue'
import WorkstationLoadDonut from './WorkstationLoadDonut.vue'
import OfficeVelocityMatrix from './OfficeVelocityMatrix.vue'
import AlertsMarqueeStream from './AlertsMarqueeStream.vue'

const auth = useAuthStore()
const { entranceVisibleClass, cardEnterDelay } = useDashboardEntrance()

const {
  data,
  loading,
  error,
  kpiCards,
  currentLayout,
  fetchDashboard,
  startAutoRefresh,
} = useClientDashboard()

const fallbackKpiCards = [
  { title: 'Total Registered Documents', value: '—', trend: '…', trendUp: true, sparklineData: [0, 0, 0, 0, 0, 0, 0] },
  { title: 'Live Active Processing', value: '—', trend: '…', trendUp: true, sparklineData: [0, 0, 0, 0, 0, 0, 0] },
  { title: 'Predicted Processing Velocity', value: '—', trend: '…', trendUp: true, sparklineData: [0, 0, 0, 0, 0, 0, 0] },
  { title: 'SLA Compliance Rate', value: '—', trend: '…', trendUp: true, sparklineData: [0, 0, 0, 0, 0, 0, 0] },
]

const displayKpiCards = computed(() => kpiCards.value ?? fallbackKpiCards)

const kpiGridClass = computed(() => ({
  'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4': currentLayout.value === 'default' || currentLayout.value === 'compact_grid',
  'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4': currentLayout.value === 'focused-stream',
}))

const middleGridClass = computed(() => ({
  'grid grid-cols-1 gap-6 lg:grid-cols-3': currentLayout.value === 'default',
  'flex flex-col gap-8': currentLayout.value === 'focused-stream',
  'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3': currentLayout.value === 'compact_grid',
}))

const bottomGridClass = computed(() => ({
  'grid grid-cols-1 gap-6 lg:grid-cols-3': currentLayout.value === 'default',
  'flex flex-col gap-8': currentLayout.value === 'focused-stream',
  'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3': currentLayout.value === 'compact_grid',
}))

const carouselColClass = computed(() => ({
  'lg:col-span-2': currentLayout.value !== 'focused-stream',
}))
const donutColClass = computed(() => ({
  'lg:col-span-1': currentLayout.value !== 'focused-stream',
}))
const tableColClass = computed(() => ({
  'lg:col-span-2': currentLayout.value !== 'focused-stream',
}))
const alertsColClass = computed(() => ({
  'lg:col-span-1': currentLayout.value !== 'focused-stream',
}))

onMounted(async () => {
  await fetchDashboard(true)
  startAutoRefresh(30000)
})
</script>

<style scoped>
.matrix-shell {
  min-height: 100%;
  background: rgb(9 9 11);
  border-radius: 1rem;
  padding-top: 1rem;
  padding-bottom: 1.5rem;
}

.matrix-layout-move,
.matrix-layout-enter-active,
.matrix-layout-leave-active {
  transition: all 0.5s ease-in-out;
}

.matrix-layout-enter-from,
.matrix-layout-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
