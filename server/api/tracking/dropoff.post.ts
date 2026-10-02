/**
 * POST /api/tracking/dropoff
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
    message: "The office wall-QR drop-off was retired. The receiving office now scans the document's own QR code to receive it (Scan → Receive).",
    data: { code: 'DROPOFF_RETIRED' },
  })
})
