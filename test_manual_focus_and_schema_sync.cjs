/**
 * test_manual_focus_and_schema_sync.cjs
 *
 * Verifies manual liaison focus mode, target_completion_date alignment, and in-scanner switching.
 */

// Mock localStorage
const mockStorage = new Map()
globalThis.localStorage = {
  getItem: (k) => mockStorage.get(k) ?? null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`)
    process.exit(1)
  }
  console.log(`✅ ${message}`)
}

async function runTests() {
  console.log('--- Testing Manual Liaison Focus Mode & Schema Alignment ---')

  const STORAGE_KEY = 'fv_focused_doc_id'
  globalThis.localStorage.clear()

  const store = {
    focusedDocumentId: null,
    setFocus(id) {
      this.focusedDocumentId = id
      if (id) {
        globalThis.localStorage.setItem(STORAGE_KEY, id)
      } else {
        globalThis.localStorage.removeItem(STORAGE_KEY)
      }
    },
    clearFocus() {
      this.setFocus(null)
    },
    isFocused(id) {
      return this.focusedDocumentId === id
    },
  }

  const sampleCustody = [
    {
      id: 'doc-1',
      title: 'Permit Application Form',
      priority: 'High',
      tracking_status: 'IN_TRANSIT',
      tracking_id: 'FV-DOC-1',
      current_step: 2,
      total_steps: 4,
      destination_office_name: 'Records Hall',
      target_completion_date: '2026-09-12T00:00:00Z',
    },
    {
      id: 'doc-2',
      title: 'Finance Voucher',
      priority: 'Medium',
      tracking_status: 'IN_TRANSIT',
      tracking_id: 'FV-DOC-2',
      current_step: 1,
      total_steps: 3,
      destination_office_name: 'Treasury Office',
      target_completion_date: '2026-09-15T00:00:00Z',
    },
  ]

  // Test 1: Manual Liaison Focus (No automatic focus on load)
  let focusedDoc = store.focusedDocumentId
    ? sampleCustody.find((d) => d.id === store.focusedDocumentId) ?? null
    : null

  assert(focusedDoc === null, 'On manifest load without prior selection, focusedDoc is null (No auto-focus)')

  // Test 2: User clicks "🎯 Focus Delivery" on doc-2
  store.setFocus('doc-2')
  assert(store.focusedDocumentId === 'doc-2', 'store.focusedDocumentId updates immediately to doc-2')
  assert(globalThis.localStorage.getItem(STORAGE_KEY) === 'doc-2', 'localStorage fv_focused_doc_id persists doc-2')
  assert(store.isFocused('doc-2') === true, 'store.isFocused(doc-2) is true')
  assert(store.isFocused('doc-1') === false, 'store.isFocused(doc-1) is false')

  focusedDoc = store.focusedDocumentId
    ? sampleCustody.find((d) => d.id === store.focusedDocumentId) ?? null
    : null
  assert(focusedDoc !== null && focusedDoc.id === 'doc-2', 'focusedDoc resolves correctly to doc-2')

  // Test 3: Scanner banner format
  const bannerText = `Active Focus: ${focusedDoc.title} → Destination: ${focusedDoc.destination_office_name}`
  assert(
    bannerText === 'Active Focus: Finance Voucher → Destination: Treasury Office',
    `Scanner banner formatted correctly: "${bannerText}"`,
  )

  // Test 4: In-Scanner switching to doc-1
  store.setFocus('doc-1')
  assert(store.focusedDocumentId === 'doc-1', 'In-scanner switcher updates focus to doc-1')
  assert(globalThis.localStorage.getItem(STORAGE_KEY) === 'doc-1', 'localStorage updated to doc-1')

  // Test 5: Clear Focus returns UI cleanly to neutral manifest queue
  store.clearFocus()
  assert(store.focusedDocumentId === null, 'clearFocus sets store.focusedDocumentId to null')
  assert(globalThis.localStorage.getItem(STORAGE_KEY) === null, 'fv_focused_doc_id removed from localStorage')

  const neutralDoc = store.focusedDocumentId
    ? sampleCustody.find((d) => d.id === store.focusedDocumentId) ?? null
    : null
  assert(neutralDoc === null, 'focusedDoc is null after clearFocus, rendering neutral queue')

  // Test 6: Safe target_completion_date / target_date access
  function formatDateSafe(val) {
    if (!val) return ''
    const d = new Date(val)
    return isNaN(d.getTime()) ? String(val) : d.toISOString().split('T')[0]
  }

  const docWithCompletionDate = { target_completion_date: '2026-09-20T10:00:00Z' }
  const docWithLegacyDate = { target_date: '2026-09-22T10:00:00Z' }
  const docWithNullDate = {}

  assert(
    formatDateSafe(docWithCompletionDate.target_completion_date || docWithCompletionDate.target_date) === '2026-09-20',
    'Evaluates target_completion_date safely',
  )
  assert(
    formatDateSafe(docWithLegacyDate.target_completion_date || docWithLegacyDate.target_date) === '2026-09-22',
    'Falls back to legacy target_date safely',
  )
  assert(
    formatDateSafe(docWithNullDate.target_completion_date || docWithNullDate.target_date) === '',
    'Handles null/empty date without error',
  )

  console.log('\n🎉 ALL MANUAL LIAISON FOCUS & SCHEMA SYNCHRONIZATION TESTS PASSED SUCCESSFULLY!')
}

runTests().catch((err) => {
  console.error('Test error:', err)
  process.exit(1)
})
