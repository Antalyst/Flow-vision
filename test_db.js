import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  try {
    const { data: users, error: userError } = await client.from('users').select('user_id, email, org_id, role, full_name');
    if (userError) console.error("User Error:", userError);
    console.log("USERS:", JSON.stringify(users, null, 2));
    
    const { data: orgs, error: orgError } = await client.from('org').select('*');
    if (orgError) console.error("Org Error:", orgError);
    console.log("ORGS:", JSON.stringify(orgs, null, 2));
  } catch (err) {
    console.error("Unexpected error:", err);
  } finally {
    process.exit(0);
  }
}

run();
