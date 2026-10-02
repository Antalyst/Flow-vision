/**
 * GET /api/tracking/office-members?document_id=...
 *
 * Staff of the office currently holding the document — the people it can be
 * handed to. Only for members of that same office.
 */
import { getOfficeMembers } from '~~/server/utils/documentAccess'
import { loadDocumentAtMyOffice } from '~~/server/utils/officeWorkflow'

export default defineEventHandler(async (event) => {
  const ctx = await loadDocumentAtMyOffice(event, getQuery(event).document_id)
  const members = await getOfficeMembers(ctx.actor.orgId, ctx.officeId)
  return {
    success: true,
    data: members
      .map((m) => ({ ...m, is_holder: m.user_id === String(ctx.doc.current_handler_id ?? '') }))
      .sort((a, b) => String(a.full_name ?? '').localeCompare(String(b.full_name ?? ''))),
  }
})
