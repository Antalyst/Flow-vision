import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices, parseScope } from '~~/server/utils/actorContext'

const MAX_RANGE_DAYS = 62

const toDateOnly = (d: Date) => d.toISOString().slice(0, 10)

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)
  const scope = parseScope(query.scope as string | undefined ?? 'LOCAL')

  const actor = await resolveActorContextWithOffices(event, client)

  // ── Resolve the requested date range (defaults to the last 7 days) ───────
  const today = new Date()
  const defaultStart = new Date(today)
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 6)

  let startStr = (query.start as string | undefined) || toDateOnly(defaultStart)
  let endStr   = (query.end as string | undefined) || toDateOnly(today)

  if (new Date(startStr) > new Date(endStr)) {
    ;[startStr, endStr] = [endStr, startStr]
  }

  const rangeStart = new Date(`${startStr}T00:00:00.000Z`)
  const rangeEnd   = new Date(`${endStr}T23:59:59.999Z`)
  const spanDays   = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

  if (spanDays > MAX_RANGE_DAYS) {
    throw createError({ statusCode: 400, statusMessage: `Date range too large — pick ${MAX_RANGE_DAYS} days or fewer.` })
  }

  // ── Query documents created within the range, scoped like before ─────────
  let docQuery = client
    .from('documents')
    .select('id, created_at')
    .eq('org_id', actor.orgId)
    .gte('created_at', rangeStart.toISOString())
    .lte('created_at', rangeEnd.toISOString())

  if (scope === 'LOCAL' && actor.officeIds.length > 0) {
    const officeList = actor.officeIds.join(',')
    docQuery = docQuery.or(
      `origin_office_id.in.(${officeList}),` +
      `current_office_id.in.(${officeList}),` +
      `office_id.in.(${officeList})`
    )
  }

  const { data: docs, error } = await docQuery

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // ── Bucket counts per calendar day across the range ───────────────────────
  const counts: Record<string, number> = {}
  for (let i = 0; i < spanDays; i++) {
    const d = new Date(rangeStart)
    d.setUTCDate(d.getUTCDate() + i)
    counts[toDateOnly(d)] = 0
  }
  for (const doc of docs ?? []) {
    const key = toDateOnly(new Date(doc.created_at))
    if (key in counts) counts[key]++
  }

  return {
    success: true,
    scope,
    start: startStr,
    end: endStr,
    data: {
      labels: Object.keys(counts),
      values: Object.values(counts),
    },
  }
})
