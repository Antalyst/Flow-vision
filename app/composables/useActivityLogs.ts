export interface ActivityLogRow {
  id: string
  org_id: string
  office_id: string | null
  user_id: string | null
  user_name: string | null
  actor_name: string | null
  action_type: string
  details: string
  message: string
  document_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export type ActivityDatePreset = 'day' | 'week' | 'month' | 'all'
export type ActivityActionFilter = 'all' | 'upload' | 'scan' | 'pickup'

export function useActivityLogs(options: { mineOnly?: boolean } = {}) {
  const logs = ref<ActivityLogRow[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const datePreset = ref<ActivityDatePreset>('week')
  const actionType = ref<ActivityActionFilter>('all')
  const mineOnly = ref(options.mineOnly ?? false)

  async function fetchLogs() {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ success: boolean, logs: ActivityLogRow[] }>('/api/activity-logs', {
        query: {
          range: datePreset.value,
          action: actionType.value,
          mine: mineOnly.value ? 'true' : 'false',
        },
      })
      logs.value = res.logs ?? []
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }, message?: string }
      error.value = e?.data?.message ?? e?.message ?? 'Failed to load activity logs.'
      logs.value = []
    } finally {
      loading.value = false
    }
  }

  watch([datePreset, actionType, mineOnly], () => {
    fetchLogs()
  })

  return {
    logs,
    loading,
    error,
    datePreset,
    actionType,
    mineOnly,
    fetchLogs,
  }
}
