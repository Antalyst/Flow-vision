import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export const useMySQL = () => {
  const config = useRuntimeConfig()

  if (!config.mysqlHost || !config.mysqlUser) {
    console.error('CRITICAL: MySQL environment variables are missing inside the runtime config!')
    return null
  }

  if (!pool) {
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
