/**
 * GET /api/documents/:id/blob
 *
 * Streams the MySQL file BLOB linked to a Supabase document row.
 * org_id is resolved from session — never from the request.
 */

import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

interface StorageRow {
  file_blob: Buffer
  file_name: string
  mime_type: string | null
  document_uuid: string | null
}

function employeeCanAccessDocument(
  doc: {
    user_id?: string | null
    origin_office_id?: string | null
    current_office_id?: string | null
    office_id?: string | null
  },
  actor: { userId: string; userRole: string; officeIds: string[] },
): boolean {
  if (actor.userRole !== 'employee') return true
  if (String(doc.user_id) === String(actor.userId)) return true
  if (actor.officeIds.length === 0) return String(doc.user_id) === String(actor.userId)

  const officeList = new Set(actor.officeIds.map(String))
  const candidates = [doc.origin_office_id, doc.current_office_id, doc.office_id]
    .filter(Boolean)
    .map(String)

  return candidates.some((id) => officeList.has(id))
}

export default defineEventHandler(async (event) => {
  const documentId = getRouterParam(event, 'id')
  if (!documentId) {
    throw createError({ statusCode: 400, message: 'Document id is required.' })
  }

  const db = event.context.db
  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'MySQL storage connector is not available.',
    })
  }

  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (actor.userRole === 'messenger') {
    throw createError({
      statusCode: 403,
      message: 'Messengers cannot access document file blobs through this endpoint.',
    })
  }

  const { data: doc, error: docErr } = await client
    .from('documents')
    .select('id, org_id, mysql_storage_id, user_id, origin_office_id, current_office_id, office_id')
    .eq('id', documentId)
    .eq('org_id', actor.orgId)
    .maybeSingle()

  if (docErr) {
    throw createError({ statusCode: 500, message: docErr.message })
  }
  if (!doc) {
    throw createError({ statusCode: 404, message: 'Document not found.' })
  }

  if (!employeeCanAccessDocument(doc, actor)) {
    throw createError({
      statusCode: 403,
      message: 'You do not have access to this document file.',
    })
  }

  const storageId = (doc as { mysql_storage_id?: number | null }).mysql_storage_id
  if (storageId == null) {
    throw createError({
      statusCode: 404,
      message: 'NO_BLOB: This document has no linked file in storage.',
      data: { code: 'NO_BLOB' },
    })
  }

  const [rows] = await db.execute(
    'SELECT file_blob, file_name, mime_type, document_uuid FROM document_storage WHERE id = ?',
    [storageId],
  )

  const storageRow = (rows as StorageRow[])[0]
  if (!storageRow?.file_blob) {
    throw createError({
      statusCode: 404,
      message: 'File blob not found in storage.',
    })
  }

  if (storageRow.document_uuid && String(storageRow.document_uuid) !== String(documentId)) {
    throw createError({
      statusCode: 403,
      message: 'Storage record does not match the requested document.',
    })
  }

  const fileName = storageRow.file_name || 'document'
  const mimeType = storageRow.mime_type || 'application/octet-stream'

  setHeader(event, 'Content-Type', mimeType)
  setHeader(event, 'X-File-Name', encodeURIComponent(fileName))
  setHeader(event, 'Content-Disposition', `inline; filename="${fileName.replace(/"/g, '')}"`)
  setHeader(event, 'Cache-Control', 'private, no-store')

  return storageRow.file_blob
})
