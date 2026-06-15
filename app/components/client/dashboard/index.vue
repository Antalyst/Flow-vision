<template>
  <div class="space-y-6">
    <!-- Step 2: Top header -->
    <div class="fv-enter-header" :class="entranceVisibleClass">
      <DashboardHeader :user-name="auth.user?.full_name || 'User'" />
    </div>

    <!-- Step 3: Central workspace viewport -->
    <div class="fv-enter-main" :class="entranceVisibleClass">
      <div class="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <div class="space-y-5 xl:col-span-3">
          <!-- Step 4: KPI metrics row -->
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div
              v-for="(card, index) in kpiCards"
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

          <div
            class="fv-enter-card"
            :class="entranceVisibleClass"
            :style="cardEnterDelay(3)"
          >
            <DocumentVolumeChart />
          </div>
        </div>

        <div
          class="xl:col-span-1 fv-enter-card"
          :class="entranceVisibleClass"
          :style="cardEnterDelay(4)"
        >
          <LatestUpdates />
        </div>
      </div>
    </div>

    <!-- Step 4: Document table (final card beat) -->
    <div
      class="fv-enter-card"
      :class="entranceVisibleClass"
      :style="cardEnterDelay(5)"
    >
      <DocumentTable />
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import DashboardHeader from './DashboardHeader.vue'
import KpiCard from './KpiCard.vue'
import DocumentVolumeChart from './DocumentVolumeChart.vue'
import LatestUpdates from './LatestUpdates.vue'
import DocumentTable from './DocumentTable.vue'

const auth = useAuthStore()
const { entranceVisibleClass, cardEnterDelay } = useDashboardEntrance()

const kpiCards = [
  {
    title: 'Total Documents',
    value: '3,484',
    trend: '+7%',
    trendUp: true,
    sparklineData: [30, 45, 28, 55, 43, 65, 52],
  },
  {
    title: 'Processing Speed',
    value: '486',
    trend: '+2%',
    trendUp: true,
    sparklineData: [40, 38, 50, 45, 55, 48, 60],
  },
  {
    title: 'SLA Compliance Rate',
    value: '92%',
    trend: '-1.3%',
    trendUp: false,
    sparklineData: [80, 85, 78, 90, 88, 75, 82],
  },
]
</script>
