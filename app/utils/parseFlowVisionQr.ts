export type FlowVisionQrPayload =
  | { type: 'document'; qr: string }
  | { type: 'office'; id: string }
  | { type: 'checkpoint'; office_id: string }
  | { type: 'unknown' }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Canonical document deep link — must match `buildDocumentTrackQrPayload` on the server. */
export function buildDocumentTrackQrPayload(documentId: string): string {
  return `flowvision://track/doc?id=${documentId}`
}

/** Extract office UUID from `flowvision://track/checkpoint?office_id={uuid}`. */
export function extractCheckpointOfficeId(raw: string): string | null {
  const trimmed = raw.trim()
  if (!/^flowvision:\/\/track\/checkpoint\b/i.test(trimmed)) return null
  try {
    const url = new URL(trimmed.replace(/^flowvision:\/\//i, 'https://flowvision.local/'))
    const officeId = url.searchParams.get('office_id')?.trim()
    return officeId && UUID_RE.test(officeId) ? officeId : null
  } catch {
    return null
  }
}

/** Extract document UUID from `flowvision://track/doc?id={uuid}`. */
export function extractDocumentTrackId(raw: string): string | null {
  const trimmed = raw.trim()
  if (!/^flowvision:\/\/track\/doc\b/i.test(trimmed)) return null
  try {
    const url = new URL(trimmed.replace(/^flowvision:\/\//i, 'https://flowvision.local/'))
    const documentId = url.searchParams.get('id')?.trim()
    return documentId && UUID_RE.test(documentId) ? documentId : null
  } catch {
    return null
  }
}

/**
 * Classifies a raw QR decode string into a FlowVision document or office checkpoint payload.
 */
export function parseFlowVisionQr(raw: string): FlowVisionQrPayload {
  const trimmed = raw.trim()

  const documentId = extractDocumentTrackId(trimmed)
  if (documentId) {
    return { type: 'document', qr: buildDocumentTrackQrPayload(documentId) }
  }

  const checkpointOfficeId = extractCheckpointOfficeId(trimmed)
  if (checkpointOfficeId) {
    return { type: 'checkpoint', office_id: checkpointOfficeId }
  }

  // Office checkpoint (drop-off): flowvision://office/{uuid}
  const officeMatch = trimmed.match(/^flowvision:\/\/office\/([0-9a-f-]{36})$/i)
  if (officeMatch?.[1] && UUID_RE.test(officeMatch[1])) {
    return { type: 'office', id: officeMatch[1] }
  }

  // Legacy FLOW- tracking labels (pre deep-link uploads)
  if (/^FLOW-[A-Z0-9]+$/i.test(trimmed)) {
    return { type: 'document', qr: trimmed }
  }

  // Legacy QR- prefix
  if (trimmed.startsWith('QR-')) {
    return { type: 'document', qr: trimmed }
  }

  // Legacy alphanumeric codes without hyphens
  if (/^[A-Z0-9]{6,}$/i.test(trimmed)) {
    return { type: 'document', qr: trimmed }
  }

  return { type: 'unknown' }
}
