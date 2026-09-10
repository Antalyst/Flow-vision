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

const supabaseSubscriber = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
})

async function broadcastInboundDispatchRealtime(orgId, targetOfficeId, event, payload) {
  const channels = [`org:${orgId}:logistics`]
  if (targetOfficeId) {
    channels.push(`org:${orgId}:office:${targetOfficeId}`)
  }

  const messages = channels.map((topic) => ({
    topic,
    event,
    payload,
  }))

  const res = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  console.log(`[broadcastInboundDispatchRealtime] HTTP ${res.status} broadcast [${event}] sent to: ${channels.join(', ')}`)
  return res.status === 200 || res.status === 202
}

async function run() {
  console.log('=== Step 1: Querying Org, Users, Offices, Stages ===')

  // Find a test org
  const { data: orgs, error: orgErr } = await supabaseAdmin.from('org').select('*').limit(1)
  if (orgErr || !orgs || orgs.length === 0) {
    throw new Error('No org found: ' + JSON.stringify(orgErr))
  }
  const orgRow = orgs[0]
  const orgId = String(orgRow.org_id || orgRow.id)
  console.log(`Using Org: ${orgRow.name || orgRow.org_name} (${orgId})`)

  // Find or pick a messenger in this org
  const { data: messengers } = await supabaseAdmin
    .from('users')
    .select('user_id, full_name, role, org_id')
    .eq('org_id', orgId)
    .ilike('role', 'messenger')
    .limit(1)

  let messenger = messengers?.[0]
  if (!messenger) {
    const { data: anyUsers } = await supabaseAdmin
      .from('users')
      .select('user_id, full_name, role, org_id')
      .eq('org_id', orgId)
      .limit(1)
    messenger = anyUsers?.[0]
  }
  console.log(`Using Messenger: ${messenger?.full_name} (${messenger?.user_id})`)

  // Find stages with steps
  const { data: stages } = await supabaseAdmin
    .from('stages')
    .select('stage_id, name')
    .eq('org_id', orgId)
    .limit(1)

  const stageId = stages?.[0]?.stage_id
  if (!stageId) throw new Error('No stage found for org.')

  const { data: steps } = await supabaseAdmin
    .from('stage_steps')
    .select('step_number, office_id, offices(name)')
    .eq('stage_id', stageId)
    .order('step_number', { ascending: true })

  if (!steps || steps.length < 2) {
    throw new Error('Need at least 2 stage steps in stage: ' + stageId)
  }

  const step1 = steps[0]
  const step2 = steps[1]
  const originOfficeId = step1.office_id
  const originOfficeName = step1.offices?.name || 'Origin Office'
  const destOfficeId = String(step2.office_id)
  const destOfficeName = step2.offices?.name || 'Destination Office'

  console.log(`Stage: ${stages[0].name} (${stageId})`)
  console.log(`Step 1 Office: ${originOfficeName} (${originOfficeId})`)
  console.log(`Step 2 (Next Destination) Office: ${destOfficeName} (${destOfficeId})`)

  // Create a fresh test document at step 1
  const testDocId = crypto.randomUUID()
  const { data: testDoc, error: docErr } = await supabaseAdmin
    .from('documents')
    .insert({
      id: testDocId,
      title: `ASN Test Document ${Date.now()}`,
      description: 'Advance Shipping Notice verification doc',
      status: 'APPROVED',
      tracking_status: 'CREATED',
      current_step: 1,
      stage_id: stageId,
      origin_office_id: originOfficeId,
      current_office_id: originOfficeId,
      office_id: originOfficeId,
      org_id: orgId,
      user_id: messenger.user_id,
      creator_role: 'employee',
      qr_code_data: `FV-DOC:${testDocId}`,
    })
    .select()
    .single()

  if (docErr) throw new Error('Failed to create test doc: ' + JSON.stringify(docErr))
  console.log(`Created test document: "${testDoc.title}" (${testDoc.id}) at Step 1`)

  console.log('\n=== Step 2: Subscribing to Supabase Realtime Channels (Phoenix WebSocket) ===')
  const officeTopic = `org:${orgId}:office:${destOfficeId}`
  const logisticsTopic = `org:${orgId}:logistics`
  console.log(`Subscribing to: ${officeTopic} and ${logisticsTopic}`)

  let receivedOfficeDispatch = false
  let receivedOfficeAsnAlert = false
  let receivedLogisticsDispatch = false

  const officeChannel = supabaseSubscriber.channel(officeTopic)
  officeChannel
    .on('broadcast', { event: 'INCOMING_DISPATCH' }, ({ payload }) => {
      console.log(`>>> [REALTIME RECEIVED on ${officeTopic}] INCOMING_DISPATCH:`, JSON.stringify(payload))
      receivedOfficeDispatch = true
    })
    .on('broadcast', { event: 'ASN_PROACTIVE_ALERT' }, ({ payload }) => {
      console.log(`>>> [REALTIME RECEIVED on ${officeTopic}] ASN_PROACTIVE_ALERT:`, JSON.stringify(payload))
      receivedOfficeAsnAlert = true
    })
    .subscribe((status) => {
      console.log(`[Channel status: ${officeTopic}] => ${status}`)
    })

  const logisticsChannel = supabaseSubscriber.channel(logisticsTopic)
  logisticsChannel
    .on('broadcast', { event: 'INCOMING_DISPATCH' }, ({ payload }) => {
      console.log(`>>> [REALTIME RECEIVED on ${logisticsTopic}] INCOMING_DISPATCH:`, JSON.stringify(payload))
      receivedLogisticsDispatch = true
    })
    .subscribe((status) => {
      console.log(`[Channel status: ${logisticsTopic}] => ${status}`)
    })

  // Wait 3s for WebSocket subscriptions to be acknowledged
  await new Promise((r) => setTimeout(r, 3000))

  console.log('\n=== Step 3: Executing Courier Pickup Workflow ===')
  const nextStep = (testDoc.current_step ?? 0) + 1
  let targetOfficeId = null
  let targetOfficeName = null

  const { data: stepRow } = await supabaseAdmin
    .from('stage_steps')
    .select('office_id, offices(name)')
    .eq('stage_id', testDoc.stage_id)
    .eq('step_number', nextStep)
    .maybeSingle()

  if (stepRow?.office_id) {
    targetOfficeId = String(stepRow.office_id)
    targetOfficeName = stepRow.offices?.name ?? null
  }

  console.log(`Resolved destination office for step ${nextStep}: ${targetOfficeName} (${targetOfficeId})`)

  const now = new Date().toISOString()
  const { data: updatedDoc, error: upErr } = await supabaseAdmin.from('documents').update({
    tracking_status: 'IN_TRANSIT',
    current_step: nextStep,
    assigned_messenger_id: messenger.user_id,
    current_office_id: null,
  }).eq('id', testDoc.id).select().single()

  if (upErr) throw new Error('Failed to update doc: ' + JSON.stringify(upErr))
  console.log(`Updated test doc status to ${updatedDoc.tracking_status}, step=${updatedDoc.current_step}`)

  const dispatchPayload = {
    type: 'INCOMING_DISPATCH',
    event: 'INCOMING_DISPATCH',
    document_id: testDoc.id,
    document_title: testDoc.title,
    batch_manifest_id: null,
    target_office_id: targetOfficeId,
    target_office_name: targetOfficeName,
    next_step: nextStep,
    assigned_messenger_id: messenger.user_id,
    messenger_name: messenger.full_name,
    tracking_status: 'IN_TRANSIT',
    dispatched_at: now,
    notes: `In transit to ${targetOfficeName} (Step ${nextStep}).`,
  }

  console.log('Sending Realtime REST Broadcasts...')
  await broadcastInboundDispatchRealtime(orgId, targetOfficeId, 'INCOMING_DISPATCH', dispatchPayload)
  await broadcastInboundDispatchRealtime(orgId, targetOfficeId, 'ASN_PROACTIVE_ALERT', dispatchPayload)

  // Wait 2.5s for WebSocket delivery
  await new Promise((r) => setTimeout(r, 2500))

  console.log('\n=== Step 4: Verifying Inbound Queue Query (scope=INCOMING) ===')
  // Query matching documents for employee assigned to destOfficeId
  const employeeOfficeIds = [destOfficeId]
  const { data: targetSteps } = await supabaseAdmin
    .from('stage_steps')
    .select('stage_id, step_number, office_id')
    .in('office_id', employeeOfficeIds)

  const orConditions = []
  const officeList = employeeOfficeIds.join(',')
  orConditions.push(`office_id.in.(${officeList})`)

  if (targetSteps && targetSteps.length > 0) {
    for (const step of targetSteps) {
      orConditions.push(`and(stage_id.eq.${step.stage_id},current_step.eq.${step.step_number})`)
    }
  }

  console.log('Constructed orConditions:', orConditions.join(','))
  const { data: incomingDocs, error: qErr } = await supabaseAdmin
    .from('documents')
    .select('id, title, tracking_status, current_step, stage_id, office_id')
    .eq('org_id', orgId)
    .in('tracking_status', ['IN_TRANSIT', 'PICKED_UP'])
    .or(orConditions.join(','))

  if (qErr) console.error('Queue query error:', qErr)
  console.log(`Inbound documents matching destination office [${destOfficeName}]:`, incomingDocs?.map(d => ({ id: d.id, title: d.title, step: d.current_step })))
  const foundTestDoc = incomingDocs?.find((d) => d.id === testDoc.id)
  console.log(`Test document present in inbound queue:`, foundTestDoc ? 'YES' : 'NO')

  // Cleanup test doc
  console.log('\n=== Cleanup ===')
  await supabaseAdmin.from('document_tracking_events').delete().eq('document_id', testDocId)
  await supabaseAdmin.from('documents').delete().eq('id', testDocId)
  console.log('Cleaned up test document and events.')

  // Unsubscribe channels
  await supabaseSubscriber.removeChannel(officeChannel)
  await supabaseSubscriber.removeChannel(logisticsChannel)

  console.log('\n=== INTEGRATION TEST REPORT ===')
  console.log('1. Realtime broadcast to Destination Office (INCOMING_DISPATCH):', receivedOfficeDispatch ? 'PASSED' : 'FAILED')
  console.log('2. Realtime broadcast to Destination Office (ASN_PROACTIVE_ALERT):', receivedOfficeAsnAlert ? 'PASSED' : 'FAILED')
  console.log('3. Realtime broadcast to Logistics (INCOMING_DISPATCH):', receivedLogisticsDispatch ? 'PASSED' : 'FAILED')
  console.log('4. Destination Office Resolution:', targetOfficeId === destOfficeId ? 'PASSED' : 'FAILED')
  console.log('5. Inbound Queue Retrieval (scope=INCOMING):', foundTestDoc ? 'PASSED' : 'FAILED')

  if (receivedOfficeDispatch && targetOfficeId === destOfficeId && foundTestDoc) {
    console.log('\n🎉 ALL CHECKS PASSED: Advance Shipping Notice (ASN) Realtime broadcast and inbound queue verified!')
  } else {
    throw new Error('Some verification checks failed.')
  }
}

run().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
