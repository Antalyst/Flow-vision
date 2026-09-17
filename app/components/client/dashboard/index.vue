<template>
  <div class="space-y-6 pb-12 transition-colors duration-300">
    <!-- Consolidated Donezo Header -->
    <div class="fv-enter-header" :class="entranceVisibleClass">
      <DashboardHeader
        :user-name="auth.user?.full_name || 'User'"
        :offices="offices"
        v-model:selected-office-id="selectedOfficeId"
        @refresh="fetchDashboard(true, selectedOfficeId)"
        @open-ai-digest="isAiDrawerOpen = true"
      />
    </div>

    <!-- Error Alert if any -->
    <div
      v-if="error"
      class="rounded-none border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400"
    >
      {{ error }}
    </div>

    <!-- Main Grid Content -->
    <div class="fv-enter-main space-y-6" :class="entranceVisibleClass">
      <!-- Row 1: KPI Cards (Donezo signature: Hero featured card + 3 metric cards) -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            :is-hero="index === 0"
          />
        </div>
      </div>

      <!-- Row 2: Analytics & Capacity Split (Donezo Middle Tier) -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Main Document Volume Chart (Col 1-2) -->
        <div class="lg:col-span-2" :style="cardEnterDelay(4)">
          <DocumentVolumeChart />
        </div>

        <!-- Workstation Load Distribution Donut (Col 3) -->
        <div class="lg:col-span-1" :style="cardEnterDelay(5)">
          <WorkstationLoadDonut :load="data?.workstationLoad" :loading="loading" />
        </div>
      </div>

      <!-- Row 3: Document Monitoring Table & Live Activity Feed (Donezo Lower Tier) -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Document Table Queue (Col 1-2) -->
        <div class="lg:col-span-2" :style="cardEnterDelay(6)">
          <DocumentTable />
        </div>

        <!-- Live Updates & Office Velocity (Col 3) -->
        <div class="lg:col-span-1 flex flex-col gap-6" :style="cardEnterDelay(7)">
          <LatestUpdates />
          <OfficeVelocityMatrix :offices="data?.topOfficesByVelocity" :loading="loading" />
        </div>
      </div>
    </div>

    <!-- AI Side Drawer -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity ease-linear duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity ease-linear duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isAiDrawerOpen" @click="isAiDrawerOpen = false" class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"></div>
      </Transition>

      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <div v-if="isAiDrawerOpen" class="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-onyx-card border-l border-onyx-border shadow-sidebar-dark flex flex-col">
          <div class="flex items-center justify-between border-b border-onyx-border px-6 py-5 bg-onyx-black/50">
            <div class="flex items-center gap-3 text-candy-orange">
              <Icon name="ph:sparkle-fill" class="h-6 w-6" />
              <h2 class="text-lg font-semibold text-white-pure">AI Executive Digest</h2>
            </div>
            <button @click="isAiDrawerOpen = false" class="rounded-none p-2 text-white-muted hover:bg-onyx-black hover:text-white-pure transition-colors">
              <Icon name="ph:x-bold" class="h-5 w-5" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            <AiExecutiveDigest :metrics="data" :office-name="selectedOfficeName" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import DashboardHeader from './DashboardHeader.vue'
import KpiCard from './KpiCard.vue'
import DocumentVolumeChart from './DocumentVolumeChart.vue'
import WorkstationLoadDonut from './WorkstationLoadDonut.vue'
import DocumentTable from './DocumentTable.vue'
import LatestUpdates from './LatestUpdates.vue'
import OfficeVelocityMatrix from './OfficeVelocityMatrix.vue'
import AiExecutiveDigest from './AiExecutiveDigest.vue'

const auth = useAuthStore()
const supabase = useSupabaseClient()
const { entranceVisibleClass, cardEnterDelay } = useDashboardEntrance()

const offices = ref<{ id: string; name: string }[]>([])
const selectedOfficeId = ref<string | null>(null)
const isAiDrawerOpen = ref(false)

const selectedOfficeName = computed(() => {
  if (!selectedOfficeId.value) return undefined
  return offices.value.find((o) => o.id === selectedOfficeId.value)?.name
})

const {
  data,
  loading,
  error,
  kpiCards,
  fetchDashboard,
} = useClientDashboard()

const fallbackKpiCards = [
  { title: 'Total Registered Documents', value: '35', trend: '+100%', trendUp: true, sparklineData: [5, 12, 18, 22, 28, 30, 35] },
  { title: 'Live Active Processing', value: '32', trend: '+10.3%', trendUp: true, sparklineData: [10, 14, 20, 24, 26, 29, 32] },
  { title: 'Predicted Processing Velocity', value: '1.4h', trend: '+5.0%', trendUp: true, sparklineData: [2.8, 2.4, 2.1, 1.9, 1.6, 1.5, 1.4] },
  { title: 'SLA Compliance Rate', value: '98.2%', trend: '+2.4%', trendUp: true, sparklineData: [91, 93, 94, 95, 96, 97, 98.2] },
]

const displayKpiCards = computed(() => kpiCards.value ?? fallbackKpiCards)

onMounted(async () => {
  if (auth.user?.org_id) {
    const { data: officeData } = await supabase
      .from('offices')
      .select('id, name')
      .eq('org_id', auth.user.org_id)
      .order('name')
    if (officeData) offices.value = officeData
  }

  await fetchDashboard(true, selectedOfficeId.value)
})

watch(selectedOfficeId, () => {
  fetchDashboard(true, selectedOfficeId.value)
})
</script>
