import { serverSupabaseClient } from '#supabase/server'
import { ISSUE_ALLOWED_ROLES, assertDocumentOrgAccess, resolvePreviousRouteOffice } from '~~/server/utils/documentIssues'

interface OfficeTarget {
  id: string
  name: string
  code: string | null
  role: 'origin' | 'previous_handoff'
}

/**
 * GET /api/documents/issues/chat-targets?document_id=
 *
 * Resolves compliance chat targets from the document routing pipeline.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const documentId = String(getQuery(event).document_id ?? '').trim()

  if (!documentId) {
    throw createError({ statusCode: 400, message: 'document_id is required.' })
  }

  const { actor, document } = await assertDocumentOrgAccess(event, client, documentId)

  if (!(ISSUE_ALLOWED_ROLES as readonly string[]).includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client or employee accounts may view compliance chat targets.',
    })
  }

  const targets: OfficeTarget[] = []

  if (document.origin_office_id) {
    const { data: originOffice } = await client
      .from('offices')
      .select('id, name, code')
      .eq('id', document.origin_office_id)
      .maybeSingle()

    if (originOffice) {
      targets.push({
        id: String(originOffice.id),
        name: originOffice.name,
        code: originOffice.code ?? null,
        role: 'origin',
      })
    }
  }

  const previousOffice = await resolvePreviousRouteOffice(client, documentId)

  if (previousOffice) {
    const isDuplicateOrigin = targets.some((t) => t.role === 'origin' && t.id === previousOffice.officeId)
    if (!isDuplicateOrigin) {
      const { data: prevOffice } = await client
        .from('offices')
        .select('id, name, code')
        .eq('id', previousOffice.officeId)
        .maybeSingle()

      if (prevOffice) {
        targets.push({
          id: String(prevOffice.id),
          name: prevOffice.name,
          code: prevOffice.code ?? null,
          role: 'previous_handoff',
        })
      }
    }
  }

  return {
    success: true,
    data: {
      origin: targets.find((t) => t.role === 'origin') ?? null,
      previous_handoff: targets.find((t) => t.role === 'previous_handoff') ?? null,
      targets,
    },
  }
})
