import { serverSupabaseClient } from '#supabase/server'
import {
  markClientNotificationRead,
  markEmployeeNotificationRead,
  resolveEmployeeAssignedOfficeIds,
} from '~~/server/utils/notifications'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  const config = useRuntimeConfig()
  return createClient(
    String(config.public.supabaseUrl),
    String(config.supabaseServiceKey),
  )
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const notificationId = body?.notification_id ?? body?.notificationId

  const userId = sessionUserId(event)
  const userRole = sessionRole(event)

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Authentication required.' })
  }

  if (!notificationId) {
    throw createError({ statusCode: 400, message: 'notification_id is required.' })
  }

  const role = (userRole ?? '').toLowerCase()
  if (role !== 'employee' && role !== 'employee_sub_user' && role !== 'client' && role !== 'messenger') {
    throw createError({ statusCode: 403, message: 'Only clients, employees, or liaisons can mark notifications as read.' })
  }

  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  let ok = false

  if (role === 'client' || role === 'messenger') {
    // Both are direct-address (user_id = them) — same org+user_id ownership check applies.
    ok = await markClientNotificationRead(
      String(notificationId),
      actor.orgId,
      actor.userId,
    )
  } else {
    const db = getServiceSupabase()
    const officeIds = await resolveEmployeeAssignedOfficeIds(db, actor.orgId, actor.userId)
    ok = await markEmployeeNotificationRead(
      String(notificationId),
      actor.orgId,
      officeIds,
      actor.userId,
    )
  }

  if (!ok) {
    throw createError({ statusCode: 404, message: 'Notification not found or not accessible.' })
  }

  return { success: true }
})
