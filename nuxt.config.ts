// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  ssr: true,
  nitro: {
    // Inline server-only packages so Vercel lambdas bundle them instead of
    // resolving from node_modules at runtime (avoids ERR_MODULE_NOT_FOUND).
    externals: {
      inline: ['unpdf', '@supabase/supabase-js'],
      traceInclude: ['unpdf', 'mammoth', '@supabase/supabase-js'],
    },
  },
  runtimeConfig: {
    mysqlHost: process.env.MYSQL_HOST,
    mysqlUser: process.env.MYSQL_USER,
    mysqlPassword: process.env.MYSQL_PASSWORD,
    mysqlDatabase: process.env.MYSQL_DATABASE,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
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
    redirect: false,
    redirectOptions: {
      login: '/',
      callback: '/',
      exclude: ['/*']
    }
  }
})
