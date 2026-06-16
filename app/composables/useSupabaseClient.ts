import { createClient } from '@supabase/supabase-js'

let browserClient: ReturnType<typeof createClient> | null = null

/** Browser Supabase client for Realtime (replaces @nuxtjs/supabase composable). */
export function useSupabaseClient() {
  if (import.meta.server) {
    throw new Error('useSupabaseClient() is for client-side use only')
  }

  if (!browserClient) {
    const config = useRuntimeConfig()
    browserClient = createClient(
      config.public.supabaseUrl as string,
      config.public.supabaseAnonKey as string,
    )
  }

  return browserClient
}
