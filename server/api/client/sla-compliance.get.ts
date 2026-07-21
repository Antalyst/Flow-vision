import { buildSlaComplianceRows } from '~~/server/utils/portalAnalytics'

export default defineEventHandler(async (event) => {
  const data = await buildSlaComplianceRows(event)
  return { success: true, ...data }
})
