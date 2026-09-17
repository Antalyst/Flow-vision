import { onUnmounted, ref, watch, type Ref } from 'vue'

interface RealtimeMessagePayload {
  type?: string
  message?: unknown
  issue?: unknown
}

/**
 * Subscribe to Supabase Realtime broadcast events for an issue room.
 * Falls back silently if the client is unavailable.
 */
export function useIssueChatRealtime(
  orgId: Ref<string | null | undefined>,
  issueId: Ref<string | null | undefined>,
  onEvent: (event: string, payload: RealtimeMessagePayload) => void,
) {
  const supabase = useSupabaseClient()
  const channelRef = ref<ReturnType<typeof supabase.channel> | null>(null)

  const teardown = async () => {
    if (channelRef.value) {
      await supabase.removeChannel(channelRef.value)
      channelRef.value = null
    }
  }

  const subscribe = async () => {
    if (!import.meta.client) return
    await teardown()

    const oid = orgId.value
    const iid = issueId.value
    if (!oid || !iid) return

    const channelName = `org:${oid}:issue:${iid}`
    const channel = supabase.channel(channelName)

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        onEvent('new_message', payload as RealtimeMessagePayload)
      })
      .on('broadcast', { event: 'issue_created' }, ({ payload }) => {
        onEvent('issue_created', payload as RealtimeMessagePayload)
      })
      .on('broadcast', { event: 'issue_resolved' }, ({ payload }) => {
        onEvent('issue_resolved', payload as RealtimeMessagePayload)
      })
      .subscribe()

    channelRef.value = channel
  }

  if (import.meta.client) {
    watch([orgId, issueId], () => { subscribe() }, { immediate: true })
  }

  onUnmounted(() => { teardown() })

  return { resubscribe: subscribe }
}
