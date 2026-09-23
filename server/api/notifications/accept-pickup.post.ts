/**
 * POST /api/notifications/accept-pickup
 *
 * @deprecated The pool-based "accept a task" workflow has been replaced by the
 * office-assigned Liaison model: the current office explicitly assigns a specific
 * liaison via `POST /api/tracking/assign-liaison`, and that liaison performs pickup
 * directly (their assignment is already authoritative — no accept/claim step).
 *
 * This endpoint is intentionally left in place (not deleted) but disabled, so any
 * stale client build or external caller gets a clear, actionable error instead of
 * silently re-enabling pool-style claiming.
 */
export default defineEventHandler(async () => {
  throw createError({
    statusCode: 410,
    message:
      'This workflow has changed. Documents are no longer claimed by messengers — the current office ' +
      'assigns a specific Liaison directly. Reload the app; assigned deliveries appear automatically ' +
      'on the Deliveries page with nothing to accept.',
    data: { code: 'ACCEPT_PICKUP_REMOVED' },
  })
})
