import type { SupabaseClient } from '@supabase/supabase-js'

/** Deep-link payload for a permanent office checkpoint QR (client dispatch desk). */
export function buildCheckpointQrPayload(officeId: string): string {
  return `flowvision://track/checkpoint?office_id=${officeId}`
}

export interface ClientStationOffice {
  id: string
  name: string
  code: string | null
  org_id: string
  is_client_station?: boolean
  created_at?: string
}

/**
 * Returns the org's permanent client dispatch station office, creating it if missing.
 */
export async function resolveOrCreateClientStation(
  client: SupabaseClient,
  orgId: string,
  clientUserId: string,
  orgName?: string | null,
): Promise<ClientStationOffice> {
  const { data: existing, error: existingErr } = await client
    .from('offices')
    .select('id, name, code, org_id, is_client_station, created_at')
    .eq('org_id', orgId)
    .eq('is_client_station', true)
    .maybeSingle()

  if (existingErr) {
    throw createError({ statusCode: 500, message: existingErr.message })
  }
  if (existing) return existing

  const stationName = orgName?.trim()
    ? `${orgName.trim()} Dispatch Station`
    : 'Client Dispatch Station'

  const code = `STN-${orgId.replace(/-/g, '').slice(0, 8).toUpperCase()}`

  const { data: created, error: createErr } = await client
    .from('offices')
    .insert({
      name: stationName,
      code,
      org_id: orgId,
      assigned_user: clientUserId,
      created_by: clientUserId,
      stage_id: null,
      is_client_station: true,
    })
    .select('id, name, code, org_id, is_client_station, created_at')
    .single()

  if (createErr || !created) {
    throw createError({
      statusCode: 500,
      message: createErr?.message ?? 'Failed to provision client dispatch station.',
    })
  }

  return created
}
