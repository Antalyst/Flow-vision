// HTML labels anchored to points in the 3D world. Kept as real DOM text (crisp at any
// DPR, no font atlas to manage); the engine only writes their transform/opacity.

export type WorldLabelKind = 'department' | 'classify' | 'document'

export interface WorldLabelDef {
  id: string
  text: string
  kind: WorldLabelKind
}

export const WORLD_LABELS: WorldLabelDef[] = [
  { id: 'dept-finance', text: 'Finance', kind: 'department' },
  { id: 'dept-records', text: 'Records', kind: 'department' },
  { id: 'dept-operations', text: 'Operations', kind: 'department' },
  { id: 'dept-management', text: 'Management', kind: 'department' },
  { id: 'classify-type', text: 'Invoice', kind: 'classify' },
  { id: 'classify-route', text: 'Route → Finance', kind: 'classify' },
  { id: 'classify-due', text: 'Due in 3 days', kind: 'classify' },
  { id: 'doc-id', text: 'FV-2041 · Received 09:12', kind: 'document' },
]
