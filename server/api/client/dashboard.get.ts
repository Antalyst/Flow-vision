import { buildClientDashboardPayload } from '~~/server/utils/dashboardAnalytics'

export default defineEventHandler(async (event) => {
  const payload = await buildClientDashboardPayload(event)
  return { success: true, ...payload }
})
