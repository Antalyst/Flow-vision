import { buildClientDashboardPayload } from '~~/server/utils/dashboardAnalytics'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const officeId = query.officeId as string | undefined
  const payload = await buildClientDashboardPayload(event, officeId)
  return { success: true, ...payload }
})
