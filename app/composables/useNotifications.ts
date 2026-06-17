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
}

export function isUnclaimedNotification(value: unknown): boolean {
  return value === false || value === 'false' || value === 0 || value == null
}

export function isUnreadNotification(value: unknown): boolean {
  return value === false || value === 'false' || value === 0 || value == null
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

async function loadMessengerNotificationsFromApi(): Promise<NotificationRow[]> {
  const { userId, orgId } = await resolveMessengerScope()

  if (!userId || !orgId) {
    throw new Error('Messenger session or organisation could not be resolved.')
  }

  const res = await $fetch<{
    success: boolean
    count: number
    notifications: NotificationRow[]
  }>('/api/notifications', {
    query: { unclaimed: 'true' },
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

/** Shared messenger notification store */
export function useMessengerNotifications() {
  const notifications = useState<NotificationRow[]>('messenger:notifications', () => [])
  const loading = useState('messenger:notifications-loading', () => false)
  const error = useState<string | null>('messenger:notifications-error', () => null)
  const claimingId = useState<string | null>('messenger:notifications-claiming', () => null)
  const lastFetchedAt = useState<number | null>('messenger:notifications-fetched-at', () => null)

  const unclaimedCount = computed(() =>
    notifications.value.filter((n) => isUnclaimedNotification(n.is_claimed)).length,
  )

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  async function fetchNotifications(force = false) {
    if (loading.value && !force) return

    loading.value = true
    error.value = null
    try {
      const rows = await loadMessengerNotificationsFromApi()
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

  async function acceptPickup(notificationId: string): Promise<{ success: boolean, message?: string }> {
    claimingId.value = notificationId
    try {
      await $fetch('/api/notifications/accept-pickup', {
        method: 'POST',
        body: { notification_id: notificationId },
        credentials: 'include',
      })
      await fetchNotifications(true)
      return { success: true }
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }, message?: string }
      const message = e?.data?.message ?? e?.message ?? 'Failed to accept pickup.'
      if (import.meta.client) {
        window.alert(message)
      }
      return { success: false, message }
    } finally {
      claimingId.value = null
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
    unclaimedCount,
    loading,
    error,
    claimingId,
    lastFetchedAt,
    fetchNotifications,
    acceptPickup,
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

    loading.value = true
    error.value = null
    try {
      const rows = await loadEmployeeNotificationsFromApi()
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
  const { unclaimedCount, fetchNotifications } = useMessengerNotifications()

  async function refresh() {
    await fetchNotifications()
  }

  return { count: unclaimedCount, refresh }
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
