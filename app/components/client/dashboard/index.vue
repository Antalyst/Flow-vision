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
      class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400"
    >
      {{ error }}
    </div>

    <!-- Main Grid Content -->
    <div class="fv-enter-main" :class="[entranceVisibleClass, currentLayout === 'compact_grid' ? 'space-y-4' : 'space-y-6']">
      <!-- KPI Cards row — shown in every layout -->
      <div
        class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        :class="currentLayout === 'compact_grid' ? 'gap-3' : 'gap-4'"
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
            :is-hero="index === 0"
            :to="kpiLinkFor(card.title)"
          />
        </div>
      </div>

      <!-- Grid: the full picture — predictions, capacity, documents, and activity -->
      <template v-if="currentLayout === 'default' || currentLayout === 'compact_grid'">
        <div class="grid grid-cols-1 lg:grid-cols-3" :class="currentLayout === 'compact_grid' ? 'gap-3' : 'gap-6'">
          <div class="lg:col-span-2" :style="cardEnterDelay(4)">
            <PredictiveAnalyticsCarousel :charts="data?.charts" :micro-summaries="data?.microSummaries" :loading="loading" />
          </div>
          <div class="lg:col-span-1" :style="cardEnterDelay(5)">
            <WorkstationLoadDonut :load="data?.workstationLoad" :loading="loading" />
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3" :class="currentLayout === 'compact_grid' ? 'gap-3' : 'gap-6'">
          <div class="lg:col-span-2" :style="cardEnterDelay(6)">
            <DocumentTable />
          </div>
          <div class="lg:col-span-1" :style="cardEnterDelay(7)">
            <OfficeVelocityMatrix :offices="data?.topOfficesByVelocity" :loading="loading" />
          </div>
        </div>

        <div :style="cardEnterDelay(8)">
          <LatestUpdates />
        </div>
      </template>

      <!-- Focused: just the document-tracking essentials, one column, top to bottom -->
      <template v-else-if="currentLayout === 'focused-stream'">
        <div :style="cardEnterDelay(4)">
          <DocumentTable />
        </div>
        <div :style="cardEnterDelay(5)">
          <LatestUpdates />
        </div>
      </template>
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
        <div v-if="isAiDrawerOpen" @click="isAiDrawerOpen = false; isDigestPanelOpen = false" class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"></div>
      </Transition>

      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <div
          v-if="isAiDrawerOpen"
          class="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l shadow-sidebar-dark transition-[width] duration-300 ease-out"
          :class="[isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white', isDigestPanelOpen ? 'md:w-[90%] lg:w-[78%] xl:w-[65%]' : 'md:w-1/2']"
        >
          <div
            class="flex items-center justify-between border-b px-6 py-5"
            :class="isDark ? 'border-onyx-border bg-onyx-black/50' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-candy-orange/15 text-candy-orange">
                <Icon name="ph:sparkle-fill" class="h-5 w-5" />
              </div>
              <div>
                <h2 class="text-base font-semibold" :class="isDark ? 'text-white-pure' : 'text-gray-900'">AI Digest</h2>
                <p class="text-xs" :class="isDark ? 'text-white-muted' : 'text-gray-500'">{{ selectedOfficeName || 'All offices' }} · generated just now</p>
              </div>
            </div>
            <button
              @click="isAiDrawerOpen = false; isDigestPanelOpen = false"
              class="rounded-lg p-2 transition-colors"
              :class="isDark ? 'text-white-muted hover:bg-onyx-black hover:text-white-pure' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
            >
              <Icon name="ph:x-bold" class="h-5 w-5" />
            </button>
          </div>
          <div class="flex-1 overflow-hidden px-8 py-7">
            <AiExecutiveDigest
              :metrics="data"
              :office-name="selectedOfficeName"
              :office-id="selectedOfficeId"
              @panel-open="isDigestPanelOpen = $event"
            />
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
import WorkstationLoadDonut from './WorkstationLoadDonut.vue'
import DocumentTable from './DocumentTable.vue'
import LatestUpdates from './LatestUpdates.vue'
import OfficeVelocityMatrix from './OfficeVelocityMatrix.vue'
import PredictiveAnalyticsCarousel from './PredictiveAnalyticsCarousel.vue'
import AiExecutiveDigest from './AiExecutiveDigest.vue'

const auth = useAuthStore()
const supabase = useSupabaseClient()
const { entranceVisibleClass, cardEnterDelay } = useDashboardEntrance()
const { isDark } = useTheme()

const offices = ref<{ id: string; name: string }[]>([])
const selectedOfficeId = ref<string | null>(null)
const isAiDrawerOpen = ref(false)
const isDigestPanelOpen = ref(false)

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
  currentLayout,
} = useClientDashboard()

const fallbackKpiCards = [
  { title: 'Total Documents', value: '35', trend: '+100%', trendUp: true, sparklineData: [5, 12, 18, 22, 28, 30, 35] },
  { title: 'Currently Processing', value: '32', trend: '+10.3%', trendUp: true, sparklineData: [10, 14, 20, 24, 26, 29, 32] },
  { title: 'Average Time', value: '1.4h', trend: '+5.0%', trendUp: true, sparklineData: [2.8, 2.4, 2.1, 1.9, 1.6, 1.5, 1.4] },
  { title: 'On-Time Rate', value: '98.2%', trend: '+2.4%', trendUp: true, sparklineData: [91, 93, 94, 95, 96, 97, 98.2] },
]

const displayKpiCards = computed(() => kpiCards.value ?? fallbackKpiCards)

// Each KPI card links to the page where a user can see the documents behind the number.
function kpiLinkFor(title: string) {
  const officeQuery = selectedOfficeId.value ? { officeId: selectedOfficeId.value } : {}
  switch (title) {
    case 'Total Documents':
      return { path: '/client/documents', query: officeQuery }
    case 'Currently Processing':
      return { path: '/client/documents', query: { ...officeQuery, status: 'processing' } }
    case 'Average Time':
    case 'On-Time Rate':
      return { path: '/client/sla-compliance', query: officeQuery }
    default:
      return { path: '/client/documents', query: officeQuery }
  }
}

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
