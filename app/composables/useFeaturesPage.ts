export type FeatureFilterId = 'all' | 'routing' | 'qr' | 'ai' | 'sla' | 'nlq'

export interface FeatureFilterNode {
  id: FeatureFilterId
  label: string
  icon?: string
}

export interface FeatureCardItem {
  id: string
  category: string
  title: string
  description: string
  tags?: string[]
  variant?: 'default' | 'diagram' | 'qr' | 'analytics'
}

export interface FeatureSectionGroup {
  id: string
  eyebrow: string
  title: string
  description: string
  features: FeatureCardItem[]
}

const ASSETS = '/bg/Hero/section-two'

const FILTER_PANEL_MAP: Record<Exclude<FeatureFilterId, 'all'>, string[]> = {
  routing: ['routing', 'topology', 'dashboard'],
  qr: ['qr-checkpoints', 'zero-ambiguity', 'topology'],
  ai: ['summarization', 'predictive', 'discovery', 'nlq'],
  sla: ['sla-intelligence', 'dashboard'],
  nlq: ['nlq', 'summarization', 'discovery'],
}

export function useFeaturesPage() {
  const activeFilter = useState<FeatureFilterId>('features:active-filter', () => 'all')

  const filterNodes: FeatureFilterNode[] = [
    { id: 'all', label: 'All', icon: 'ph:squares-four-fill' },
    { id: 'routing', label: 'Routing', icon: 'ph:graph-fill' },
    { id: 'qr', label: 'QR Verify', icon: 'ph:qr-code-fill' },
    { id: 'ai', label: 'AI Tools', icon: 'ph:cpu-fill' },
    { id: 'sla', label: 'SLA Tracking', icon: 'ph:timer-fill' },
    { id: 'nlq', label: 'Ask a Question', icon: 'ph:chat-circle-text-fill' },
  ]

  function isDimmed(panelId: string) {
    if (activeFilter.value === 'all') return false
    const related = FILTER_PANEL_MAP[activeFilter.value]
    return !related.includes(panelId)
  }

  function setFilter(id: FeatureFilterId) {
    activeFilter.value = id

    if (id === 'all') return

    nextTick(() => {
      const el = document.getElementById(`feature-panel-${id}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  return {
    activeFilter,
    filterNodes,
    isDimmed,
    setFilter,
  }
}

export const FEATURES_TOP_METRICS = [
  { icon: 'ph:package-fill', label: 'Documents in motion', value: '2,847', delta: '+12%' },
  { icon: 'ph:check-circle-fill', label: 'On-time delivery rate', value: '96.4%', delta: '+2.1%' },
  { icon: 'ph:cpu-fill', label: 'Offices connected', value: '48', delta: '100%' },
  { icon: 'ph:bell-fill', label: 'Alerts needing attention', value: '7', delta: '−3 today' },
] as const

export const FEATURES_ARCHITECTURE_SATELLITES = [
  { label: 'Office A', x: 80, y: 50 },
  { label: 'Office B', x: 320, y: 50 },
  { label: 'Office C', x: 340, y: 170 },
  { label: 'Office D', x: 60, y: 170 },
] as const

export const FEATURES_QR_PATTERN = [
  1, 1, 1, 0, 1, 1, 1,
  1, 0, 0, 0, 1, 0, 1,
  1, 0, 1, 0, 1, 0, 1,
  0, 0, 1, 1, 0, 0, 0,
  1, 0, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 1, 0, 1,
  1, 1, 1, 0, 1, 1, 1,
] as const

export const FEATURES_SLA_BARS = [62, 78, 71, 85, 92, 88, 95] as const

export const FEATURES_DASHBOARD_STATS = [
  { label: 'Documents in motion', value: '2,847', delta: '+12% vs last week' },
  { label: 'On-time rate', value: '96.4%', delta: '+2.1% improvement' },
  { label: 'Alerts', value: '7', delta: '3 resolved today' },
] as const

export const FEATURES_THROUGHPUT_BARS = [45, 62, 55, 78, 70, 85, 92, 68, 74, 88, 95, 82] as const

/** AI capability cards — asset paths mapped to /bg/Hero/section-two/ */
export const FEATURES_AI_CAPABILITIES = [
  {
    id: 'summarization',
    title: 'Smart Summarization',
    description: 'Generate privacy-first overviews so officials grasp context without reading every page.',
    image: `${ASSETS}/smart  sumarization.png`,
    tags: ['Privacy-first', 'Auto-overview', 'Edge inference'],
  },
  {
    id: 'predictive',
    title: 'Predictive Bottleneck Analysis',
    description: 'Forecast approval durations and rebalance workload before delays compound across offices.',
    image: `${ASSETS}/predective.png`,
    tags: ['Forecasting', 'Workload balance', 'SLA-aware'],
  },
  {
    id: 'discovery',
    title: 'Contextual Document Discovery',
    description: 'Semantic search retrieves documents by intent, not keywords alone — across every node.',
    image: `${ASSETS}/Contextual Document DiscoveryDescription.png`,
    tags: ['Semantic search', 'Intent-based', 'Cross-node'],
  },
] as const

/** NLQ spotlight panel */
export const FEATURES_NLQ_SPOTLIGHT = {
  id: 'nlq',
  category: 'Query Engine',
  title: 'Natural Language Query (NLQ)',
  description: 'No SQL needed. Anyone on your team can ask a question in plain language and get a clear answer instantly.',
  image: `${ASSETS}/Natural Language Query.png`,
  query: 'Show all documents delayed more than 48h in Region 3',
  result: '14 documents matched · avg delay 62h · 3 offices flagged for reroute',
  tags: ['No SQL needed', 'Plain language', 'For every role'],
} as const

/** @deprecated Use FEATURES_AI_CAPABILITIES */
export const FEATURES_CAPABILITIES = FEATURES_AI_CAPABILITIES

export const FEATURES_SECTION_A: FeatureSectionGroup = {
  id: 'core-infrastructure',
  eyebrow: 'Section A',
  title: 'Routing & Visibility',
  description: 'Automatic routing and a live view of your network — the foundation that keeps documents moving between offices.',
  features: [
    {
      id: 'routing',
      category: 'Routing',
      title: 'Automatic Routing',
      description: 'Documents move between offices automatically, with live status at every step.',
      tags: ['Multi-office', 'Live status', 'Automatic'],
      variant: 'default',
    },
    {
      id: 'topology',
      category: 'Network Visibility',
      title: 'Live Network View',
      description: 'A live map of your entire office network, so you can spot slowdowns before they cause delays.',
      variant: 'diagram',
    },
  ],
}

export const FEATURES_SECTION_B: FeatureSectionGroup = {
  id: 'verification-custody',
  eyebrow: 'Section B',
  title: 'Verification & Custody',
  description: 'Every physical handoff is scanned and logged, so there\'s never any doubt about who has a document and when.',
  features: [
    {
      id: 'qr-checkpoints',
      category: 'Verification',
      title: 'Smart QR Checkpoints',
      description: 'A quick scan at intake, transit, handoff, and drop-off keeps every step on record.',
      tags: ['Intake', 'Transit', 'Handoff', 'Drop-off'],
      variant: 'qr',
    },
    {
      id: 'zero-ambiguity',
      category: 'Chain of Custody',
      title: 'Clear Audit Trail',
      description: 'Every scan securely links the courier, location, and time to the document, building a complete history automatically.',
      tags: ['Secure', 'Location-tracked', 'Full history'],
      variant: 'default',
    },
  ],
}

export const FEATURES_SECTION_C: FeatureSectionGroup = {
  id: 'document-management',
  eyebrow: 'Section C',
  title: 'Smart Document Management',
  description: 'Simple intake and automatic compliance checks, so staff can register physical files without extra paperwork.',
  features: [
    {
      id: 'physical-ingest',
      category: 'Ingestion',
      title: 'Quick Document Registration',
      description: 'Staff can register a physical document the moment it arrives, no scanning or digitizing required.',
      tags: ['Fast', 'Simple', 'No scanning required'],
      variant: 'default',
    },
    {
      id: 'policy-mesh',
      category: 'Compliance',
      title: 'Automatic Compliance Checks',
      description: 'Every document is automatically checked against your compliance rules the moment it\'s registered.',
      tags: ['Automatic', 'Rule-based', 'Instant checks'],
      variant: 'default',
    },
  ],
}

export const FEATURES_SECTION_D: FeatureSectionGroup = {
  id: 'operations-sla',
  eyebrow: 'Section D',
  title: 'Operations & SLA Tracking',
  description: 'Countdown timers and early warnings keep your team ahead of deadlines, with a live view of throughput across every office.',
  features: [
    {
      id: 'sla-intelligence',
      category: 'SLA Tracking',
      title: 'On-Time Tracking',
      description: 'A countdown timer warns staff before a deadline is at risk, so nothing slips through unnoticed.',
      tags: ['Countdown timer', 'Early warning', 'Priority alerts'],
      variant: 'analytics',
    },
  ],
}

export const FEATURES_ARCHITECTURAL_SECTIONS: FeatureSectionGroup[] = [
  FEATURES_SECTION_A,
  FEATURES_SECTION_B,
  FEATURES_SECTION_C,
  FEATURES_SECTION_D,
]
