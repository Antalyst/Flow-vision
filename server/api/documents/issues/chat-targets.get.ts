import { serverSupabaseClient } from '#supabase/server'
import { assertCanReportOnDocument, resolveSendBackTargets } from '~~/server/utils/documentIssues'

interface OfficeTarget {
  id: string
  name: string
  code: string | null
  role: 'origin' | 'previous_handoff'
}

/**
 * GET /api/documents/issues/chat-targets?document_id=
 *
 * The offices a discrepancy on this document can be sent back to (from its
 * actual route — see resolveSendBackTargets): the office that handed it here
 * (default) and the office the current routing cycle started from. Empty
 * while the document is still at its origin. Only for users who may report on
 * the document.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const documentId = String(getQuery(event).document_id ?? '').trim()

  if (!documentId) {
    throw createError({ statusCode: 400, message: 'document_id is required.' })
  }

  // Same rule as reporting itself: only someone who may report on this document.
  await assertCanReportOnDocument(event, client, documentId)

  const sendBack = await resolveSendBackTargets(client, documentId)
  const { data: codes } = sendBack.length
    ? await client.from('offices').select('id, code').in('id', sendBack.map((t) => t.officeId))
    : { data: [] as any[] }
  const codeOf = new Map((codes ?? []).map((o: any) => [String(o.id), o.code ?? null]))

  const targets: OfficeTarget[] = sendBack.map((t) => ({
    id: t.officeId,
    name: t.officeName,
    code: codeOf.get(t.officeId) ?? null,
    role: t.role,
  }))

  return {
    success: true,
    data: {
      origin: targets.find((t) => t.role === 'origin') ?? null,
      previous_handoff: targets.find((t) => t.role === 'previous_handoff') ?? null,
      targets,
    },
  }
})
