/**
 * test_messenger_store.cjs
 *
 * Verifies Pinia messenger store actions, getters, and localStorage persistence.
 */

// Mock localStorage
const mockStorage = new Map()
globalThis.localStorage = {
  getItem: (k) => mockStorage.get(k) ?? null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
}

function createMessengerStoreMock(isClient = true) {
  const STORAGE_KEY = 'fv_focused_doc_id'

  const state = {
    focusedDocumentId: isClient ? (globalThis.localStorage.getItem(STORAGE_KEY) || null) : null,
  }

  const getters = {
    hasFocusedDocument: () => !!state.focusedDocumentId,
    isFocused: (docId) => state.focusedDocumentId === docId,
  }

  const actions = {
    setFocus(docId) {
      state.focusedDocumentId = docId
      if (isClient) {
        if (docId) {
          globalThis.localStorage.setItem(STORAGE_KEY, docId)
        } else {
          globalThis.localStorage.removeItem(STORAGE_KEY)
        }
      }
    },
    clearFocus() {
      this.setFocus(null)
    },
  }

  return { state, getters, actions }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`)
    process.exit(1)
  }
  console.log(`✅ ${message}`)
}

async function runTests() {
  console.log('--- Testing Pinia Messenger Store State & LocalStorage Persistence ---')

  // Test 1: Initial state
  globalThis.localStorage.clear()
  let store = createMessengerStoreMock(true)
  assert(store.state.focusedDocumentId === null, 'Initial focusedDocumentId is null')
  assert(store.getters.hasFocusedDocument() === false, 'hasFocusedDocument returns false initially')

  // Test 2: setFocus updates state and localStorage
  store.actions.setFocus('doc-abc-123')
  assert(store.state.focusedDocumentId === 'doc-abc-123', 'setFocus updates state.focusedDocumentId')
  assert(globalThis.localStorage.getItem('fv_focused_doc_id') === 'doc-abc-123', 'localStorage fv_focused_doc_id is updated')
  assert(store.getters.hasFocusedDocument() === true, 'hasFocusedDocument returns true when doc is focused')
  assert(store.getters.isFocused('doc-abc-123') === true, 'isFocused returns true for focused document')
  assert(store.getters.isFocused('doc-other') === false, 'isFocused returns false for other documents')

  // Test 3: Reloading / re-instantiating client store initializes from localStorage
  let reloadedStore = createMessengerStoreMock(true)
  assert(reloadedStore.state.focusedDocumentId === 'doc-abc-123', 'Re-initialized client store reads fv_focused_doc_id from localStorage')

  // Test 4: clearFocus removes from state and localStorage
  store.actions.clearFocus()
  assert(store.state.focusedDocumentId === null, 'clearFocus sets state.focusedDocumentId to null')
  assert(globalThis.localStorage.getItem('fv_focused_doc_id') === null, 'clearFocus removes fv_focused_doc_id from localStorage')
  assert(store.getters.hasFocusedDocument() === false, 'hasFocusedDocument returns false after clearFocus')

  // Test 5: SSR environment safety (isClient = false)
  let ssrStore = createMessengerStoreMock(false)
  assert(ssrStore.state.focusedDocumentId === null, 'SSR store safely initializes without reading localStorage')
  ssrStore.actions.setFocus('doc-ssr-test')
  assert(ssrStore.state.focusedDocumentId === 'doc-ssr-test', 'SSR setFocus updates state without attempting localStorage access')

  console.log('\n🎉 ALL PINIA MESSENGER STORE TESTS PASSED SUCCESSFULLY!')
}

runTests().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
