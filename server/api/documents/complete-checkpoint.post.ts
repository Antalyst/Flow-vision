/**
 * POST /api/documents/complete-checkpoint
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
    message: '"Mark Reviewed" was replaced by the release workflow: the staff member holding the document requests release, and the office head approves it (or completes it at the final stop).',
    data: { code: 'CHECKPOINT_REVIEW_RETIRED' },
  })
})
