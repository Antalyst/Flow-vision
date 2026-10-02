/**
 * GET /api/staff/my-desk
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
    message: "Desk QR codes were retired. The document's own QR code identifies it.",
    data: { code: 'DESK_QR_RETIRED' },
  })
})
