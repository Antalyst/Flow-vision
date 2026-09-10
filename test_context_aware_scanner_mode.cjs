/**
 * test_context_aware_scanner_mode.cjs
 *
 * Verifies context-aware scanner auto-mode determination and UI action badge generation.
 */

function resolveDocumentScanMode(docOrStatus) {
  if (!docOrStatus) return 'pickup'
  const rawStatus = typeof docOrStatus === 'string'
    ? docOrStatus
    : (docOrStatus.tracking_status || docOrStatus.status || '')
  const status = String(rawStatus).toUpperCase().trim()

  if (status === 'PICKED_UP' || status === 'IN_TRANSIT') {
    return 'dropoff'
  }
  if (
    status === 'PENDING_PICKUP' ||
    status === 'ASSIGNED' ||
    status === 'CREATED' ||
    status === 'ARRIVED_AT_OFFICE' ||
    status === 'PENDING'
  ) {
    return 'pickup'
  }
  return 'pickup'
}

function getActionBadge(doc) {
  const mode = resolveDocumentScanMode(doc)
  if (mode === 'pickup') {
    return {
      type: 'pickup',
      badgeClass: 'border-cyan-500 bg-cyan-950 text-cyan-300',
      label: `Action Needed: Pickup from ${doc.origin_office_name || 'Origin Office'}`,
      ctaLabel: `Scan Pickup (from ${doc.origin_office_name || 'Origin'})`,
      targetRoute: `/messenger/scan?mode=pickup&docId=${doc.id}`,
    }
  }
  return {
    type: 'dropoff',
    badgeClass: 'border-emerald-500 bg-emerald-950 text-emerald-300',
    label: `Action Needed: Drop-off at ${doc.destination_office_name || 'Destination Office'}`,
    ctaLabel: `Scan Drop-off (at ${doc.destination_office_name || 'Destination'})`,
    targetRoute: `/messenger/scan?mode=dropoff&docId=${doc.id}`,
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`)
    process.exit(1)
  }
  console.log(`✅ ${message}`)
}

async function runTests() {
  console.log('--- Testing Context-Aware Scanner Auto-Mode & UI Action Badges ---')

  // Test 1: Scan Mode Resolution for IN_TRANSIT & PICKED_UP -> dropoff
  assert(resolveDocumentScanMode('IN_TRANSIT') === 'dropoff', 'IN_TRANSIT resolves to dropoff mode')
  assert(resolveDocumentScanMode('PICKED_UP') === 'dropoff', 'PICKED_UP resolves to dropoff mode')
  assert(resolveDocumentScanMode({ tracking_status: 'IN_TRANSIT' }) === 'dropoff', 'Doc object with IN_TRANSIT resolves to dropoff')

  // Test 2: Scan Mode Resolution for PENDING_PICKUP, ASSIGNED, CREATED -> pickup
  assert(resolveDocumentScanMode('PENDING_PICKUP') === 'pickup', 'PENDING_PICKUP resolves to pickup mode')
  assert(resolveDocumentScanMode('ASSIGNED') === 'pickup', 'ASSIGNED resolves to pickup mode')
  assert(resolveDocumentScanMode('CREATED') === 'pickup', 'CREATED resolves to pickup mode')
  assert(resolveDocumentScanMode('ARRIVED_AT_OFFICE') === 'pickup', 'ARRIVED_AT_OFFICE (awaiting next leg) resolves to pickup mode')
  assert(resolveDocumentScanMode({ tracking_status: 'PENDING_PICKUP' }) === 'pickup', 'Doc object with PENDING_PICKUP resolves to pickup')

  // Test 3: Action Badge & CTA for IN_TRANSIT document
  const inTransitDoc = {
    id: 'doc-transit-101',
    title: 'Urgent Treasury Warrant',
    tracking_status: 'IN_TRANSIT',
    origin_office_name: 'Main Registry',
    destination_office_name: 'Central Bank Station',
  }
  const dropoffBadge = getActionBadge(inTransitDoc)
  assert(dropoffBadge.type === 'dropoff', 'inTransitDoc produces dropoff action')
  assert(dropoffBadge.label === 'Action Needed: Drop-off at Central Bank Station', 'Drop-off badge label matches destination')
  assert(dropoffBadge.targetRoute === '/messenger/scan?mode=dropoff&docId=doc-transit-101', 'Drop-off CTA targets mode=dropoff route')

  // Test 4: Action Badge & CTA for PENDING_PICKUP document
  const pendingPickupDoc = {
    id: 'doc-pickup-202',
    title: 'Procurement Purchase Order',
    tracking_status: 'PENDING_PICKUP',
    origin_office_name: 'Logistics Depot',
    destination_office_name: 'Audit Division',
  }
  const pickupBadge = getActionBadge(pendingPickupDoc)
  assert(pickupBadge.type === 'pickup', 'pendingPickupDoc produces pickup action')
  assert(pickupBadge.label === 'Action Needed: Pickup from Logistics Depot', 'Pickup badge label matches origin office')
  assert(pickupBadge.targetRoute === '/messenger/scan?mode=pickup&docId=doc-pickup-202', 'Pickup CTA targets mode=pickup route')

  // Test 5: In-Scanner Auto-Lock Simulation
  function simulateScannerMount(query, messengerStoreState) {
    const queryMode = query.mode === 'dropoff' || query.mode === 'pickup' ? query.mode : null
    const docMode = messengerStoreState.focusedDocument ? resolveDocumentScanMode(messengerStoreState.focusedDocument) : 'pickup'
    return queryMode || docMode
  }

  const mountDropoff = simulateScannerMount({ mode: 'dropoff', docId: 'doc-transit-101' }, { focusedDocument: inTransitDoc })
  assert(mountDropoff === 'dropoff', 'Scanner initializes directly in Drop-off Mode for IN_TRANSIT target')

  const mountPickup = simulateScannerMount({ mode: 'pickup', docId: 'doc-pickup-202' }, { focusedDocument: pendingPickupDoc })
  assert(mountPickup === 'pickup', 'Scanner initializes directly in Pickup Mode for PENDING_PICKUP target')

  console.log('\n🎉 ALL CONTEXT-AWARE SCANNER AUTO-MODE TESTS PASSED SUCCESSFULLY!')
}

runTests().catch((err) => {
  console.error('Test error:', err)
  process.exit(1)
})
