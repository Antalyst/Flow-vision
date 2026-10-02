/**
 * GET /api/tracking/routing-features
 *
 * Which optional routing features this deployment's database supports, so
 * the route builder only offers what will work. The server still enforces
 * the same check on every recurring operation.
 */
import { recurringRoutingAvailable } from '~~/server/utils/recurringRouting'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  return { success: true, recurring: await recurringRoutingAvailable() }
})
