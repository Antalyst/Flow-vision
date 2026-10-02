/**
 * POST /api/tracking/desk-transfer
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
    message: 'Desk QR transfers were retired. Hand a document to a colleague from its details ("Hand over") — no QR needed.',
    data: { code: 'DESK_TRANSFER_RETIRED' },
  })
})
