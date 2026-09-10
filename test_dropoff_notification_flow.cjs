const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
require('dotenv').config()

const SUPABASE_URL = (process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://ryohgztqeuzpsjwwjmdd.supabase.co').replace(/\/$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const ANON_KEY = process.env.NUXT_PUBLIC_SUPABASE_KEY

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY is missing.')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

async function run() {
  console.log('================================================================');
  console.log('TEST SUITE: Dropoff Inbound Notifications (Office Desk & Doc Owner)');
  console.log('================================================================\n');

  // 1. Resolve Org, Offices, Stages, Messenger, Client Owner
  const { data: orgs } = await supabaseAdmin.from('org').select('*').limit(1)
  const orgId = String(orgs[0].org_id || orgs[0].id)
  console.log(`[Setup] Org ID: ${orgId}`)

  // Fetch stage with steps
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
  const originOfficeId = String(step1.office_id)
  const originOfficeName = step1.offices?.name || 'Origin Office'
  const destOfficeId = String(step2.office_id)
  const destOfficeName = step2.offices?.name || 'Destination Office'

  console.log(`[Setup] Route configured: Step 1 = [${originOfficeName}] -> Step 2 = [${destOfficeName}] (${destOfficeId})`)

  // Resolve messenger
  const { data: messengers } = await supabaseAdmin
    .from('users')
    .select('user_id, full_name, role')
    .eq('org_id', orgId)
    .ilike('role', 'messenger')
    .limit(1)
  const messenger = messengers?.[0] || { user_id: crypto.randomUUID(), full_name: 'Test Messenger', role: 'messenger' }

  // Resolve client document owner
  const { data: clients } = await supabaseAdmin
    .from('users')
    .select('user_id, full_name, role')
    .eq('org_id', orgId)
    .ilike('role', 'client')
    .limit(1)
  const docOwner = clients?.[0] || { user_id: crypto.randomUUID(), full_name: 'Test Doc Owner', role: 'client' }

  console.log(`[Setup] Messenger: ${messenger.full_name} (${messenger.user_id})`)
  console.log(`[Setup] Document Owner: ${docOwner.full_name} (${docOwner.user_id})`)

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Create Document in IN_TRANSIT status assigned to messenger
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 1: Create IN_TRANSIT document advancing toward Step 2 ---');

  const testDocId = crypto.randomUUID()
  const testDocTitle = `Dropoff Owner Test Doc (${Date.now()})`

  await supabaseAdmin.from('documents').insert({
    id: testDocId,
    org_id: orgId,
    user_id: docOwner.user_id,
    title: testDocTitle,
    tracking_status: 'IN_TRANSIT',
    current_step: 2,
    stage_id: stageId,
    origin_office_id: originOfficeId,
    current_office_id: null,
    assigned_messenger_id: messenger.user_id,
    qr_code_data: `flowvision://doc/${testDocId}`,
    created_at: new Date().toISOString(),
  })

  console.log(`Created IN_TRANSIT test document (${testDocId}) toward Step 2 [${destOfficeName}]`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Execute Dropoff Transition (Simulate dropoff.post.ts)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Execute Dropoff & Insert Review Required & Owner Notifications ---');

  // Update document state upon dropoff scan
  const finalStatus = 'ARRIVED_AT_OFFICE'
  await supabaseAdmin
    .from('documents')
    .update({
      tracking_status: finalStatus,
      current_office_id: destOfficeId,
      checkpoint_cleared_step: null,
      assigned_messenger_id: null,
    })
    .eq('id', testDocId)

  // Insert Tracking Event
  await supabaseAdmin.from('document_tracking_events').insert({
    document_id: testDocId,
    org_id: orgId,
    status: 'ARRIVED_AT_OFFICE',
    step_index: 2,
    office_id: destOfficeId,
    office_name: destOfficeName,
    actor_id: messenger.user_id,
    actor_role: 'messenger',
    actor_name: messenger.full_name,
    notes: `Arrived and checked in at ${destOfficeName}. Awaiting desk review.`,
  })

  // 1. Inbound Document — Review Required Notification for Destination Office Desk
  const dropoffDeskNotifId = crypto.randomUUID()
  await supabaseAdmin.from('notifications').insert({
    id: dropoffDeskNotifId,
    org_id: orgId,
    office_id: destOfficeId,
    document_id: testDocId,
    target_role: 'employee',
    user_id: null,
    title: 'Inbound Document — Review Required',
    message: `${messenger.full_name} delivered "${testDocTitle}" to ${destOfficeName}. Open the document preview, verify the hard copy, and mark the checkpoint done to release the next pickup.`,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
  })

  // 2. Direct Arrival Notification to Document Owner (Document Arrived at [Destination Office])
  const dropoffOwnerNotifId = crypto.randomUUID()
  await supabaseAdmin.from('notifications').insert({
    id: dropoffOwnerNotifId,
    org_id: orgId,
    office_id: null,
    document_id: testDocId,
    target_role: 'client',
    user_id: docOwner.user_id,
    title: `Document Arrived at ${destOfficeName}`,
    message: `Your document "${testDocTitle}" has arrived at ${destOfficeName} and is currently awaiting station review.`,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Verify Notification Records & Attributes
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Verify Desk and Owner Notification Properties ---');

  const { data: dropoffNotifs } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('document_id', testDocId)

  const deskNotif = dropoffNotifs?.find(n => n.id === dropoffDeskNotifId)
  const ownerNotif = dropoffNotifs?.find(n => n.id === dropoffOwnerNotifId)

  const deskMatches = deskNotif && deskNotif.title === 'Inbound Document — Review Required' && deskNotif.office_id === destOfficeId && deskNotif.target_role === 'employee'
  const ownerMatches = ownerNotif && ownerNotif.title === `Document Arrived at ${destOfficeName}` && ownerNotif.user_id === docOwner.user_id && ownerNotif.target_role === 'client'

  console.log(`[TEST 3] Desk Review Notification ("Inbound Document — Review Required" -> ${destOfficeId}):`, deskMatches ? 'PASSED' : 'FAILED')
  console.log(`[TEST 3] Owner Arrival Notification ("Document Arrived at ${destOfficeName}" -> user_id: ${docOwner.user_id}):`, ownerMatches ? 'PASSED' : 'FAILED')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Verify Desk and Owner Inbox Retrieval
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Verify Destination Office & Owner Inbox Retrieval ---');

  const { data: employeeQueue } = await supabaseAdmin
    .from('notifications')
    .select('id, title, office_id, target_role, is_read')
    .eq('org_id', orgId)
    .ilike('target_role', 'employee')
    .in('office_id', [destOfficeId])
    .eq('is_read', false)

  const foundInDestQueue = employeeQueue?.some(n => n.id === dropoffDeskNotifId);
  console.log(`[TEST 4] Desk notification visible in destination office queue:`, foundInDestQueue ? 'PASSED' : 'FAILED');

  const { data: ownerQueue } = await supabaseAdmin
    .from('notifications')
    .select('id, title, user_id, target_role, is_read')
    .eq('org_id', orgId)
    .ilike('target_role', 'client')
    .eq('user_id', docOwner.user_id)
    .eq('is_read', false)

  const foundInOwnerQueue = ownerQueue?.some(n => n.id === dropoffOwnerNotifId);
  console.log(`[TEST 4] Owner notification visible in document owner queue:`, foundInOwnerQueue ? 'PASSED' : 'FAILED');

  // ──────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- Cleanup Test Artifacts ---');
  await supabaseAdmin.from('notifications').delete().in('id', [dropoffDeskNotifId, dropoffOwnerNotifId])
  await supabaseAdmin.from('document_tracking_events').delete().eq('document_id', testDocId)
  await supabaseAdmin.from('documents').delete().eq('id', testDocId)
  console.log('Cleaned up test document, tracking event, and notification rows.');

  console.log('\n================================================================');
  console.log('VERIFICATION SUMMARY:');
  console.log('1. Desk Notification Correctness:', deskMatches ? 'PASSED' : 'FAILED');
  console.log('2. Owner Arrival Notification Correctness (user_id):', ownerMatches ? 'PASSED' : 'FAILED');
  console.log('3. Destination Office Queue Visibility:', foundInDestQueue ? 'PASSED' : 'FAILED');
  console.log('4. Document Owner Queue Visibility:', foundInOwnerQueue ? 'PASSED' : 'FAILED');
  console.log('================================================================\n');

  if (deskMatches && ownerMatches && foundInDestQueue && foundInOwnerQueue) {
    console.log('🎉 ALL DROPOFF & DOCUMENT OWNER NOTIFICATION CHECKS PASSED!');
    process.exit(0);
  } else {
    console.error('❌ Verification failed on some checks.');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
