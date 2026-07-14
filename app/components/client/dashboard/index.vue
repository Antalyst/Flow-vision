<template>
  <div class="space-y-8 pb-10 transition-colors duration-300">
    <div class="fv-enter-header flex items-center justify-between" :class="entranceVisibleClass">
      <DashboardHeader :user-name="auth.user?.full_name || 'User'" />
      <div class="flex items-center gap-4">
        <button
          @click="fetchDashboard(true, selectedOfficeId)"
          class="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-400 shadow-sm hover:bg-zinc-700 hover:text-white transition-colors"
          title="Refresh Dashboard"
        >
          <Icon name="ph:arrows-clockwise" class="h-5 w-5" />
        </button>
        <button
          @click="isAiDrawerOpen = true"
          class="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <Icon name="ph:sparkle-fill" class="h-4 w-4" />
          AI Digest
        </button>
        <select
          v-model="selectedOfficeId"
          class="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
        >
          <option :value="null">Global Organization</option>
          <option v-for="office in offices" :key="office.id" :value="office.id">
            {{ office.name }}
          </option>
        </select>
      </div>
    </div>

    <div
      v-if="error"
      class="rounded-none border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400"
    >
      {{ error }}
    </div>

    <TransitionGroup
      tag="div"
      name="matrix-layout"
      class="fv-enter-main space-y-6"
      :class="entranceVisibleClass"
    >
      <!-- AI Drawer content moved -->

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
        <div v-if="isAiDrawerOpen" class="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col">
          <div class="flex items-center justify-between border-b border-zinc-800 px-6 py-5 bg-zinc-900/50">
            <div class="flex items-center gap-3 text-emerald-400">
              <Icon name="ph:sparkle-fill" class="h-6 w-6" />
              <h2 class="text-lg font-semibold text-zinc-100">AI Executive Digest</h2>
            </div>
            <button @click="isAiDrawerOpen = false" class="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
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
import PredictiveAnalyticsCarousel from './PredictiveAnalyticsCarousel.vue'
import WorkstationLoadDonut from './WorkstationLoadDonut.vue'
import OfficeVelocityMatrix from './OfficeVelocityMatrix.vue'
import AlertsMarqueeStream from './AlertsMarqueeStream.vue'
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
  currentLayout,
  fetchDashboard,
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

<style scoped>
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
