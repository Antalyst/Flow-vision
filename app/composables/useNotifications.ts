export interface NotificationRow {
  id: string
  org_id: string
  office_id?: string | null
  document_id: string
  target_role: string | null
  title: string
  message: string | null
  user_id: string | null
  is_claimed: boolean
  is_read: boolean
  claimed_by_user_id: string | null
  created_at: string
  metadata?: {
    pickup_source_name?: string | null
    pickup_source_office_id?: string | null
    destination_office_name?: string | null
    destination_office_id?: string | null
  } | null
}

export function isUnclaimedNotification(value: unknown): boolean {
  return value === false || value === 'false' || value === 0 || value == null
}

export function isUnreadNotification(value: unknown): boolean {
  return value === false || value === 'false' || value === 0 || value == null
}

export type NotificationSeverity = 'urgent' | 'action' | 'info'

/**
 * Heuristic severity from the notification title — no schema change needed.
 * Urgent (compliance issues, overdue SLAs) always outranks routine progress updates.
 */
export function classifyNotificationSeverity(title: string | null | undefined): NotificationSeverity {
  const t = (title || '').toLowerCase()
  if (t.includes('issue') || t.includes('discrepancy') || t.includes('overdue') || t.includes('compliance')) {
    return 'urgent'
  }
  if (t.includes('required') || t.includes('review') || t.includes('assign') || t.includes('ready')) {
    return 'action'
  }
  return 'info'
}

const SEVERITY_RANK: Record<NotificationSeverity, number> = { urgent: 0, action: 1, info: 2 }

