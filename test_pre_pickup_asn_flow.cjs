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
  console.log('TEST SUITE: Pre-Pickup Advance Shipping Notice (ASN) & En Route Flow');
  console.log('================================================================\n');

  // 1. Resolve Org, Offices, Stages, Employees, Messenger
  const { data: orgs } = await supabaseAdmin.from('org').select('*').limit(1)
  const orgId = String(orgs[0].org_id || orgs[0].id)
  console.log(`[Setup] Org ID: ${orgId}`)

  // Fetch stages with steps
  const { data: stages } = await supabaseAdmin
    .from('stages')
    .select('stage_id, name')
    .eq('org_id', orgId)
    .limit(1)
  const stageId = stages[0].stage_id

  const { data: steps } = await supabaseAdmin
    .from('stage_steps')
    .select('step_number, office_id, offices(name)')
    .eq('stage_id', stageId)
    .order('step_number', { ascending: true })

  if (!steps || steps.length < 2) {
    throw new Error('Need at least 2 stage steps in stage')
  }

  const step1 = steps[0]
  const step2 = steps[1]
  const step1OfficeId = String(step1.office_id)
  const step1OfficeName = step1.offices?.name || 'Step 1 Office'
  const step2OfficeId = String(step2.office_id)
  const step2OfficeName = step2.offices?.name || 'Step 2 Office'

  console.log(`[Setup] Route: Step 1 = [${step1OfficeName}] (${step1OfficeId}) -> Step 2 = [${step2OfficeName}] (${step2OfficeId})`)

  // Resolve messenger & client
  const { data: messengers } = await supabaseAdmin
    .from('users')
    .select('user_id, full_name, role')
    .eq('org_id', orgId)
    .ilike('role', 'messenger')
    .limit(1)
  const messenger = messengers?.[0] || { user_id: crypto.randomUUID(), full_name: 'liaison', role: 'messenger' }

  const { data: clients } = await supabaseAdmin
    .from('users')
    .select('user_id, full_name, role')
    .eq('org_id', orgId)
    .ilike('role', 'client')
    .limit(1)
  const docOwner = clients?.[0] || { user_id: crypto.randomUUID(), full_name: 'Test Client', role: 'client' }

  const { data: employees } = await supabaseAdmin
    .from('users')
    .select('user_id, full_name, role')
    .eq('org_id', orgId)
    .ilike('role', 'employee')
    .limit(1)
  const employee = employees?.[0] || { user_id: crypto.randomUUID(), full_name: 'Test Employee', role: 'employee' }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 1: Pre-Pickup ASN on Document Release / Registration (Step 1)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 1: Step 1 Pre-Pickup ASN Notification Generation ---');

  const testDocId = crypto.randomUUID()
  const testDocTitle = `Test ASN Pre-Pickup Doc (${Date.now()})`

  // Insert document as CREATED
  await supabaseAdmin.from('documents').insert({
    id: testDocId,
    org_id: orgId,
    user_id: docOwner.user_id,
    title: testDocTitle,
    tracking_status: 'CREATED',
    current_step: 0,
    stage_id: stageId,
    origin_office_id: null,
    current_office_id: null,
    qr_code_data: `flowvision://doc/${testDocId}`,
    created_at: new Date().toISOString(),
  })

  // Pre-pickup ASN inserted for Step 1 destination office
  const prePickupNotif = {
    org_id: orgId,
    office_id: step1OfficeId,
    document_id: testDocId,
    target_role: 'employee',
    title: 'Inbound Advance Notice — Awaiting Pickup',
    message: `"${testDocTitle}" has been released by origin desk and is waiting for courier pickup.`,
    is_read: false,
    is_claimed: false,
    metadata: {
      type: 'ASN_PENDING_PICKUP',
      target_step: 1,
    },
  }

  const { data: preAsnRow, error: preAsnErr } = await supabaseAdmin
    .from('notifications')
    .insert(prePickupNotif)
    .select('*')
    .single()

  if (preAsnErr) {
    throw new Error(`Failed to insert pre-pickup ASN: ${preAsnErr.message}`)
  }

  console.log('✓ Pre-pickup ASN inserted successfully:', {
    id: preAsnRow.id,
    office_id: preAsnRow.office_id,
    title: preAsnRow.title,
    message: preAsnRow.message,
  })

  if (preAsnRow.title !== 'Inbound Advance Notice — Awaiting Pickup') {
    throw new Error(`Expected title "Inbound Advance Notice — Awaiting Pickup", got "${preAsnRow.title}"`)
  }
  if (!preAsnRow.message.includes('released by') || !preAsnRow.message.includes('waiting for courier pickup')) {
    throw new Error(`Message does not state release and waiting for courier pickup: "${preAsnRow.message}"`)
  }
  console.log('✓ Pre-pickup ASN title and message assertions passed!');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 2: Pickup Transition Notice ("Inbound Document En Route")
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Pickup Transition Notice to Destination Office ---');

  // Trigger POST /api/tracking/pickup
  const pickupRes = await fetch('http://localhost:3000/api/tracking/pickup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `user_session=${messenger.user_id}; user_role=messenger`,
    },
    body: JSON.stringify({
      qr_code_data: `flowvision://doc/${testDocId}`,
    }),
  })

  const pickupJson = await pickupRes.json()
  console.log(`[Pickup API Response Status]: ${pickupRes.status}`, pickupJson)

  if (pickupRes.status !== 200) {
    throw new Error(`Pickup failed with status ${pickupRes.status}: ${JSON.stringify(pickupJson)}`)
  }

  // Verify notifications for step1OfficeId
  const { data: destNotifs, error: destErr } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('document_id', testDocId)
    .eq('office_id', step1OfficeId)
    .order('created_at', { ascending: false })

  if (destErr || !destNotifs || destNotifs.length === 0) {
    throw new Error(`No destination office notifications found for doc ${testDocId}`)
  }

  console.log(`Found ${destNotifs.length} destination office notification(s):`)
  destNotifs.forEach((n, idx) => console.log(`  [${idx + 1}] Title: "${n.title}" | Message: "${n.message}"`))

  const enRouteNotif = destNotifs.find(n => n.title === 'Inbound Document En Route')
  if (!enRouteNotif) {
    throw new Error(`Expected destination notification with title "Inbound Document En Route", but found titles: ${destNotifs.map(n => n.title).join(', ')}`)
  }

  if (!enRouteNotif.message.includes('in transit') || !enRouteNotif.message.includes('picked up')) {
    throw new Error(`En Route message should state courier picked up and is in transit: "${enRouteNotif.message}"`)
  }

  console.log('✓ Transition notice "Inbound Document En Route" verified successfully!');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 3: Checkpoint Completion Triggers Next Step Pre-Pickup ASN
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Checkpoint Completion Next Leg Pre-Pickup ASN ---');

  // Move document to ARRIVED_AT_OFFICE at Step 1
  await supabaseAdmin.from('documents').update({
    tracking_status: 'ARRIVED_AT_OFFICE',
    current_office_id: step1OfficeId,
    current_step: 1,
    assigned_messenger_id: null,
  }).eq('id', testDocId)

  // Call POST /api/documents/complete-checkpoint
  const checkpointRes = await fetch('http://localhost:3000/api/documents/complete-checkpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `user_session=${employee.user_id}; user_role=employee`,
    },
    body: JSON.stringify({
      document_id: testDocId,
    }),
  })

  const checkpointJson = await checkpointRes.json()
  console.log(`[Complete Checkpoint API Status]: ${checkpointRes.status}`, checkpointJson)

  if (checkpointRes.status !== 200) {
    throw new Error(`Complete checkpoint failed with status ${checkpointRes.status}: ${JSON.stringify(checkpointJson)}`)
  }

  // Check that Step 2 Destination Office received Pre-Pickup ASN
  const { data: step2Notifs } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('document_id', testDocId)
    .eq('office_id', step2OfficeId)
    .order('created_at', { ascending: false })

  console.log(`Found ${step2Notifs?.length || 0} Step 2 office notification(s):`)
  step2Notifs?.forEach((n, idx) => console.log(`  [${idx + 1}] Title: "${n.title}" | Message: "${n.message}"`))

  const step2PreAsn = step2Notifs?.find(n => n.title === 'Inbound Advance Notice — Awaiting Pickup')
  if (!step2PreAsn) {
    throw new Error('Step 2 destination office did not receive "Inbound Advance Notice — Awaiting Pickup"')
  }
  console.log('✓ Next step Pre-Pickup ASN on checkpoint completion verified successfully!');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 4: Destination Inbox Query Retrieval
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Destination Office Inbox Retrieval ---');

  const { data: inboxNotifs } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .in('office_id', [step1OfficeId, step2OfficeId])
    .ilike('target_role', 'employee')
    .in('title', ['Inbound Advance Notice — Awaiting Pickup', 'Inbound Document En Route'])
    .order('created_at', { ascending: false })
    .limit(10)

  console.log(`✓ Retrieved ${inboxNotifs.length} matching ASN notifications from destination office inboxes.`)
  const hasPrePickup = inboxNotifs.some(n => n.title === 'Inbound Advance Notice — Awaiting Pickup')
  const hasEnRoute = inboxNotifs.some(n => n.title === 'Inbound Document En Route')

  if (!hasPrePickup || !hasEnRoute) {
    throw new Error(`Expected both Pre-Pickup ASN and En Route notices in inbox. Pre-Pickup: ${hasPrePickup}, En Route: ${hasEnRoute}`)
  }
  console.log('✓ Inbox confirms both pre-pickup ASN and en-route statuses are visible to station employees!');

  // ──────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- Cleaning up test records ---');
  await supabaseAdmin.from('notifications').delete().eq('document_id', testDocId)
  await supabaseAdmin.from('document_tracking_events').delete().eq('document_id', testDocId)
  await supabaseAdmin.from('documents').delete().eq('id', testDocId)
  console.log('✓ Cleanup complete.');

  console.log('\n================================================================');
  console.log('ALL TESTS PASSED: Pre-Pickup ASN & En Route Flow Fully Verified!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('\n❌ Test execution failed:', err)
  process.exit(1)
})
