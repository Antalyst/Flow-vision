/**
 * Zero-dependency Supabase REST + Realtime broadcast client for Nitro server routes.
 * Implements the PostgREST query-builder surface used across /server.
 */

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface SelectOptions {
  count?: 'exact'
  head?: boolean
}

interface OrderOptions {
  ascending?: boolean
}

interface SupabaseError {
  message: string
  code?: string
  details?: string
  hint?: string
}

type QueryResult<T = unknown> = Promise<{ data: T | null; error: SupabaseError | null; count?: number | null }>

function encodeFilterValue(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') return String(value)
  const str = String(value)
  if (/^[0-9a-f-]{36}$/i.test(str) || /^[A-Z0-9_]+$/.test(str)) return str
  return `"${str.replace(/"/g, '\\"')}"`
}

class PostgrestQueryBuilder implements PromiseLike<{ data: unknown; error: SupabaseError | null; count?: number | null }> {
  private method: HttpMethod = 'GET'
  private selectColumns = '*'
  private filters: string[] = []
  private orders: string[] = []
  private limitValue?: number
  private body?: unknown
  private wantSingle = false
  private wantMaybeSingle = false
  private countMode?: 'exact'
  private headOnly = false
  private returning = false

  constructor(
    private readonly baseUrl: string,
    private readonly table: string,
    private readonly headers: Record<string, string>,
  ) {}

  select(columns: string = '*', options?: SelectOptions): this {
    this.selectColumns = columns
    if (options?.count) this.countMode = options.count
    if (options?.head) this.headOnly = true
    return this
  }

  insert(payload: unknown): this {
    this.method = 'POST'
    this.body = payload
    return this
  }

  update(payload: Record<string, unknown>): this {
    this.method = 'PATCH'
    this.body = payload
    return this
  }

  delete(): this {
    this.method = 'DELETE'
    return this
  }

  eq(column: string, value: unknown): this {
    this.filters.push(`${column}=eq.${encodeFilterValue(value)}`)
    return this
  }

  neq(column: string, value: unknown): this {
    this.filters.push(`${column}=neq.${encodeFilterValue(value)}`)
    return this
  }

  in(column: string, values: unknown[]): this {
    const encoded = values.map(encodeFilterValue).join(',')
    this.filters.push(`${column}=in.(${encoded})`)
    return this
  }

  or(expression: string): this {
    this.filters.push(`or=(${expression})`)
    return this
  }

  is(column: string, value: unknown): this {
    this.filters.push(`${column}=is.${encodeFilterValue(value)}`)
    return this
  }

  ilike(column: string, pattern: string): this {
    this.filters.push(`${column}=ilike.${encodeFilterValue(pattern)}`)
    return this
  }

  order(column: string, options: OrderOptions = {}): this {
    this.orders.push(`${column}.${options.ascending === false ? 'desc' : 'asc'}`)
    return this
  }

  limit(count: number): this {
    this.limitValue = count
    return this
  }

  single(): QueryResult {
    this.wantSingle = true
    return this.execute()
  }

  maybeSingle(): QueryResult {
    this.wantMaybeSingle = true
    return this.execute()
  }

