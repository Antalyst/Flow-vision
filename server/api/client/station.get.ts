import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { buildCheckpointQrPayload, resolveOrCreateClientStation } from '~~/server/utils/clientStation'

/**
 * GET /api/client/station
 *
 * Returns (and auto-provisions) the permanent client dispatch checkpoint for the org.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'client') {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client administrators may access the dispatch station QR.',
    })
  }

  const { data: orgRow } = await client
    .from('org')
    .select('org_name, org_code')
    .eq('org_id', actor.orgId)
    .maybeSingle()

  const orgName = (orgRow as { org_name?: string } | null)?.org_name ?? null

  const station = await resolveOrCreateClientStation(
    client,
    actor.orgId,
    actor.userId,
    orgName,
  )

  const qrPayload = buildCheckpointQrPayload(station.id)

  return {
    success: true,
    data: {
      station,
      qr_payload: qrPayload,
    },
  }
})
