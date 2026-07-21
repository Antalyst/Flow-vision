import {
  fetchClientNotifications,
  fetchEmployeeNotifications,
  fetchNotificationsForRole,
} from '~~/server/utils/notifications'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userRole = (getCookie(event, 'user_role') ?? '').toLowerCase()

  if (userRole === 'client') {
    const unreadOnly = query.unread !== 'false'
    const notifications = await fetchClientNotifications(event, { unreadOnly })

    return {
      success: true,
      count: notifications.length,
      notifications,
    }
  }

  if (userRole === 'employee') {
    const unreadOnly = query.unread !== 'false'
    const notifications = await fetchEmployeeNotifications(event, { unreadOnly })

    return {
      success: true,
      count: notifications.length,
      notifications,
    }
  }

  const unclaimedOnly = query.unclaimed !== 'false'
  const notifications = await fetchNotificationsForRole(event, { unclaimedOnly })

  return {
    success: true,
    count: notifications.length,
    notifications,
  }
})
