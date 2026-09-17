import { onUnmounted, ref, watch, toValue, type Ref, type MaybeRefOrGetter } from 'vue'
import { useSupabaseClient } from '~/composables/useSupabaseClient'
import { useEmployeeToast } from '~/composables/useEmployeeToast'
import { useEmployeeSettings } from '~/composables/useEmployeeSettings'

export interface InboundDispatchPayload {
  type: string
  event: string
  document_id: string
  document_title?: string
  batch_manifest_id?: string | null
  target_office_id?: string | number | null
  target_office_name?: string | null
  next_step?: number | null
  assigned_messenger_id?: string | null
  messenger_name?: string | null
  tracking_status?: string
  dispatched_at?: string
  notes?: string | null
}

/**
 * Normalizes any office ID input (Set, Array of strings/numbers, Array of objects with id/office_id, or single ID)
 * into a deduplicated list of clean string IDs.
 */
export function normalizeOfficeIds(raw: unknown): string[] {
  if (raw == null) return []

  const list: unknown[] = raw instanceof Set
    ? Array.from(raw)
    : Array.isArray(raw)
      ? raw
      : [raw]

  const normalized = new Set<string>()

  for (const item of list) {
    if (item == null) continue

    if (typeof item === 'object') {
      const obj = item as Record<string, any>
      const candidate = obj.id ?? obj.office_id ?? obj.value
      if (candidate != null) {
        const str = String(candidate).trim()
        if (str && str !== 'null' && str !== 'undefined') {
          normalized.add(str)
        }
      }
    } else {
      const str = String(item).trim()
      if (str && str !== 'null' && str !== 'undefined' && str !== 'NaN') {
        normalized.add(str)
      }
    }
  }

  return Array.from(normalized)
}

// Global short-term deduplication cache (5s window) across composable instances
const recentDispatchesDedup = new Map<string, number>()

/**
 * Realtime subscription for Advance Shipping Notices (ASN) and Inbound Dispatches.
 * Subscribes to:
 *   - org:<orgId>:office:<officeId> for each of the employee's assigned offices
 *   - org:<orgId>:logistics for general logistics broadcasts
 */
export function useInboundDispatchRealtime(
  orgId: MaybeRefOrGetter<string | number | null | undefined>,
  officeIds: MaybeRefOrGetter<unknown>,
  onDispatch?: (payload: InboundDispatchPayload) => void,
) {
  const supabase = useSupabaseClient()
  const { show: showToast } = useEmployeeToast()
  const { playHandoffAlertSound } = useEmployeeSettings()

  const channelsRef = ref<any[]>([])
  const latestDispatch = ref<InboundDispatchPayload | null>(null)
  const recentDispatches = ref<InboundDispatchPayload[]>([])
  const activeTopics = ref<string[]>([])

  const teardown = async () => {
    if (channelsRef.value.length > 0) {
      for (const ch of channelsRef.value) {
        try {
          await supabase.removeChannel(ch)
        } catch {
          // ignore
        }
      }
      channelsRef.value = []
      activeTopics.value = []
    }
  }

  const handleIncomingPayload = (payload: InboundDispatchPayload) => {
    if (!payload || !payload.document_id) return

    const dedupKey = `${payload.document_id}:${payload.dispatched_at || payload.type || ''}`
    const now = Date.now()
    const lastSeen = recentDispatchesDedup.get(dedupKey)

    // Deduplicate if received within 4 seconds (e.g. from multiple channel subscriptions)
    const isDuplicate = lastSeen && (now - lastSeen < 4000)
    recentDispatchesDedup.set(dedupKey, now)

    latestDispatch.value = payload
    recentDispatches.value = [payload, ...recentDispatches.value.filter(p => p.document_id !== payload.document_id).slice(0, 9)]

    if (!isDuplicate) {
      // Sound alert
      try {
        playHandoffAlertSound()
      } catch (err) {
        console.warn('[useInboundDispatchRealtime] Sound error:', err)
      }

      // Toast alert
      const docTitle = payload.document_title || 'Document'
      const courier = payload.messenger_name ? ` (Courier: ${payload.messenger_name})` : ''
      const dest = payload.target_office_name ? ` to ${payload.target_office_name}` : ''
      showToast(
        `🚚 Incoming Dispatch: "${docTitle}" is now in transit${dest}${courier}.`,
        'success',
        6000,
      )
    }

    if (onDispatch) {
      try {
        onDispatch(payload)
      } catch (err) {
        console.error('[useInboundDispatchRealtime] Callback error:', err)
      }
    }
  }

  const subscribe = async () => {
    if (!import.meta.client) return
    await teardown()

    const rawOrg = toValue(orgId)
    if (!rawOrg) return
    const oid = String(rawOrg).trim()
    if (!oid) return

    const rawOffices = toValue(officeIds)
    const normalizedIds = normalizeOfficeIds(rawOffices)

    const topics: string[] = [`org:${oid}:logistics`]
    for (const offId of normalizedIds) {
      topics.push(`org:${oid}:office:${offId}`)
    }

    const uniqueTopics = Array.from(new Set(topics))
    activeTopics.value = uniqueTopics

    const channels: any[] = []

    for (const topic of uniqueTopics) {
      const ch = supabase.channel(topic)
      ch.on('broadcast', { event: 'INCOMING_DISPATCH' }, ({ payload }) => {
        handleIncomingPayload(payload as InboundDispatchPayload)
      })
      ch.on('broadcast', { event: 'ASN_PROACTIVE_ALERT' }, ({ payload }) => {
        handleIncomingPayload(payload as InboundDispatchPayload)
      })
      ch.subscribe()
      channels.push(ch)
    }

    channelsRef.value = channels
    console.log(`[useInboundDispatchRealtime] Subscribed to ${uniqueTopics.length} channel(s):`, uniqueTopics.join(', '))
  }

  if (import.meta.client) {
    watch(
      () => [toValue(orgId), toValue(officeIds)],
      () => {
        subscribe()
      },
      { immediate: true, deep: true },
    )
  }

  onUnmounted(() => {
    teardown()
  })

  return {
    latestDispatch,
    recentDispatches,
    activeTopics,
    resubscribe: subscribe,
  }
}

