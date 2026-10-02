/**
 * POST /api/tracking/advance
 *
 * @deprecated Retired with the custody + office-head release workflow
 * (see server/api/tracking/receive.post.ts, custody-transfer.post.ts,
 * release-request.post.ts, release-decision.post.ts). Kept so stale app
 * builds get a clear message instead of silently using the old flow.
 * Historical records created by it are untouched.
 */
export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    message: 'Manual status changes were retired. Documents move only through pickup, receipt, and office-head release approval.',
    data: { code: 'MANUAL_ADVANCE_RETIRED' },
  })
})
