const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const client = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  try {
    console.log("Checking conversations table...");
    const { data: convData, error: convErr } = await client.from('conversations').select('*').limit(1);
    if (convErr) {
      console.error("Conversations Error:", convErr);
    } else {
      console.log("Conversations sample/columns:", JSON.stringify(convData, null, 2));
    }

    console.log("Checking conversation_participants table...");
    const { data: partData, error: partErr } = await client.from('conversation_participants').select('*').limit(1);
    if (partErr) {
      console.error("Participants Error:", partErr);
    } else {
      console.log("Participants sample/columns:", JSON.stringify(partData, null, 2));
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  } finally {
    process.exit(0);
  }
}

run();
