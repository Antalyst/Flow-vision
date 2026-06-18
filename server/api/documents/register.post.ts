/**
 * POST /api/documents/register
 *
 * Metadata-only hard-copy registration — no file uploads or blob storage.
 * Inserts into documents (org-scoped), maps QR payload, notifies messengers.
 */

import { registerMetadataDocument, type RegisterDocumentBody } from '~~/server/utils/documentRegistration'

export default defineEventHandler(async (event) => {
  const body = await readBody<RegisterDocumentBody>(event)
  return registerMetadataDocument(event, body)
})
