export type FlowVisionQrPayload =
  | { type: 'document'; qr: string }
  | { type: 'office'; id: string }
  | { type: 'unknown' }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Canonical document deep link — must match `buildDocumentTrackQrPayload` on the server. */
export function buildDocumentTrackQrPayload(documentId: string): string {
  return `flowvision://track/doc?id=${documentId}`
}

/**
 * Classifies a raw QR decode string into a FlowVision document or office checkpoint payload.
 */
export function parseFlowVisionQr(raw: string): FlowVisionQrPayload {
  const trimmed = raw.trim()

  // Document deep link: flowvision://track/doc?id={uuid}
  if (/^flowvision:\/\/track\/doc\b/i.test(trimmed)) {
    try {
      const url = new URL(trimmed.replace(/^flowvision:\/\//i, 'https://flowvision.local/'))
      const documentId = url.searchParams.get('id')?.trim()
      if (documentId && UUID_RE.test(documentId)) {
        return { type: 'document', qr: buildDocumentTrackQrPayload(documentId) }
      }
    } catch {
      // fall through to unknown
    }
  }

  // Office checkpoint: flowvision://office/{uuid}
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
