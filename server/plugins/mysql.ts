import mysql from 'mysql2/promise';

declare module 'nitropack' {
  interface NitroApp {
    db: mysql.Pool;
  }
}

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig();

  try {
    const pool = mysql.createPool({
      host: config.mysqlHost,
      user: config.mysqlUser,
      password: config.mysqlPassword,
      database: config.mysqlDatabase,
      waitForConnections: true,
      connectionLimit: 10,
    });

    // Expose pool globally on NitroApp so it's accessible by background/stateful processes
    nitroApp.db = pool;

    nitroApp.hooks.hook('request', (event) => {
      event.context.db = pool;
    });
  } catch (e) {
    console.error("Failed to initialize database pool:", e);
  }
});