import { buildWorkloadAnalytics } from '~~/server/utils/portalAnalytics'

export default defineEventHandler(async (event) => {
  const data = await buildWorkloadAnalytics(event)
  return { success: true, data }
})
