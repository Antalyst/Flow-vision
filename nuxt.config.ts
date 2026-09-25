// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  ssr: true,

  devServer: {
    host: 'localhost',
  },

  vite: {
    server: {
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 3000,
        clientPort: 3000,
      },
    },
  },

  runtimeConfig: {
    mysqlHost: process.env.MYSQL_HOST,
    mysqlUser: process.env.MYSQL_USER,
    mysqlPassword: process.env.MYSQL_PASSWORD,
    mysqlDatabase: process.env.MYSQL_DATABASE,
    supabaseSecretKey: process.env.NUXT_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY,
    supabaseServiceKey: process.env.NUXT_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY,
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      // Publishable/anon key — safe for the browser by design. Used by the custom
      // lightweight Realtime WebSocket client in useSupabaseClient.ts (NOT the
      // @nuxtjs/supabase module, which reads NUXT_PUBLIC_SUPABASE_KEY directly from
      // process.env on its own and was never affected by this gap).
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_KEY,
    }
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxtjs/supabase'
  ],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
  supabase: {
    types: '~/types/database.types.ts',
    redirect: false,
    redirectOptions: {
      login: '/',
      callback: '/',
      exclude: ['/*']
    }
  }
})