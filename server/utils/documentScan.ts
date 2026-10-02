/**
 * Reads `{ qr_code_data | document_id }` from a scan request. The QR may be the
 * raw `flowvision://track/doc?id=<uuid>` payload or just the document UUID.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseDocumentScanBody(body: any): { qrCodeData: string | null; documentId: string | null } {
  const rawQr = typeof body?.qr_code_data === 'string' ? body.qr_code_data.trim() : ''
  const rawId = typeof body?.document_id === 'string' ? body.document_id.trim() : ''

  if (rawId) {
    if (!UUID_RE.test(rawId)) throw createError({ statusCode: 400, message: 'Invalid document id.' })
    return { qrCodeData: null, documentId: rawId }
  }
  if (!rawQr) throw createError({ statusCode: 400, message: 'Please scan a document QR code.' })

  const match = rawQr.match(/^flowvision:\/\/track\/doc\?id=([0-9a-f-]{36})$/i)
  if (match && UUID_RE.test(match[1]!)) return { qrCodeData: rawQr, documentId: match[1]! }
  if (UUID_RE.test(rawQr)) return { qrCodeData: null, documentId: rawQr }
  return { qrCodeData: rawQr, documentId: null }
}
