import { countUnreadOperationalReports } from '~~/server/utils/operationalReports'

export default defineEventHandler(async (event) => {
  const count = await countUnreadOperationalReports(event)
  return { success: true, count }
})
