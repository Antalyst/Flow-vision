import { fetchActivityLogsForActor } from '~~/server/utils/activityLog'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const datePreset = (query.range as string | undefined) ?? 'week'
  const actionType = (query.action as string | undefined) ?? 'all'
  const limit = Number(query.limit ?? 100)

  const validRanges = ['day', 'week', 'month', 'all']
  const range = validRanges.includes(datePreset) ? datePreset as 'day' | 'week' | 'month' | 'all' : 'week'

  const logs = await fetchActivityLogsForActor(event, {
    datePreset: range,
    actionType,
    limit,
  })

  return { success: true, logs }
})
