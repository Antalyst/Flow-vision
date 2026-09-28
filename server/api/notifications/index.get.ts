import {
  fetchClientNotifications,
  fetchEmployeeNotifications,
  fetchMessengerNotifications,
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

  if (userRole === 'employee' || userRole === 'employee_sub_user') {
    const unreadOnly = query.unread !== 'false'
    const notifications = await fetchEmployeeNotifications(event, { unreadOnly })

    return {
      success: true,
      count: notifications.length,
      notifications,
    }
  }

  // Liaison/messenger notifications are now direct-address (assigned deliveries),
  // not a claimable pool — same unread/all toggle as the client/employee feeds.
  const unreadOnly = query.unread !== 'false'
  const notifications = await fetchMessengerNotifications(event, { unreadOnly })

  return {
    success: true,
    count: notifications.length,
    notifications,
  }
})
