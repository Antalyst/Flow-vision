import { randomUUID } from 'node:crypto'

/** Deep-link payload written to documents.qr_code_data after registration. */
export function buildDocumentTrackQrPayload(documentId: string): string {
  return `flowvision://track/doc?id=${documentId}`
}

type SupabaseReader = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        maybeSingle: () => Promise<{ data: { id?: string } | null, error: { message: string } | null }>
      }
    }
  }
}

async function isQrCodeAvailable(client: SupabaseReader, code: string): Promise<boolean> {
  const { data, error } = await client
    .from('documents')
    .select('id')
    .eq('qr_code_data', code)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, message: `QR code lookup failed: ${error.message}` })
  }

  return !data
}

/**
 * Resolves a globally unique documents.qr_code_data value.
 * Client-supplied codes (printed labels) must be unique or we return 409.
 * Server-generated codes retry until unique.
 */
export async function resolveUniqueQrCode(
  client: SupabaseReader,
  preferred: string | null | undefined,
): Promise<string> {
  const trimmed = preferred?.trim()

  if (trimmed) {
    const available = await isQrCodeAvailable(client, trimmed)
    if (!available) {
      throw createError({
        statusCode: 409,
        message:
          'This tracking QR code is already registered to another document. ' +
          'Generate a new label in the upload dialog, print it, then submit again.',
        data: { code: 'DUPLICATE_QR_CODE', qr_code_data: trimmed },
      })
    }
    return trimmed
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `FLOW-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`
    if (await isQrCodeAvailable(client, code)) {
      return code
    }
  }

  throw createError({
    statusCode: 500,
    message: 'Could not allocate a unique tracking QR code. Please try again.',
  })
}
