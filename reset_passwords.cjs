const { createClient } = require('@supabase/supabase-js');
const { hash } = require('bcrypt-ts');
require('dotenv').config();

const client = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  try {
    const newPasswordHash = await hash("password", 10);
    console.log("Generated hash for 'password':", newPasswordHash);

    console.log("Updating Supabase users table...");
    const { data, error } = await client
      .from('users')
      .update({ password: newPasswordHash })
      .in('email', ['test@example.com', 'bagocity@example.com', 'accounting@example.com', 'budget@example.com']);
    
    if (error) {
      console.error("Supabase Update Error:", error);
    } else {
      console.log("Supabase passwords updated successfully.");
    }
  } catch (err) {
    console.error("Error running reset:", err);
  } finally {
    process.exit(0);
  }
}

run();
