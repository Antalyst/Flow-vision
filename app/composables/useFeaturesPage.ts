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
    { id: 'all', label: 'All Modules', icon: 'ph:squares-four-fill' },
    { id: 'routing', label: 'Routing Mesh', icon: 'ph:graph-fill' },
    { id: 'qr', label: 'QR Verify', icon: 'ph:qr-code-fill' },
    { id: 'ai', label: 'AI Nodes', icon: 'ph:cpu-fill' },
    { id: 'sla', label: 'SLA Intel', icon: 'ph:timer-fill' },
    { id: 'nlq', label: 'NLQ Engine', icon: 'ph:chat-circle-text-fill' },
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
  { icon: 'ph:package-fill', label: 'Active packets in mesh', value: '2,847', delta: '+12%' },
  { icon: 'ph:check-circle-fill', label: 'On-time delivery rate', value: '96.4%', delta: '+2.1%' },
  { icon: 'ph:cpu-fill', label: 'Edge nodes online', value: '48', delta: '100%' },
  { icon: 'ph:bell-fill', label: 'Open SLA alerts', value: '7', delta: '−3 today' },
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
  { label: 'Active packets', value: '2,847', delta: '+12% vs last week' },
  { label: 'On-time rate', value: '96.4%', delta: '+2.1% improvement' },
  { label: 'Open alerts', value: '7', delta: '3 resolved today' },
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
  description: 'Zero SQL — conversational reporting for every role. Ask complex custody questions in plain language and receive structured answers instantly.',
  image: `${ASSETS}/Natural Language Query.png`,
  query: 'Show all documents delayed more than 48h in Region 3',
  result: '14 documents matched · avg delay 62h · 3 offices flagged for reroute',
  tags: ['Zero SQL', 'Conversational', 'Role-based'],
} as const

/** @deprecated Use FEATURES_AI_CAPABILITIES */
export const FEATURES_CAPABILITIES = FEATURES_AI_CAPABILITIES

export const FEATURES_SECTION_A: FeatureSectionGroup = {
  id: 'core-infrastructure',
  eyebrow: 'Section A',
  title: 'Core Layer & Infrastructure',
  description: 'Deterministic routing and live network visibility — the foundation that keeps documents moving through your office mesh with telemetry at every hop.',
  features: [
    {
      id: 'routing',
      category: 'Core Layer',
      title: 'Unified Routing Mesh',
      description: 'Traverses documents through a deterministic graph of local government offices with live telemetry monitoring at every hop.',
      tags: ['Multi-hop', 'SLA Telemetry', 'Deterministic Graph'],
      variant: 'default',
    },
    {
      id: 'topology',
      category: 'Network Visibility',
      title: 'Real-Time Network Topology',
      description: 'A visual map interface allowing system operators to view the entire office network framework and pinpoint systemic bottlenecks before processing delays occur.',
      variant: 'diagram',
    },
  ],
}

export const FEATURES_SECTION_B: FeatureSectionGroup = {
  id: 'verification-custody',
  eyebrow: 'Section B',
  title: 'Verification & Chain of Custody',
  description: 'Physical-to-digital validation loops and cryptographically tracked custody chains that eliminate ambiguity at every touchpoint.',
  features: [
    {
      id: 'qr-checkpoints',
      category: 'Verification',
      title: 'Smart QR Checkpoints',
      description: 'Physical-to-digital validation loops handled at touchpoints — intake, local transit, official handoff, and final drop-off.',
      tags: ['Intake', 'Transit', 'Handoff', 'Drop-off'],
      variant: 'qr',
    },
    {
      id: 'zero-ambiguity',
      category: 'Chain of Custody',
      title: 'Zero-Ambiguity Auditing',
      description: 'Formulates a cryptographically tracked chain of custody binding the courier identity, precise physical office location coordinates, and timestamps to the active record document.',
      tags: ['Cryptographic', 'GPS-bound', 'Immutable audit'],
      variant: 'default',
    },
  ],
}

export const FEATURES_SECTION_C: FeatureSectionGroup = {
  id: 'document-management',
  eyebrow: 'Section C',
  title: 'Smart Document Management',
  description: 'Lightweight ingestion and automated policy validation — so clerks can register physical files and enforce compliance without heavy digitization overhead.',
  features: [
    {
      id: 'physical-ingest',
      category: 'Ingestion',
      title: 'Physical Document Registration Ingest',
      description: 'Custom ingestion layer where clerks record physical files entering the pipeline without requiring heavy optical digitization steps.',
      tags: ['Clerk-first', 'Lightweight', 'No OCR required'],
      variant: 'default',
    },
    {
      id: 'policy-mesh',
      category: 'Compliance',
      title: 'Policy Verification Mesh',
      description: 'Systemic validation flags checking for necessary routing signatures, required processing parameters, and compliance rule status checks automatically upon intake.',
      tags: ['Auto-validation', 'Routing signatures', 'Compliance rules'],
      variant: 'default',
    },
  ],
}

export const FEATURES_SECTION_D: FeatureSectionGroup = {
  id: 'operations-sla',
  eyebrow: 'Section D',
  title: 'Operations Console & SLA Intelligence',
  description: 'Algorithmic countdown timers and breach forecasting that keep operators ahead of deadlines — with live throughput telemetry across the network.',
  features: [
    {
      id: 'sla-intelligence',
      category: 'SLA Intelligence',
      title: 'SLA Intelligence Tracking',
      description: 'Algorithmic count-down timers and priority breach forecasting monitors to explicitly warn clerks when time thresholds are near failure limits.',
      tags: ['Countdown timers', 'Breach forecast', 'Priority alerts'],
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
