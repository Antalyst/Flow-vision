import {
  buildEmployeeReportContext,
  buildMessengerReportContext,
} from '~~/server/utils/operationalReports'

export default defineEventHandler(async (event) => {
  const role = (sessionRole(event) ?? '').toLowerCase()

  if (role === 'employee') {
    const context = await buildEmployeeReportContext(event)
    return { success: true, role, context }
  }

  if (role === 'messenger') {
    const context = await buildMessengerReportContext(event)
    return { success: true, role, context }
  }

  return { success: true, role, context: null }
})
