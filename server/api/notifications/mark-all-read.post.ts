import { serverSupabaseClient } from '#supabase/server'
import {
  markAllClientNotificationsRead,
  markAllEmployeeNotificationsRead,
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
  const userId = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role')

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Authentication required.' })
  }

  const role = (userRole ?? '').toLowerCase()
  if (role !== 'employee' && role !== 'client' && role !== 'messenger') {
    throw createError({ statusCode: 403, message: 'Only clients, employees, or liaisons can mark notifications as read.' })
  }

  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  let ok = false

  if (role === 'client' || role === 'messenger') {
    ok = await markAllClientNotificationsRead(actor.orgId, actor.userId)
  } else {
    const db = getServiceSupabase()
    const officeIds = await resolveEmployeeAssignedOfficeIds(db, actor.orgId, actor.userId)
    ok = await markAllEmployeeNotificationsRead(actor.orgId, officeIds)
  }

  if (!ok) {
    throw createError({ statusCode: 500, message: 'We could not mark all notifications as read. Please try again.' })
  }

  return { success: true }
})
