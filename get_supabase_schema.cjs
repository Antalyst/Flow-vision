const fetch = require('node-fetch');
require('dotenv').config();

const url = process.env.NUXT_PUBLIC_SUPABASE_URL + '/rest/v1/';
const key = process.env.SUPABASE_SERVICE_KEY;

async function run() {
  try {
    console.log("Fetching Supabase OpenAPI schema for notifications...");
    const res = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const schema = await res.json();
    
    const tableInfo = schema.definitions.notifications;
    if (tableInfo) {
      console.log("Columns in notifications:");
      for (const colName of Object.keys(tableInfo.properties)) {
        const prop = tableInfo.properties[colName];
        console.log(`- ${colName}: type=${prop.type}, format=${prop.format || 'none'}`);
      }
    } else {
      console.log("Could not find definition for notifications in schema.");
    }
  } catch (err) {
    console.error("Schema fetch failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
