/**
 * Minimal client-side Supabase Realtime (broadcast only) via native WebSocket.
 * Zero @supabase/* dependencies — used by issue chat live updates.
 */

type BroadcastHandler = (payload: { payload?: unknown }) => void

interface ChannelListener {
  event: string
  handler: BroadcastHandler
}

class RealtimeChannel {
  private listeners: ChannelListener[] = []
  private joined = false

  constructor(
    private readonly topic: string,
    private readonly socket: RealtimeSocket,
  ) {}

  on(type: 'broadcast', filter: { event: string }, handler: BroadcastHandler): this {
    if (type === 'broadcast') {
      this.listeners.push({ event: filter.event, handler })
    }
    return this
  }

  subscribe(): this {
    this.socket.joinChannel(this)
    return this
  }

  getTopic(): string {
    return this.topic
  }

  getListeners(): ChannelListener[] {
    return this.listeners
  }

  markJoined(): void {
    this.joined = true
  }

  isJoined(): boolean {
    return this.joined
  }

  handleBroadcast(event: string, payload: unknown): void {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        listener.handler({ payload })
      }
    }
  }
}

class RealtimeSocket {
  private ws: WebSocket | null = null
  private channels = new Map<string, RealtimeChannel>()
  private refCounter = 0
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private connecting: Promise<void> | null = null

  constructor(
    private readonly url: string,
    private readonly apiKey: string,
  ) {}

  channel(name: string): RealtimeChannel {
    const existing = this.channels.get(name)
    if (existing) return existing
    const channel = new RealtimeChannel(name, this)
    this.channels.set(name, channel)
    return channel
  }

  async removeChannel(channel: RealtimeChannel): Promise<void> {
    const topic = channel.getTopic()
    this.channels.delete(topic)
    if (this.ws?.readyState === WebSocket.OPEN) {
      const ref = this.nextRef()
      this.ws.send(JSON.stringify([ref, ref, `realtime:${topic}`, 'phx_leave', {}]))
    }
    if (this.channels.size === 0) {
      this.disconnect()
    }
  }

  joinChannel(channel: RealtimeChannel): void {
    void this.ensureConnected().then(() => {
      const topic = channel.getTopic()
      if (channel.isJoined()) return
      const ref = this.nextRef()
      this.ws?.send(JSON.stringify([
        ref,
        ref,
        `realtime:${topic}`,
        'phx_join',
        {
          config: { broadcast: { self: false }, presence: { key: '' } },
          access_token: this.apiKey,
        },
      ]))
      channel.markJoined()
    })
  }

  private nextRef(): string {
    this.refCounter += 1
    return String(this.refCounter)
  }

  private async ensureConnected(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return
    if (this.connecting) return this.connecting

    this.connecting = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${this.url}?apikey=${encodeURIComponent(this.apiKey)}&vsn=1.0.0`)
      this.ws = ws

      ws.onopen = () => {
        this.heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify([null, null, 'phoenix', 'heartbeat', {}]))
          }
        }, 25_000)
        resolve()
      }

      ws.onerror = () => reject(new Error('Realtime WebSocket connection failed'))
      ws.onclose = () => {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
        this.ws = null
        this.connecting = null
        for (const ch of this.channels.values()) {
          (ch as { joined: boolean }).joined = false
        }
      }

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(String(msg.data)) as unknown[]
          if (!Array.isArray(data) || data.length < 5) return
          const [, , topic, event, payload] = data
          if (event !== 'broadcast' || typeof topic !== 'string') return
          const channelName = topic.replace(/^realtime:/, '')
          const channel = this.channels.get(channelName)
          if (!channel) return
          const body = payload as { event?: string; payload?: unknown }
          if (body?.event) channel.handleBroadcast(body.event, body.payload)
        } catch {
          // ignore malformed frames
        }
      }
    })

    return this.connecting
  }

  private disconnect(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.ws?.close()
    this.ws = null
    this.connecting = null
  }
}

let socketSingleton: RealtimeSocket | null = null

export const useSupabaseClient = () => {
  const config = useRuntimeConfig()
  const baseUrl = String(config.public.supabaseUrl || '').replace(/\/$/, '')
  const apiKey = String(config.public.supabaseAnonKey || '')

  const wsUrl = baseUrl.replace(/^http/, 'ws') + '/realtime/v1/websocket'

  if (!socketSingleton) {
    socketSingleton = new RealtimeSocket(wsUrl, apiKey)
  }

  return {
    channel: (name: string) => socketSingleton!.channel(name),
    removeChannel: (channel: RealtimeChannel) => socketSingleton!.removeChannel(channel),
  }
}

export type SupabaseRealtimeChannel = RealtimeChannel
