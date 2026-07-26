import fetch from 'node-fetch';

async function testApi() {
  const res = await fetch('http://localhost:3000/api/org/getorg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: "0e09d826-aad3-4cc1-a35b-2dc513247a74", 
      org_id: "05f7b4b3-07d6-47ac-993c-b90cb72974a0" 
    })
  });
  
  const data = await res.text();
  console.log("Status:", res.status);
  console.log("Data:", data);
}

testApi();
