import { buildClientDashboardPayload } from '~~/server/utils/dashboardAnalytics'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const officeId = query.officeId as string | undefined

  const rawYear = query.forecastYear
  const rawMonth = query.forecastMonth
  const rawDow = query.forecastDayOfWeek
  const forecastYear = rawYear !== undefined && rawYear !== '' ? Number(rawYear) : undefined
  const forecastMonth = rawMonth !== undefined && rawMonth !== '' ? Number(rawMonth) : undefined
  const forecastDayOfWeek = rawDow !== undefined && rawDow !== '' ? Number(rawDow) : undefined

  const payload = await buildClientDashboardPayload(event, officeId, {
    year: Number.isFinite(forecastYear) ? forecastYear : undefined,
    month: Number.isFinite(forecastMonth) ? forecastMonth : undefined,
    dayOfWeek: Number.isFinite(forecastDayOfWeek) ? forecastDayOfWeek : undefined,
  })
  return { success: true, ...payload }
})
