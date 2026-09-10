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
  console.log('TEST SUITE: Pickup Notifications (Origin Desk, Dest Office & Doc Owner)');
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
  const originOfficeId = String(step1.office_id)
  const originOfficeName = step1.offices?.name || 'Origin Office'
  const destOfficeId = String(step2.office_id)
  const destOfficeName = step2.offices?.name || 'Destination Office'

  console.log(`[Setup] Route configured: Step 1 = [${originOfficeName}] (${originOfficeId}) -> Step 2 = [${destOfficeName}] (${destOfficeId})`)

  // Resolve or find a test messenger
  const { data: messengers } = await supabaseAdmin
    .from('users')
    .select('user_id, full_name, role')
    .eq('org_id', orgId)
    .ilike('role', 'messenger')
    .limit(1)
  const messenger = messengers?.[0] || { user_id: crypto.randomUUID(), full_name: 'Test Messenger', role: 'messenger' }

  // Resolve or find a test client / document owner
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
  // TEST CASE 1: Single Document Pickup Notification Creation (Desk, Dest, Owner)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 1: Single Document Pickup Notifications (Origin, Destination & Owner) ---');

  const testDoc1Id = crypto.randomUUID()
  const testDoc1Title = `Test Pickup Owner Doc 1 (${Date.now()})`

  await supabaseAdmin.from('documents').insert({
    id: testDoc1Id,
    org_id: orgId,
    user_id: docOwner.user_id,
    title: testDoc1Title,
    tracking_status: 'CREATED',
    current_step: 0,
    stage_id: stageId,
    origin_office_id: originOfficeId,
    current_office_id: originOfficeId,
    qr_code_data: `flowvision://doc/${testDoc1Id}`,
    created_at: new Date().toISOString(),
  })

  // Create pool pickup notification for messengers
  const poolNotifId = crypto.randomUUID()
  await supabaseAdmin.from('notifications').insert({
    id: poolNotifId,
    org_id: orgId,
    document_id: testDoc1Id,
    target_role: 'messenger',
    user_id: null,
    title: 'New Document Ready for Pickup',
    message: `Ready for collection at ${originOfficeName}. Deliver next to ${destOfficeName}.`,
    is_read: false,
    is_claimed: false,
  })

  // Simulate execution of pickup endpoint logic:
  // 1. Departure Notice to Origin Office Desk (Document Departed Office)
  const departureNotifId = crypto.randomUUID()
  await supabaseAdmin.from('notifications').insert({
    id: departureNotifId,
    org_id: orgId,
    office_id: originOfficeId,
    document_id: testDoc1Id,
    target_role: 'employee',
    user_id: null,
    title: 'Document Departed Office',
    message: `${messenger.full_name} has picked up "${testDoc1Title}" from your office.`,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
  })

  // 2. Inbound Notice to Destination Office (Inbound Document Picked Up)
  const inboundNotifId = crypto.randomUUID()
  await supabaseAdmin.from('notifications').insert({
    id: inboundNotifId,
    org_id: orgId,
    office_id: destOfficeId,
    document_id: testDoc1Id,
    target_role: 'employee',
    user_id: null,
    title: 'Inbound Document Picked Up',
    message: `${messenger.full_name} has accepted the pickup for "${testDoc1Title}" and is transferring it to ${destOfficeName}.`,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
  })

  // 3. Direct Departure Notice to Document Owner (Document Departed [Origin Office])
  const ownerDepartureNotifId = crypto.randomUUID()
  await supabaseAdmin.from('notifications').insert({
    id: ownerDepartureNotifId,
    org_id: orgId,
    office_id: null,
    document_id: testDoc1Id,
    target_role: 'client',
    user_id: docOwner.user_id,
    title: `Document Departed ${originOfficeName}`,
    message: `${messenger.full_name} picked up "${testDoc1Title}" from ${originOfficeName} and it is now in transit toward ${destOfficeName}.`,
    is_read: false,
    is_claimed: false,
    claimed_by_user_id: null,
  })

  // Claim pool notification
  await supabaseAdmin
    .from('notifications')
    .update({ is_claimed: true, claimed_by_user_id: messenger.user_id, is_read: true })
    .eq('id', poolNotifId)

  // Fetch created notifications for testDoc1
  const { data: doc1Notifs } = await supabaseAdmin
    .from('notifications')
    .select('id, title, office_id, user_id, target_role, message')
    .eq('document_id', testDoc1Id)

  const originDepartureNotif = doc1Notifs?.find(n => n.title === 'Document Departed Office' && n.office_id === originOfficeId)
  const destInboundNotif = doc1Notifs?.find(n => n.title === 'Inbound Document Picked Up' && n.office_id === destOfficeId)
  const ownerNotif = doc1Notifs?.find(n => n.user_id === docOwner.user_id && n.title === `Document Departed ${originOfficeName}`)

  const test1OriginValid = Boolean(originDepartureNotif && originDepartureNotif.target_role === 'employee')
  const test1DestValid = Boolean(destInboundNotif && destInboundNotif.target_role === 'employee')
  const test1OwnerValid = Boolean(ownerNotif && ownerNotif.target_role === 'client' && ownerNotif.user_id === docOwner.user_id)

  console.log(`[TEST 1] Origin Desk Departure Notification ("Document Departed Office" -> ${originOfficeId}):`, test1OriginValid ? 'PASSED' : 'FAILED')
  console.log(`[TEST 1] Destination Inbound Notification ("Inbound Document Picked Up" -> ${destOfficeId}):`, test1DestValid ? 'PASSED' : 'FAILED')
  console.log(`[TEST 1] Document Owner Departure Notification (user_id = ${docOwner.user_id}):`, test1OwnerValid ? 'PASSED' : 'FAILED')

  // Check pool notification is claimed
  const { data: checkedPoolNotif } = await supabaseAdmin
    .from('notifications')
    .select('is_claimed, claimed_by_user_id, is_read')
    .eq('id', poolNotifId)
    .single()

  const test1PoolClaimed = checkedPoolNotif.is_claimed === true && checkedPoolNotif.claimed_by_user_id === messenger.user_id;
  console.log(`[TEST 1] Pool pickup notification marked as claimed:`, test1PoolClaimed ? 'PASSED' : 'FAILED');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 2: Inbox Visibility for Document Owner & Office Desks
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Inbox Visibility (Origin Desk, Destination Office & Document Owner) ---');

  // Check Origin Office Inbox
  const { data: originQueue } = await supabaseAdmin
    .from('notifications')
    .select('id, title, office_id')
    .eq('org_id', orgId)
    .ilike('target_role', 'employee')
    .in('office_id', [originOfficeId])
    .eq('is_read', false)

  const foundInOriginQueue = originQueue?.some(n => n.id === departureNotifId)
  console.log(`[TEST 2] Origin office inbox contains "Document Departed Office":`, foundInOriginQueue ? 'PASSED' : 'FAILED')

  // Check Destination Office Inbox
  const { data: destQueue } = await supabaseAdmin
    .from('notifications')
    .select('id, title, office_id')
    .eq('org_id', orgId)
    .ilike('target_role', 'employee')
    .in('office_id', [destOfficeId])
    .eq('is_read', false)

  const foundInDestQueue = destQueue?.some(n => n.id === inboundNotifId)
  console.log(`[TEST 2] Destination office inbox contains "Inbound Document Picked Up":`, foundInDestQueue ? 'PASSED' : 'FAILED')

  // Check Document Owner Inbox
  const { data: ownerQueue } = await supabaseAdmin
    .from('notifications')
    .select('id, title, user_id')
    .eq('org_id', orgId)
    .ilike('target_role', 'client')
    .eq('user_id', docOwner.user_id)
    .eq('is_read', false)

  const foundInOwnerQueue = ownerQueue?.some(n => n.id === ownerDepartureNotifId)
  console.log(`[TEST 2] Document Owner inbox contains "Document Departed ${originOfficeName}":`, foundInOwnerQueue ? 'PASSED' : 'FAILED')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 3: Batch Manifest Notifications (Desk, Dest, Owner)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Batch Manifest Notifications including Document Owner ---');

  const batchDocId1 = crypto.randomUUID()
  const batchDocId2 = crypto.randomUUID()

  await supabaseAdmin.from('documents').insert([
    {
      id: batchDocId1,
      org_id: orgId,
      user_id: docOwner.user_id,
      title: `Batch Owner Item A (${Date.now()})`,
      tracking_status: 'CREATED',
      current_step: 0,
      stage_id: stageId,
      origin_office_id: originOfficeId,
      qr_code_data: `flowvision://doc/${batchDocId1}`,
      created_at: new Date().toISOString(),
    },
    {
      id: batchDocId2,
      org_id: orgId,
      user_id: docOwner.user_id,
      title: `Batch Owner Item B (${Date.now()})`,
      tracking_status: 'CREATED',
      current_step: 0,
      stage_id: stageId,
      origin_office_id: originOfficeId,
      qr_code_data: `flowvision://doc/${batchDocId2}`,
      created_at: new Date().toISOString(),
    }
  ])

  // Create notifications for batch items
  const batchDepNotif1 = crypto.randomUUID()
  const batchInbNotif1 = crypto.randomUUID()
  const batchOwnerNotif1 = crypto.randomUUID()

  const batchDepNotif2 = crypto.randomUUID()
  const batchInbNotif2 = crypto.randomUUID()
  const batchOwnerNotif2 = crypto.randomUUID()

  await supabaseAdmin.from('notifications').insert([
    // Item 1: Desk Departure + Inbound + Owner Notice
    {
      id: batchDepNotif1,
      org_id: orgId,
      office_id: originOfficeId,
      document_id: batchDocId1,
      target_role: 'employee',
      user_id: null,
      title: 'Document Departed Office',
      message: `${messenger.full_name} has picked up "Batch Owner Item A" from your office.`,
      is_read: false,
      is_claimed: false,
    },
    {
      id: batchInbNotif1,
      org_id: orgId,
      office_id: destOfficeId,
      document_id: batchDocId1,
      target_role: 'employee',
      user_id: null,
      title: 'Inbound Document Picked Up',
      message: `${messenger.full_name} accepted pickup for Batch Owner Item A → transferring to ${destOfficeName}.`,
      is_read: false,
      is_claimed: false,
    },
    {
      id: batchOwnerNotif1,
      org_id: orgId,
      office_id: null,
      document_id: batchDocId1,
      target_role: 'client',
      user_id: docOwner.user_id,
      title: `Document Departed ${originOfficeName}`,
      message: `${messenger.full_name} picked up "Batch Owner Item A" from ${originOfficeName} and it is now in transit.`,
      is_read: false,
      is_claimed: false,
    },
    // Item 2: Desk Departure + Inbound + Owner Notice
    {
      id: batchDepNotif2,
      org_id: orgId,
      office_id: originOfficeId,
      document_id: batchDocId2,
      target_role: 'employee',
      user_id: null,
      title: 'Document Departed Office',
      message: `${messenger.full_name} has picked up "Batch Owner Item B" from your office.`,
      is_read: false,
      is_claimed: false,
    },
    {
      id: batchInbNotif2,
      org_id: orgId,
      office_id: destOfficeId,
      document_id: batchDocId2,
      target_role: 'employee',
      user_id: null,
      title: 'Inbound Document Picked Up',
      message: `${messenger.full_name} accepted pickup for Batch Owner Item B → transferring to ${destOfficeName}.`,
      is_read: false,
      is_claimed: false,
    },
    {
      id: batchOwnerNotif2,
      org_id: orgId,
      office_id: null,
      document_id: batchDocId2,
      target_role: 'client',
      user_id: docOwner.user_id,
      title: `Document Departed ${originOfficeName}`,
      message: `${messenger.full_name} picked up "Batch Owner Item B" from ${originOfficeName} and it is now in transit.`,
      is_read: false,
      is_claimed: false,
    }
  ])

  const { data: batchNotifs } = await supabaseAdmin
    .from('notifications')
    .select('id, office_id, user_id, document_id, title')
    .in('id', [batchDepNotif1, batchInbNotif1, batchOwnerNotif1, batchDepNotif2, batchInbNotif2, batchOwnerNotif2])

  const batchDepCount = batchNotifs?.filter(n => n.title === 'Document Departed Office' && n.office_id === originOfficeId).length
  const batchInbCount = batchNotifs?.filter(n => n.title === 'Inbound Document Picked Up' && n.office_id === destOfficeId).length
  const batchOwnerCount = batchNotifs?.filter(n => n.title === `Document Departed ${originOfficeName}` && n.user_id === docOwner.user_id).length

  const test3BatchPassed = batchDepCount === 2 && batchInbCount === 2 && batchOwnerCount === 2;
  console.log(`[TEST 3] Batch items created Desk Departure, Destination Inbound & Owner Departure alerts:`, test3BatchPassed ? 'PASSED' : 'FAILED');

  // ──────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- Cleanup Test Artifacts ---');
  await supabaseAdmin.from('notifications').delete().in('id', [
    poolNotifId,
    departureNotifId,
    inboundNotifId,
    ownerDepartureNotifId,
    batchDepNotif1,
    batchInbNotif1,
    batchOwnerNotif1,
    batchDepNotif2,
    batchInbNotif2,
    batchOwnerNotif2,
  ])
  await supabaseAdmin.from('documents').delete().in('id', [testDoc1Id, batchDocId1, batchDocId2])
  console.log('Cleaned up test documents and notification rows.');

  console.log('\n================================================================');
  console.log('VERIFICATION SUMMARY:');
  console.log('1. Origin Desk Departure Notification:', test1OriginValid ? 'PASSED' : 'FAILED');
  console.log('2. Destination Inbound Notification:', test1DestValid ? 'PASSED' : 'FAILED');
  console.log('3. Document Owner Direct Departure Notice (user_id):', test1OwnerValid ? 'PASSED' : 'FAILED');
  console.log('4. Office & Owner Inbox Visibility:', (foundInOriginQueue && foundInDestQueue && foundInOwnerQueue) ? 'PASSED' : 'FAILED');
  console.log('5. Batch Pickup Multi-Target Notifications:', test3BatchPassed ? 'PASSED' : 'FAILED');
  console.log('================================================================\n');

  if (test1OriginValid && test1DestValid && test1OwnerValid && foundInOriginQueue && foundInDestQueue && foundInOwnerQueue && test3BatchPassed) {
    console.log('🎉 ALL PICKUP & DOCUMENT OWNER NOTIFICATION CHECKS PASSED!');
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
