import type { ClientDashboardPayload } from '~~/server/utils/dashboardAnalytics'

export type DashboardLayoutId = 'default' | 'focused-stream' | 'compact_grid'

const LAYOUT_STORAGE_KEY = 'fv:client-dashboard-layout'

export function useClientDashboard() {
  const data = useState<ClientDashboardPayload | null>('client:dashboard-data', () => null)
  const loading = useState('client:dashboard-loading', () => false)
  const error = useState<string | null>('client:dashboard-error', () => null)
  const lastFetchedAt = useState<number | null>('client:dashboard-fetched-at', () => null)

  const currentLayout = useState<DashboardLayoutId>('client:dashboard-layout', () => 'default')

  const forecastYear = useState<number | null>('client:dashboard-forecast-year', () => null)
  const forecastMonth = useState<number | null>('client:dashboard-forecast-month', () => null)
  const forecastDayOfWeek = useState<number | null>('client:dashboard-forecast-dow', () => null)

  if (import.meta.client) {
    onMounted(() => {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY) as DashboardLayoutId | null
      if (saved === 'default' || saved === 'focused-stream' || saved === 'compact_grid') {
        currentLayout.value = saved
      }
    })
  }

  function setLayout(layout: DashboardLayoutId) {
    currentLayout.value = layout
    if (import.meta.client) {
      localStorage.setItem(LAYOUT_STORAGE_KEY, layout)
    }
  }

  async function fetchDashboard(force = false, officeId?: string | null) {
    if (loading.value && !force) return

    loading.value = true
    error.value = null
    try {
      const query: Record<string, string> = {}
      if (officeId) query.officeId = officeId
      if (forecastYear.value !== null) query.forecastYear = String(forecastYear.value)
      if (forecastMonth.value !== null) query.forecastMonth = String(forecastMonth.value)
      if (forecastDayOfWeek.value !== null) query.forecastDayOfWeek = String(forecastDayOfWeek.value)

      const res = await $fetch<{ success: boolean } & ClientDashboardPayload>(
        '/api/client/dashboard',
        {
          credentials: 'include',
          query: Object.keys(query).length ? query : undefined
        },
      )
      data.value = {
        kpis: res.kpis,
        charts: res.charts,
        forecastFilterOptions: res.forecastFilterOptions,
        microSummaries: res.microSummaries,
        workstationLoad: res.workstationLoad,
        topOfficesByVelocity: res.topOfficesByVelocity,
        recentAlerts: res.recentAlerts,
      }
      lastFetchedAt.value = Date.now()
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }, message?: string }
      error.value = e?.data?.message ?? e?.message ?? 'Failed to load dashboard metrics.'
      data.value = null
    } finally {
      loading.value = false
    }
  }

  const kpiCards = computed(() => {
    const kpis = data.value?.kpis
    if (!kpis) return null
    return [
      {
        title: 'Total Documents',
        value: kpis.totalDocuments.display,
        trend: kpis.totalDocuments.trend,
        trendUp: kpis.totalDocuments.trendUp,
        sparklineData: kpis.totalDocuments.sparkline,
      },
      {
        title: 'Currently Processing',
        value: kpis.activeProcessing.display,
        trend: kpis.activeProcessing.trend,
        trendUp: kpis.activeProcessing.trendUp,
        sparklineData: kpis.activeProcessing.sparkline,
      },
      {
        title: 'Average Time',
        value: kpis.processingSpeed.display,
        trend: kpis.processingSpeed.trend,
        trendUp: kpis.processingSpeed.trendUp,
        sparklineData: kpis.processingSpeed.sparkline,
      },
      {
        title: 'On-Time Rate',
        value: kpis.slaCompliance.display,
        trend: kpis.slaCompliance.trend,
        trendUp: kpis.slaCompliance.trendUp,
        sparklineData: kpis.slaCompliance.sparkline,
      },
    ]
  })

  let refreshTimer: ReturnType<typeof setInterval> | null = null
  let realtimeChannel: any = null

  function startAutoRefresh(intervalMs = 30000) {
    if (!import.meta.client) return
    stopAutoRefresh()
    
    // Fallback polling
    refreshTimer = setInterval(() => fetchDashboard(true), intervalMs)

    // Supabase Realtime for instant alerts
    try {
      const client = useSupabaseClient()
      realtimeChannel = client
        .channel('dashboard-alerts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'activity_logs' },
          () => {
            fetchDashboard(true)
          }
        )
        .subscribe()
    } catch (err) {
      // Ignore if supabase client isn't available
    }
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    if (realtimeChannel) {
      realtimeChannel.unsubscribe()
      realtimeChannel = null
    }
  }

  onUnmounted(stopAutoRefresh)

  function setForecastFilters(filters: { year?: number | null, month?: number | null, dayOfWeek?: number | null }) {
    if ('year' in filters) forecastYear.value = filters.year ?? null
    if ('month' in filters) forecastMonth.value = filters.month ?? null
    if ('dayOfWeek' in filters) forecastDayOfWeek.value = filters.dayOfWeek ?? null
  }

  return {
    data,
    loading,
    error,
    kpiCards,
    currentLayout,
    setLayout,
    fetchDashboard,
    startAutoRefresh,
    stopAutoRefresh,
    lastFetchedAt,
    forecastYear,
    forecastMonth,
    forecastDayOfWeek,
    setForecastFilters,
  }
}

export function useDashboardLayout() {
  const { currentLayout, setLayout } = useClientDashboard()
  return { currentLayout, setLayout }
}