  then<TResult1 = { data: unknown; error: SupabaseError | null; count?: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: SupabaseError | null; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private markReturning(): void {
    this.returning = true
  }

  private buildUrl(): string {
    const params = new URLSearchParams()
    if (this.method === 'GET' || this.returning || this.method === 'PATCH' || this.method === 'DELETE') {
      params.set('select', this.selectColumns)
    }
    for (const filter of this.filters) {
      const idx = filter.indexOf('=')
      if (idx === -1) continue
      params.append(filter.slice(0, idx), filter.slice(idx + 1))
    }
    for (const order of this.orders) params.append('order', order)
    if (this.limitValue != null) params.set('limit', String(this.limitValue))
    const qs = params.toString()
    return `${this.baseUrl}/rest/v1/${this.table}${qs ? `?${qs}` : ''}`
  }

  private buildHeaders(): Record<string, string> {
    const reqHeaders: Record<string, string> = {
      ...this.headers,
      'Content-Type': 'application/json',
    }

    const prefer: string[] = []
    if (this.countMode) prefer.push(`count=${this.countMode}`)
    if (this.returning) prefer.push('return=representation')
    else if (this.method === 'POST' || this.method === 'PATCH') prefer.push('return=minimal')
    if (prefer.length) reqHeaders.Prefer = prefer.join(',')

    if (this.wantSingle || this.wantMaybeSingle) {
      reqHeaders.Accept = 'application/vnd.pgrst.object+json'
    }

    return reqHeaders
  }

  private async execute(): Promise<{ data: unknown; error: SupabaseError | null; count?: number | null }> {
    if (this.method === 'POST' && (this.wantSingle || this.wantMaybeSingle || this.selectColumns !== '*')) {
      this.markReturning()
    }
    if (this.method === 'PATCH' || this.method === 'DELETE') {
      if (this.selectColumns !== '*' || this.wantSingle || this.wantMaybeSingle) this.markReturning()
    }

    const url = this.buildUrl()
    const reqHeaders = this.buildHeaders()

    try {
      const response = await $fetch.raw<unknown>(url, {
        method: this.method,
        headers: reqHeaders,
        body: this.method === 'GET' ? undefined : this.body,
        ignoreResponseError: true,
      })

      const countHeader = response.headers.get('content-range')
      let count: number | null = null
      if (countHeader) {
        const match = countHeader.match(/\/(\d+)$/)
        if (match) count = Number(match[1])
      }

      if (response.status >= 400) {
        const errBody = (response._data ?? {}) as SupabaseError
        const error: SupabaseError = {
          message: errBody.message || `Request failed with status ${response.status}`,
          code: errBody.code,
          details: errBody.details,
          hint: errBody.hint,
        }

        if (this.wantMaybeSingle && (response.status === 406 || response.status === 404)) {
          return { data: null, error: null, count }
        }

        return { data: null, error, count }
      }

      if (this.headOnly) {
        return { data: null, error: null, count }
      }

      const data = response._data ?? null

      if (this.wantMaybeSingle && (data === null || (Array.isArray(data) && data.length === 0))) {
        return { data: null, error: null, count }
      }

      if (this.wantSingle && Array.isArray(data) && data.length === 0) {
        return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }, count }
      }

      if (!this.wantSingle && !this.wantMaybeSingle && data === null && (this.method === 'POST' || this.method === 'PATCH' || this.method === 'DELETE')) {
        return { data: null, error: null, count }
      }

      return { data, error: null, count }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown fetch error'
      return { data: null, error: { message } }
    }
  }
}

async function broadcastMessage(
  baseUrl: string,
  apiKey: string,
  channelName: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await $fetch(`${baseUrl}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      messages: [{ topic: channelName, event, payload }],
    },
  })
}

export type ServerSupabaseClient = ReturnType<typeof useServerSupabase>

export const useServerSupabase = () => {
  const config = useRuntimeConfig()
  const supabaseUrl = String(config.public.supabaseUrl || '').replace(/\/$/, '')
  const supabaseKey = String(config.supabaseServiceKey || '')

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  }

  return {
    from: (table: string) => new PostgrestQueryBuilder(supabaseUrl, table, headers),

    /** @deprecated Use broadcastMessage via documentIssues helper instead */
    channel: (channelName: string) => ({
      subscribe: async () => {},
      send: async (msg: { type: string; event: string; payload: Record<string, unknown> }) => {
        if (msg.type === 'broadcast') {
          await broadcastMessage(supabaseUrl, supabaseKey, channelName, msg.event, msg.payload)
        }
      },
    }),

    removeChannel: async () => {},

    broadcast: (channelName: string, event: string, payload: Record<string, unknown>) =>
      broadcastMessage(supabaseUrl, supabaseKey, channelName, event, payload),
  }
}
