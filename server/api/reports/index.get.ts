import { listOperationalReports } from '~~/server/utils/operationalReports'

export default defineEventHandler(async (event) => {
  const reports = await listOperationalReports(event)
  return { success: true, count: reports.length, data: reports }
})
