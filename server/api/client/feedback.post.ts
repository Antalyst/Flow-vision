import { serverSupabaseClient } from '#supabase/server'
import { logActivitySafe } from '~~/server/utils/activityLog'
import { resolveActorContext } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)
  const body = await readBody(event)

  if (actor.userRole.toLowerCase() !== 'client') {
    throw createError({ statusCode: 403, message: 'Only client accounts can submit platform feedback.' })
  }

  const { subject, message, category } = body

  if (!subject?.trim() || !message?.trim()) {
    throw createError({ statusCode: 400, message: 'Subject and message are required.' })
  }

  const details = `[${category || 'general'}] ${subject.trim()}: ${message.trim()}`

  await logActivitySafe({
    orgId: actor.orgId,
    userId: actor.userId,
    userName: actor.fullName,
    actorName: actor.fullName,
    actionType: 'client_feedback',
    details,
    message: details,
    metadata: { category: category || 'general', subject: subject.trim() },
  }, client)

  return {
    success: true,
    message: 'Feedback submitted. Our operations team has received your note.',
  }
})
