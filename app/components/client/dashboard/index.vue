<template>
  <div class="space-y-6">
    <DashboardHeader :user-name="auth.user?.full_name || 'User'" />

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-4">
      <div class="space-y-5 xl:col-span-3">
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <KpiCard
            title="Total Documents"
            value="3,484"
            trend="+7%"
            :trend-up="true"
            :sparkline-data="[30, 45, 28, 55, 43, 65, 52]"
          />
          <KpiCard
            title="Processing Speed"
            value="486"
            trend="+2%"
            :trend-up="true"
            :sparkline-data="[40, 38, 50, 45, 55, 48, 60]"
          />
          <KpiCard
            title="SLA Compliance Rate"
            value="92%"
            trend="-1.3%"
            :trend-up="false"
            :sparkline-data="[80, 85, 78, 90, 88, 75, 82]"
          />
        </div>

        <DocumentVolumeChart />
      </div>

      <div class="xl:col-span-1">
        <LatestUpdates />
      </div>
    </div>

    <DocumentTable />
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
</script>
