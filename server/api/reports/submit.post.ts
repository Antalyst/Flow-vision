import {
  buildEmployeeReportContext,
  buildMessengerReportContext,
  submitOperationalReport,
} from '~~/server/utils/operationalReports'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { report_type, title, body: reportBody, scope, metadata } = body

  const actorRole = (sessionRole(event) ?? '').toLowerCase()

  let enrichedMetadata = { ...(metadata ?? {}) }
  if (actorRole === 'employee') {
    enrichedMetadata = { ...enrichedMetadata, context: await buildEmployeeReportContext(event) }
  } else if (actorRole === 'messenger') {
    enrichedMetadata = { ...enrichedMetadata, context: await buildMessengerReportContext(event) }
  }

  const { report, broadcastCount } = await submitOperationalReport(event, {
    report_type: report_type || 'operational_summary',
    title,
    body: reportBody,
    scope,
    metadata: enrichedMetadata,
  })

  return {
    success: true,
    message: broadcastCount > 0
      ? `Report submitted and broadcast to ${broadcastCount} client account(s).`
      : 'Report submitted successfully.',
    data: { report, broadcast_count: broadcastCount },
  }
})
