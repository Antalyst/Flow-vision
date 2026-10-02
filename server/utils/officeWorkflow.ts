/**
 * server/utils/officeWorkflow.ts
 *
 * Shared loader for actions on a document that is sitting at an office
 * (custody transfer, release request, release decision). Verifies, from the
 * session and the database only:
 *   - the caller is office staff of the document's organization
 *   - the document is ARRIVED_AT_OFFICE at an office the caller belongs to
 */
import type { H3Event } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { getDocumentRoute, getOfficeHeadId, lifecycleDb, routeStopAt, type RouteStop } from '~~/server/utils/documentRoute'
import { ACCESS_DOC_COLUMNS } from '~~/server/utils/documentAccess'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function loadDocumentAtMyOffice(event: H3Event, documentId: unknown) {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)
  if (actor.userRole !== 'employee' && actor.userRole !== 'employee_sub_user') {
    throw createError({ statusCode: 403, message: 'Only office staff can do this.' })
  }

  const id = String(documentId ?? '').trim()
  if (!UUID_RE.test(id)) throw createError({ statusCode: 400, message: 'Please select a document.' })

  const { data: doc } = await lifecycleDb()
    .from('documents')
    .select(`${ACCESS_DOC_COLUMNS}, title, creator_role, current_handler_id, checkpoint_cleared_step, status, qr_code_data`)
    .eq('id', id)
    .maybeSingle()

  if (!doc || String(doc.org_id) !== actor.orgId) {
    throw createError({ statusCode: 404, message: 'We could not find this document.' })
  }
  if (doc.tracking_status !== 'ARRIVED_AT_OFFICE' || !doc.current_office_id) {
    throw createError({
      statusCode: 422,
      message: doc.tracking_status === 'COMPLETED'
        ? 'This document has already completed its route.'
        : 'This document is not being handled at an office right now.',
      data: { code: 'NOT_AT_OFFICE', tracking_status: doc.tracking_status },
    })
  }
  const officeId = String(doc.current_office_id)
  if (!actor.officeIds.includes(officeId)) {
    throw createError({
      statusCode: 403,
      message: 'This document is not at your office.',
      data: { code: 'OFFICE_SCOPE_MISMATCH' },
    })
  }

  const route: RouteStop[] = await getDocumentRoute(doc)
  const step = doc.current_step ?? 0
  const stop = routeStopAt(route, step)
  const { data: office } = await lifecycleDb().from('offices').select('name').eq('id', officeId).maybeSingle()
  const headId = await getOfficeHeadId(officeId)

  return {
    client,
    actor,
    doc,
    route,
    step,
    officeId,
    officeName: office?.name ?? stop?.office_name ?? 'the office',
    headId,
    isHead: !!headId && headId === actor.userId,
    isHolder: !!doc.current_handler_id && String(doc.current_handler_id) === actor.userId,
  }
}
