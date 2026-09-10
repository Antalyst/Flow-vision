/**
 * test_messenger_focus_mode.cjs
 *
 * Verifies the Focus Mode SLA priority assignment logic and custody document ranking.
 */

function getPriorityWeight(priority) {
  const p = (priority || '').toLowerCase().trim()
  if (p === 'urgent' || p === 'high') return 3
  if (p === 'medium') return 2
  if (p === 'low') return 1
  return 1
}

function sortDocumentsBySlaPriority(docs) {
  return [...docs].sort((a, b) => {
    const weightA = getPriorityWeight(a.priority)
    const weightB = getPriorityWeight(b.priority)
    if (weightA !== weightB) {
      return weightB - weightA
    }

    if (a.target_date && b.target_date) {
      const diff = new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
      if (diff !== 0) return diff
    } else if (a.target_date && !b.target_date) {
      return -1
    } else if (!a.target_date && b.target_date) {
      return 1
    }

    if (a.created_at && b.created_at) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }

    return 0
  })
}

function autoSelectHighestPriority(docs, currentFocusId = null, force = false) {
  if (!docs || !docs.length) return null
  const inTransit = docs.filter((d) => d.tracking_status === 'IN_TRANSIT')
  const candidates = inTransit.length > 0 ? inTransit : docs

  if (!force && currentFocusId) {
    const exists = candidates.some((d) => d.id === currentFocusId)
    if (exists) return currentFocusId
  }

  const sorted = sortDocumentsBySlaPriority(candidates)
  return sorted[0] ? sorted[0].id : null
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`)
    process.exit(1)
  }
  console.log(`✅ ${message}`)
}

async function runTests() {
  console.log('--- Testing Messenger Focus Mode SLA Sorting ---')

  const sampleDocs = [
    {
      id: 'doc-low-1',
      title: 'Routine Circular',
      priority: 'Low',
      tracking_status: 'IN_TRANSIT',
      target_date: '2026-09-15T00:00:00Z',
      created_at: '2026-09-01T10:00:00Z',
    },
    {
      id: 'doc-high-urgent',
      title: 'Urgent Executive Board Memo',
      priority: 'High',
      tracking_status: 'IN_TRANSIT',
      target_date: '2026-09-10T12:00:00Z',
      created_at: '2026-09-08T08:00:00Z',
    },
    {
      id: 'doc-medium-1',
      title: 'Finance Invoice',
      priority: 'Medium',
      tracking_status: 'IN_TRANSIT',
      target_date: '2026-09-12T00:00:00Z',
      created_at: '2026-09-05T09:00:00Z',
    },
    {
      id: 'doc-high-later',
      title: 'High Priority Contract',
      priority: 'High',
      tracking_status: 'IN_TRANSIT',
      target_date: '2026-09-14T00:00:00Z',
      created_at: '2026-09-08T09:00:00Z',
    },
  ]

  // Test 1: High priority should be chosen over Medium and Low
  const sorted = sortDocumentsBySlaPriority(sampleDocs)
  assert(sorted[0].id === 'doc-high-urgent', 'Highest SLA priority (High + earlier target date) ranks first')
  assert(sorted[1].id === 'doc-high-later', 'Second High priority ranks before Medium')
  assert(sorted[2].id === 'doc-medium-1', 'Medium priority ranks before Low')
  assert(sorted[3].id === 'doc-low-1', 'Low priority ranks last')

  // Test 2: Auto selection picks highest priority
  const selectedFocus = autoSelectHighestPriority(sampleDocs)
  assert(selectedFocus === 'doc-high-urgent', 'autoSelectHighestPriority automatically selects doc-high-urgent')

  // Test 3: Existing valid focus is preserved when not forced
  const preservedFocus = autoSelectHighestPriority(sampleDocs, 'doc-medium-1', false)
  assert(preservedFocus === 'doc-medium-1', 'Existing valid focus is preserved if force is false')

  // Test 4: Force override selects highest SLA priority even if another focus was set
  const forcedFocus = autoSelectHighestPriority(sampleDocs, 'doc-medium-1', true)
  assert(forcedFocus === 'doc-high-urgent', 'Forced autoSelectHighestPriority recalculates and selects top SLA target')

  // Test 5: Awaiting scan fallback if no IN_TRANSIT
  const awaitingOnly = [
    { id: 'doc-awaiting-med', priority: 'Medium', tracking_status: 'PICKED_UP', created_at: '2026-09-09T00:00:00Z' },
    { id: 'doc-awaiting-high', priority: 'High', tracking_status: 'PICKED_UP', created_at: '2026-09-09T01:00:00Z' },
  ]
  const awaitingFocus = autoSelectHighestPriority(awaitingOnly)
  assert(awaitingFocus === 'doc-awaiting-high', 'Awaiting scan documents fallback to highest SLA priority correctly')

  console.log('\n🎉 ALL MESSENGER FOCUS MODE TESTS PASSED SUCCESSFULLY!')
}

runTests().catch((err) => {
  console.error('Test error:', err)
  process.exit(1)
})
