import { useMessengerStore } from '~/stores/messenger'

export interface CustodyDocument {
  id: string
  title: string
  tracking_status: string
  tracking_id: string
  current_step: number
  total_steps: number
  origin_office_name?: string | null
  destination_office_name?: string | null
  destination_office_id?: string | null
  route_steps?: Array<{ step_number: number; office_id: string; office_name: string }>
  created_at?: string
  priority?: string | null
  target_date?: string | null
}

function getPriorityWeight(priority?: string | null): number {
  const p = (priority || '').toLowerCase().trim()
  if (p === 'urgent' || p === 'high') return 3
  if (p === 'medium') return 2
  if (p === 'low') return 1
  return 1 // Default fallback
}

/**
 * Sorts documents by SLA Priority (High > Medium > Low),
 * then earliest target_date, then earliest created_at.
 */
export function sortDocumentsBySlaPriority(docs: CustodyDocument[]): CustodyDocument[] {
  return [...docs].sort((a, b) => {
    const weightA = getPriorityWeight(a.priority)
    const weightB = getPriorityWeight(b.priority)
    if (weightA !== weightB) {
      return weightB - weightA // Descending: 3 (High) before 2 before 1
    }

    // Tiebreaker 1: Target Date (earliest first)
    if (a.target_date && b.target_date) {
      const diff = new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
      if (diff !== 0) return diff
    } else if (a.target_date && !b.target_date) {
      return -1
    } else if (!a.target_date && b.target_date) {
      return 1
    }

    // Tiebreaker 2: Created At (earliest first)
    if (a.created_at && b.created_at) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }

    return 0
  })
}

export function useMessengerFocus() {
  const store = useMessengerStore()

  const focusedDocumentId = computed(() => store.focusedDocumentId)

  function setFocusedDocumentId(id: string | null) {
    store.setFocus(id)
  }

  function clearFocus() {
    store.clearFocus()
  }

  /**
   * Auto-assigns the highest SLA priority document as the active focus target.
   * If current focus ID is still valid within docs, it keeps it unless force = true.
   */
  function autoSelectHighestPriority(docs: CustodyDocument[], force = false): string | null {
    if (!docs.length) {
      store.clearFocus()
      return null
    }

    const inTransit = docs.filter((d) => d.tracking_status === 'IN_TRANSIT')
    const candidates = inTransit.length > 0 ? inTransit : docs

    if (!force && store.focusedDocumentId) {
      const exists = candidates.some((d) => d.id === store.focusedDocumentId)
      if (exists) {
        return store.focusedDocumentId
      }
    }

    const sorted = sortDocumentsBySlaPriority(candidates)
    const topDoc = sorted[0]
    if (topDoc) {
      store.setFocus(topDoc.id)
      return topDoc.id
    }

    return null
  }

  function findFocusedDocument(docs: CustodyDocument[]): CustodyDocument | null {
    if (!store.focusedDocumentId || !docs.length) return null
    return docs.find((d) => d.id === store.focusedDocumentId) ?? null
  }

  return {
    focusedDocumentId,
    setFocusedDocumentId,
    clearFocus,
    autoSelectHighestPriority,
    findFocusedDocument,
    sortDocumentsBySlaPriority,
    getPriorityWeight,
    store,
  }
}
