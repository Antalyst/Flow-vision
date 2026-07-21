import { serverSupabaseClient } from '#supabase/server'
import { ISSUE_ALLOWED_ROLES, assertDocumentOrgAccess } from '~~/server/utils/documentIssues'

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

  let previousOfficeId: string | null = null

  const { data: docRow } = await client
    .from('documents')
    .select('current_step, stage_id, origin_office_id')
    .eq('id', documentId)
    .maybeSingle()

  const currentStep = Number((docRow as { current_step?: number } | null)?.current_step ?? 0)
  const stageId = (docRow as { stage_id?: string | null } | null)?.stage_id

  if (stageId && currentStep > 1) {
    const { data: prevStep } = await client
      .from('stage_steps')
      .select('office_id')
      .eq('stage_id', stageId)
      .eq('step_number', currentStep - 1)
      .maybeSingle()

    if (prevStep?.office_id) {
      previousOfficeId = String(prevStep.office_id)
    }
  } else if (document.origin_office_id && currentStep <= 1) {
    previousOfficeId = String(document.origin_office_id)
  }

  if (previousOfficeId && !targets.some((t) => t.id === previousOfficeId && t.role === 'previous_handoff')) {
    const { data: prevOffice } = await client
      .from('offices')
      .select('id, name, code')
      .eq('id', previousOfficeId)
      .maybeSingle()

    if (prevOffice) {
      const isDuplicateOrigin =
        targets.some((t) => t.role === 'origin' && t.id === String(prevOffice.id))

      if (!isDuplicateOrigin) {
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
