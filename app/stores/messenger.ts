import { defineStore } from 'pinia'

export interface MessengerState {
  focusedDocumentId: string | null
  focusedDocument: any | null
}

const STORAGE_KEY = 'fv_focused_doc_id'

export type ScanMode = 'pickup' | 'dropoff'

export function resolveDocumentScanMode(docOrStatus: any): ScanMode {
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

export const useMessengerStore = defineStore('messenger', {
  state: (): MessengerState => ({
    focusedDocumentId: (() => {
      if (import.meta.client) {
        try {
          return localStorage.getItem(STORAGE_KEY)
        } catch {
          return null
        }
      }
      return null
    })(),
    focusedDocument: null,
  }),

  getters: {
    hasFocusedDocument: (state) => !!state.focusedDocumentId,
    isFocused: (state) => (docId: string) => state.focusedDocumentId === docId,
    focusedScanMode: (state): ScanMode => {
      return resolveDocumentScanMode(state.focusedDocument)
    },
  },

  actions: {
    setFocus(docId: string | null, docObj: any = null) {
      this.focusedDocumentId = docId
      this.focusedDocument = docObj

      if (import.meta.client) {
        try {
          if (docId) {
            localStorage.setItem(STORAGE_KEY, docId)
          } else {
            localStorage.removeItem(STORAGE_KEY)
          }
        } catch {
          // Ignore localStorage errors in restricted environments
        }
      }
    },

    setFocusedDocument(docObj: any | null) {
      if (docObj?.id) {
        this.setFocus(docObj.id, docObj)
      } else {
        this.setFocus(null, null)
      }
    },

    clearFocus() {
      this.setFocus(null, null)
    },

    getScanModeForDocument(doc: any): ScanMode {
      return resolveDocumentScanMode(doc)
    },
  },
})
