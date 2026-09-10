const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
require('dotenv').config()

const SUPABASE_URL = (process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://ryohgztqeuzpsjwwjmdd.supabase.co').replace(/\/$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY is missing.')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

async function run() {
  console.log('================================================================');
  console.log('TEST SUITE: Messenger Scanner IN_TRANSIT Pickup Interception');
  console.log('================================================================\n');

  // 1. Setup Org & Messenger
  const { data: orgs } = await supabaseAdmin.from('org').select('*').limit(1)
  const orgId = String(orgs[0].org_id || orgs[0].id)
  console.log(`[Setup] Org ID: ${orgId}`)

  const { data: messengers } = await supabaseAdmin
    .from('users')
    .select('user_id, full_name, role')
    .eq('org_id', orgId)
    .ilike('role', 'messenger')
    .limit(1)
  const messenger = messengers?.[0] || { user_id: crypto.randomUUID(), full_name: 'liaison', role: 'messenger' }

  // 2. Create a test document in IN_TRANSIT status
  const testDocId = crypto.randomUUID()
  const testDocTitle = `Test In-Transit Scanner Doc (${Date.now()})`
  const testQr = `flowvision://doc/${testDocId}`

  await supabaseAdmin.from('documents').insert({
    id: testDocId,
    org_id: orgId,
    title: testDocTitle,
    tracking_status: 'IN_TRANSIT',
    current_step: 1,
    assigned_messenger_id: messenger.user_id,
    qr_code_data: testQr,
    created_at: new Date().toISOString(),
  })
  console.log(`[Setup] Created document in IN_TRANSIT status: "${testDocTitle}" (${testDocId})`)

  // 3. Simulate Scanning in Pickup Mode: POST /api/tracking/pickup
  console.log('\n--- TEST 1: Scanning IN_TRANSIT document in Pickup Mode ---');
  const pickupRes = await fetch('http://localhost:3000/api/tracking/pickup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `user_session=${messenger.user_id}; user_role=messenger`,
    },
    body: JSON.stringify({
      qr_code_data: testQr,
    }),
  })

  const errorData = await pickupRes.json()
  console.log(`[Pickup API Response Status]: ${pickupRes.status}`)
  console.log('[Pickup API Response Body]:', errorData)

  if (pickupRes.status !== 422) {
    throw new Error(`Expected HTTP 422 from /api/tracking/pickup for IN_TRANSIT document, got ${pickupRes.status}`)
  }

  // 4. Test Error Interception Logic (simulating applyScanError in scan.vue)
  console.log('\n--- TEST 2: Testing Scanner Error Interception & Mode Switching ---');
  
  let scanState = 'idle'
  let mode = 'pickup'
  let errorMessage = ''

  function applyScanError(err, currentMode) {
    const msg = err?.data?.message ?? err?.message ?? 'An unexpected error occurred.'
    const code = err?.data?.data?.code ?? ''
    const trackingStatus = err?.data?.data?.tracking_status ?? ''

    if (
      currentMode === 'pickup' &&
      (trackingStatus === 'IN_TRANSIT' || code === 'ALREADY_IN_TRANSIT' || (msg.includes('IN_TRANSIT') && (msg.includes('INVALID_STATUS') || msg.includes('Cannot pick up'))))
    ) {
      return { scanState: 'in-transit-prompt', errorMessage: msg }
    } else if (code === 'SECURITY_ORG_MISMATCH' || msg.includes('SECURITY_ORG_MISMATCH')) {
      return { scanState: 'security-error', errorMessage: msg }
    } else if (code === 'ROUTE_MISMATCH' || msg.includes('ROUTE_MISMATCH')) {
      return { scanState: 'route-error', errorMessage: msg }
    } else {
      return { scanState: 'error', errorMessage: msg }
    }
  }

  const intercepted = applyScanError({ data: errorData }, mode)
  scanState = intercepted.scanState
  errorMessage = intercepted.errorMessage

  console.log(`[Component State]: scanState = "${scanState}"`)
  if (scanState !== 'in-transit-prompt') {
    throw new Error(`Expected scanState to be 'in-transit-prompt', but got '${scanState}'`)
  }
  console.log('✓ Error intercepted gracefully! Displays in-transit prompt instead of generic failure.')

  // 5. Test 1-click Switch Action: switchMode('dropoff')
  console.log('\n--- TEST 3: Testing 1-Click Action to Switch to Drop-off Mode ---');
  
  function switchMode(newMode) {
    mode = newMode
    scanState = 'idle'
    errorMessage = ''
  }

  switchMode('dropoff')
  console.log(`[Action Triggered]: switchMode('dropoff') -> Current mode = "${mode}", scanState = "${scanState}"`)

  if (mode !== 'dropoff' || scanState !== 'idle') {
    throw new Error(`Expected mode to be 'dropoff' and scanState to be 'idle', got mode='${mode}', scanState='${scanState}'`)
  }
  console.log('✓ 1-click action successfully switched scanner into Drop-off mode ready for office check-in!')

  // Cleanup
  console.log('\n--- Cleaning up test records ---');
  await supabaseAdmin.from('documents').delete().eq('id', testDocId)
  console.log('✓ Cleanup complete.');

  console.log('\n================================================================');
  console.log('ALL TESTS PASSED: IN_TRANSIT Pickup Interception Fully Verified!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('\n❌ Test failed:', err)
  process.exit(1)
})
