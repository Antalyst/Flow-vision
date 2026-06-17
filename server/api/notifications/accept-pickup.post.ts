import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { claimPickupNotification } from '~~/server/utils/notifications'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const notificationId = body?.notification_id ?? body?.notificationId

  const userId = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role')

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Authentication required.' })
  }

  if (userRole !== 'messenger') {
    throw createError({ statusCode: 403, message: 'Only messengers can accept pickup requests.' })
  }

  if (!notificationId) {
    throw createError({ statusCode: 400, message: 'notification_id is required.' })
  }

  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  const result = await claimPickupNotification(
    client,
    String(notificationId),
    userId,
    actor.fullName ?? 'Messenger',
    actor.orgId,
  )

  if (!result.success) {
    throw createError({
      statusCode: result.code === 'ALREADY_CLAIMED' ? 409 : 400,
      message: result.message,
      data: { code: result.code },
    })
  }

  return {
    success: true,
    message: result.message,
    document: result.document,
  }
})
