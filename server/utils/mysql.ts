import type { Pool } from 'mysql2/promise'

let pool: Pool | null = null
let mysqlModule: typeof import('mysql2/promise') | null = null

async function loadMysql() {
  if (!mysqlModule) {
    mysqlModule = await import('mysql2/promise')
  }
  return mysqlModule
}

export const useMySQL = async (): Promise<Pool | null> => {
  const config = useRuntimeConfig()

  if (!config.mysqlHost || !config.mysqlUser) {
    console.error('CRITICAL: MySQL environment variables are missing inside the runtime config!')
    return null
  }

  if (!pool) {
    const mysql = await loadMysql()
    pool = mysql.createPool({
      host: config.mysqlHost,
      user: config.mysqlUser,
      password: config.mysqlPassword,
      database: config.mysqlDatabase,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    })
  }

  return pool
}
