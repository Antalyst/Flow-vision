import mysql from 'mysql2/promise';

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig();

  try {
    const pool = mysql.createPool({
      host: config.mysqlHost,
      user: config.mysqlUser, 
      password: config.mysqlPassword,
      database: config.mysqlDatabase,

    });

    nitroApp.hooks.hook('request', (event) => {
      event.context.db = pool;
    });
  } catch (e) {
    console.error("Failed to initialize database pool:", e);
  }
});