/** Urgent first, then needs-action, then routine — unread ahead of read within each tier. */
export function sortNotificationsBySeverity(rows: NotificationRow[]): NotificationRow[] {
  return [...rows].sort((a, b) => {
    const rankDiff = SEVERITY_RANK[classifyNotificationSeverity(a.title)] - SEVERITY_RANK[classifyNotificationSeverity(b.title)]
    if (rankDiff !== 0) return rankDiff
    const unreadDiff = Number(isUnreadNotification(b.is_read)) - Number(isUnreadNotification(a.is_read))
    if (unreadDiff !== 0) return unreadDiff
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

function notifyOnFreshEmployeeAlerts(previous: NotificationRow[], next: NotificationRow[]) {
  if (!import.meta.client || !previous.length) return

  const known = new Set(previous.map((n) => n.id))
  const fresh = next.filter((n) => !known.has(n.id))
  if (!fresh.length) return

  const { playFlaggedAlertSound, playHandoffAlertSound } = useEmployeeSettings()

  for (const row of fresh) {
    const title = (row.title || '').toLowerCase()
    if (title.includes('compliance') || title.includes('flagged') || title.includes('issue')) {
      playFlaggedAlertSound()
    } else if (title.includes('inbound') || title.includes('review required') || title.includes('hand-off')) {
      playHandoffAlertSound()
    }
  }
}

async function resolveMessengerScope(): Promise<{ userId: string, orgId: string }> {
  const auth = useAuthStore()
  const sessionCookie = useCookie<string | null>('user_session')

  const userId = String(auth.user?.user_id ?? sessionCookie.value ?? '')
  let orgId = auth.user?.org_id != null ? String(auth.user.org_id) : ''

  if (!orgId && userId) {
    try {
      const org = await $fetch<{ org_id: string | number }>('/api/org/getorg', {
        method: 'POST',
        body: { user_id: userId },
      })
      if (org?.org_id != null) {
        orgId = String(org.org_id)
      }
    } catch {
      // fall through
    }
  }

  return { userId, orgId }
}

async function loadMessengerNotificationsFromApi(unreadOnly = false): Promise<NotificationRow[]> {
  const { userId, orgId } = await resolveMessengerScope()

  if (!userId || !orgId) {
    throw new Error('Messenger session or organisation could not be resolved.')
  }

  const res = await $fetch<{
    success: boolean
    count: number
    notifications: NotificationRow[]
  }>('/api/notifications', {
    query: { unread: unreadOnly ? 'true' : 'false' },
    credentials: 'include',
  })

  return res.notifications ?? []
}

async function loadEmployeeNotificationsFromApi(): Promise<NotificationRow[]> {
  const res = await $fetch<{
    success: boolean
    count: number
    notifications: NotificationRow[]
  }>('/api/notifications', {
    query: { unread: 'false' },
    credentials: 'include',
  })

  return res.notifications ?? []
}

async function loadClientNotificationsFromApi(unreadOnly = false): Promise<NotificationRow[]> {
  const res = await $fetch<{
    success: boolean
    count: number
    notifications: NotificationRow[]
  }>('/api/notifications', {
    query: { unread: unreadOnly ? 'true' : 'false' },
    credentials: 'include',
  })

  return res.notifications ?? []
}

/**
 * Shared Liaison (messenger) notification store.
 *
 * Office-assigned Liaison model: these are now direct-address notifications
 * ("Document Assigned to You") rather than a claimable org-wide pool — there is no
 * accept/claim step. `unreadCount` / `markAsRead` mirror the client/employee stores.
 */
export function useMessengerNotifications() {
  const notifications = useState<NotificationRow[]>('messenger:notifications', () => [])
  const loading = useState('messenger:notifications-loading', () => false)
  const error = useState<string | null>('messenger:notifications-error', () => null)
  const markingId = useState<string | null>('messenger:notifications-marking', () => null)
  const lastFetchedAt = useState<number | null>('messenger:notifications-fetched-at', () => null)

  const unreadCount = computed(() =>
    notifications.value.filter((n) => isUnreadNotification(n.is_read)).length,
  )

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  async function fetchNotifications(force = false) {
    if (loading.value && !force) return

    loading.value = true
    error.value = null
    const previousCount = notifications.value.filter((n) => isUnreadNotification(n.is_read)).length

    try {
      // Always load the full recent feed (not just unread) so the notifications
      // page can show assignment history, not just a disappearing unread queue.
      const rows = await loadMessengerNotificationsFromApi(false)
      notifications.value = Array.isArray(rows) ? [...rows] : []
      lastFetchedAt.value = Date.now()

      if (import.meta.client) {
        const { playPickupSound, soundAlertsOnPickup } = useMessengerSettings()
        const newCount = notifications.value.filter((n) => isUnreadNotification(n.is_read)).length
        if (soundAlertsOnPickup.value && newCount > previousCount && previousCount > 0) {
          playPickupSound()
        }
      }
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }, message?: string }
      error.value = e?.data?.message ?? e?.message ?? 'Failed to load notifications.'
      notifications.value = []
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(notificationId: string) {
    markingId.value = notificationId
    try {
      await $fetch('/api/notifications/mark-read', {
        method: 'POST',
        body: { notification_id: notificationId },
        credentials: 'include',
      })
      await fetchNotifications(true)
    } finally {
      markingId.value = null
    }
  }

  function startAutoRefresh(intervalMs = 15000) {
    if (!import.meta.client) return
    const { pushBroadcastNotifications } = useMessengerSettings()
    if (!pushBroadcastNotifications.value) return
    stopAutoRefresh()
    refreshTimer = setInterval(() => {
      fetchNotifications()
    }, intervalMs)
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  onUnmounted(stopAutoRefresh)

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markingId,
    lastFetchedAt,
    fetchNotifications,
    markAsRead,
    startAutoRefresh,
    stopAutoRefresh,
  }
}

/** Shared employee inbound notification store */
export function useEmployeeNotifications() {
  const notifications = useState<NotificationRow[]>('employee:notifications', () => [])
  const loading = useState('employee:notifications-loading', () => false)
  const error = useState<string | null>('employee:notifications-error', () => null)
  const markingId = useState<string | null>('employee:notifications-marking', () => null)
  const lastFetchedAt = useState<number | null>('employee:notifications-fetched-at', () => null)

  const unreadCount = computed(() =>
    notifications.value.filter((n) => isUnreadNotification(n.is_read)).length,
  )

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  async function fetchNotifications(force = false) {
    if (loading.value && !force) return

    const previous = notifications.value
    loading.value = true
    error.value = null
    try {
      const rows = await loadEmployeeNotificationsFromApi()
      const next = Array.isArray(rows) ? [...rows] : []
      notifyOnFreshEmployeeAlerts(previous, next)
      notifications.value = next
      lastFetchedAt.value = Date.now()
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }, message?: string }
      error.value = e?.data?.message ?? e?.message ?? 'Failed to load notifications.'
      notifications.value = []
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(notificationId: string) {
    markingId.value = notificationId
    try {
      await $fetch('/api/notifications/mark-read', {
        method: 'POST',
        body: { notification_id: notificationId },
        credentials: 'include',
      })
      await fetchNotifications(true)
    } finally {
      markingId.value = null
    }
  }

  function startAutoRefresh(intervalMs = 15000) {
    if (!import.meta.client) return
    stopAutoRefresh()
    refreshTimer = setInterval(() => {
      fetchNotifications()
    }, intervalMs)
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  onUnmounted(stopAutoRefresh)

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markingId,
    lastFetchedAt,
    fetchNotifications,
    markAsRead,
    startAutoRefresh,
    stopAutoRefresh,
  }
}

export function useNotifications(options: { autoRefreshMs?: number } = {}) {
  const store = useMessengerNotifications()
  onMounted(() => {
    if (!store.lastFetchedAt.value) {
      store.fetchNotifications()
    }
    store.startAutoRefresh(options.autoRefreshMs ?? 15000)
  })
  return store
}

export function useMessengerNotificationBadge() {
  const { unreadCount, fetchNotifications } = useMessengerNotifications()

  async function refresh() {
    await fetchNotifications()
  }

  return { count: unreadCount, refresh }
}

export function useEmployeeNotificationBadge() {
  const { unreadCount, fetchNotifications } = useEmployeeNotifications()

  async function refresh() {
    await fetchNotifications()
  }

  return { count: unreadCount, refresh }
}

/** Shared client document-update notification store */
export function useClientNotifications() {
  const notifications = useState<NotificationRow[]>('client:notifications', () => [])
  const loading = useState('client:notifications-loading', () => false)
  const error = useState<string | null>('client:notifications-error', () => null)
  const markingId = useState<string | null>('client:notifications-marking', () => null)
  const lastFetchedAt = useState<number | null>('client:notifications-fetched-at', () => null)

  const unreadCount = computed(() =>
    notifications.value.filter((n) => isUnreadNotification(n.is_read)).length,
  )

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  async function fetchNotifications(force = false) {
    if (loading.value && !force) return

    loading.value = true
    error.value = null
    try {
      const rows = await loadClientNotificationsFromApi(false)
      notifications.value = Array.isArray(rows) ? [...rows] : []
      lastFetchedAt.value = Date.now()
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }, message?: string }
      error.value = e?.data?.message ?? e?.message ?? 'Failed to load notifications.'
      notifications.value = []
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(notificationId: string) {
    markingId.value = notificationId
    try {
      await $fetch('/api/notifications/mark-read', {
        method: 'POST',
        body: { notification_id: notificationId },
        credentials: 'include',
      })
      await fetchNotifications(true)
    } finally {
      markingId.value = null
    }
  }

  function startAutoRefresh(intervalMs = 15000) {
    if (!import.meta.client) return
    stopAutoRefresh()
    refreshTimer = setInterval(() => {
      fetchNotifications()
    }, intervalMs)
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  onUnmounted(stopAutoRefresh)

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markingId,
    lastFetchedAt,
    fetchNotifications,
    markAsRead,
    startAutoRefresh,
    stopAutoRefresh,
  }
}

export function useClientNotificationBadge() {
  const unreadCount = useState('client:notifications-badge-count', () => 0)

  async function refresh() {
    try {
      const rows = await loadClientNotificationsFromApi(true)
      unreadCount.value = rows.length
    } catch {
      unreadCount.value = 0
    }
  }

  return { count: unreadCount, refresh }
}

export function useClientReportBadge() {
  const count = useState('client:reports-unread-count', () => 0)

  async function refresh() {
    try {
      const res = await $fetch<{ success: boolean; count: number }>('/api/reports/unread-count', {
        credentials: 'include',
      })
      count.value = res.count ?? 0
    } catch {
      count.value = 0
    }
  }

  return { count, refresh }
}
