import { resolveTenant, listSessions } from '~~/server/utils/aiSession'

// GET /api/ai/sessions
// Lists the calling user's chat sessions (newest first) for the "Recents" rail.
// Filtered STRICTLY by the decoded user_id to avoid empty results from a
// mismatched org scope.
export default defineEventHandler(async (event) => {
  const { userId } = await resolveTenant(event)
  const sessions = await listSessions(userId, event)

  return {
    success: true,
    sessions,
  }
})
