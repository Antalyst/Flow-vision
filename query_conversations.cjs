const fetch = require('node-fetch');
require('dotenv').config();

const CLIENT_SESSION_ID = '0e09d826-aad3-4cc1-a35b-2dc513247a74';

async function run() {
  try {
    const res = await fetch('http://localhost:3001/api/messages/conversations', {
      headers: {
        'Cookie': `user_session=${CLIENT_SESSION_ID}; user_role=client`
      }
    });

    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response JSON:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
