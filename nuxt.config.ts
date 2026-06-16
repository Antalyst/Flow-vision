// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  ssr: true,

  runtimeConfig: {
    mysqlHost: process.env.MYSQL_HOST,
    mysqlUser: process.env.MYSQL_USER,
    mysqlPassword: process.env.MYSQL_PASSWORD,
    mysqlDatabase: process.env.MYSQL_DATABASE,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_KEY,
    }
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@pinia/nuxt',
  ],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },

  nitro: {
    preset: 'vercel',
    externals: {
      inline: ['groq-sdk', 'unpdf'],
      traceInclude: [
        'mysql2',
        'mysql2/promise',
        'mysql2/**',
        'sql-escaper',
        'sql-escaper/**',
        'iconv-lite',
        'iconv-lite/**',
        'safer-buffer',
        'aws-ssl-profiles',
        'named-placeholders',
        'generate-function',
        'denque',
        'lru.min',
        'long',
        'is-property',
      ],
    },
  },
})
