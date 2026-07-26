import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices, parseScope } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)
  const scope = parseScope(query.scope as string | undefined ?? 'LOCAL')

  const actor = await resolveActorContextWithOffices(event, client)

  // We will build a realistic-looking payload based on actual document counts
  // in the organisation (GLOBAL) or the employee's offices (LOCAL).

  let docQuery = client
    .from('documents')
    .select('id, tracking_status, created_at')
    .eq('org_id', actor.orgId)

  if (scope === 'LOCAL' && actor.officeIds.length > 0) {
    const officeList = actor.officeIds.join(',')
    docQuery = docQuery.or(
      `origin_office_id.in.(${officeList}),` +
      `current_office_id.in.(${officeList}),` +
      `office_id.in.(${officeList})`
    )
  }

  const { data: docs } = await docQuery

  const now = new Date()
  const documents = docs ?? []

  // Count documents created in the last 6, 4, 2 hours
  let h6 = 0, h4 = 0, h2 = 0, h0 = 0
  let inTransit = 0
  
  for (const d of documents) {
    if (d.tracking_status === 'IN_TRANSIT') {
      inTransit++
    }

    const created = new Date(d.created_at)
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60)

    if (diffHours <= 2) h0++
    else if (diffHours <= 4) h2++
    else if (diffHours <= 6) h4++
    else if (diffHours <= 8) h6++
  }

  const historicalBase = [h6, h4, h2, h0]

  // Predict future based on IN_TRANSIT and recent momentum
  const momentum = (h0 - h2) / 2
  const incomingPredict = inTransit

  const p2 = Math.max(0, Math.floor(h0 + momentum + (incomingPredict * 0.4)))
  const p4 = Math.max(0, Math.floor(p2 + (momentum * 0.5) + (incomingPredict * 0.3)))
  const p6 = Math.max(0, Math.floor(p4 * 0.8))

  const predictedBase = [null, null, null, historicalBase[3], p2, p4, p6]

  return {
    success: true,
    scope,
    data: {
      historical: historicalBase,
      predicted: predictedBase,
    }
  }
})
