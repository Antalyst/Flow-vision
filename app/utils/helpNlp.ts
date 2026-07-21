export interface HelpArticle {
  id: string
  title: string
  summary: string
  steps: string[]
  keywords: string[]
}

export interface HelpMatchResult {
  article: HelpArticle
  score: number
}

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'track-document',
    title: 'Track a Document',
    summary: 'Follow your document through every office checkpoint in real time.',
    keywords: ['track', 'tracking', 'missing', 'where', 'status', 'locate', 'find document', 'location'],
    steps: [
      'Open Documents from the sidebar and select the document you need.',
      'Use Current Working to view the live pipeline queue and timeline.',
      'Check Notifications for messenger pickup and office arrival alerts.',
      'Scan the document QR from Office QR if you need the physical tracking token.',
    ],
  },
  {
    id: 'flagged-compliance',
    title: 'Understanding Flagged Documents',
    summary: 'A flagged document means an office reported a discrepancy during desk review.',
    keywords: ['flagged', 'flag', 'compliance', 'discrepancy', 'issue', 'problem', 'rejected'],
    steps: [
      'Open the document preview drawer from Documents or Current Working.',
      'Select the pipeline office node to open the inter-office compliance chat.',
      'Review the issue thread and respond with clarifying notes for the originating station.',
      'Monitor Activity for resolution updates once the desk clears the checkpoint.',
    ],
  },
  {
    id: 'sla-overdue',
    title: 'SLA Compliance & Overdue Status',
    summary: 'SLA timers measure how long a document may remain at each office milestone.',
    keywords: ['sla', 'overdue', 'deadline', 'late', 'compliance', 'hours', 'delay'],
    steps: [
      'Open SLA Compliance under Analytics & Insights.',
      'Review the checkpoint column for each active document.',
      'Overdue badges indicate a station exceeded its allowed processing window.',
      'Contact the listed office via document chat if escalation is required.',
    ],
  },
  {
    id: 'reports',
    title: 'Operational Reports',
    summary: 'Employees and messengers can submit operational summaries that appear in your Reports inbox.',
    keywords: ['report', 'reports', 'summary', 'incident', 'log', 'operational'],
    steps: [
      'Open Reports from Analytics & Insights.',
      'Unread operational summaries appear when field staff submit desk or trip logs.',
      'Mark related notifications as read after reviewing each entry.',
      'Use Workload Analytics to correlate report spikes with station bottlenecks.',
    ],
  },
  {
    id: 'upload',
    title: 'Register a New Document',
    summary: 'Upload and route a document into your organisation pipeline.',
    keywords: ['upload', 'register', 'submit', 'new document', 'create', 'add'],
    steps: [
      'Go to Documents and choose Upload Document.',
      'Select the target route (stage) and priority for the package.',
      'Confirm the origin office assignment before submitting.',
      'A messenger pickup notification is broadcast once registration completes.',
    ],
  },
  {
    id: 'notifications',
    title: 'Notification Preferences',
    summary: 'Control how FlowVision alerts you about document movement.',
    keywords: ['notification', 'alert', 'sound', 'email', 'settings', 'toggle'],
    steps: [
      'Open Settings from the Support section.',
      'Enable or mute document status alerts and operational report broadcasts.',
      'Switch between light and dark display layers from the same panel.',
      'Changes apply immediately to this browser session.',
    ],
  },
]

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)
}

export function matchHelpQuery(query: string): HelpMatchResult[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const lower = trimmed.toLowerCase()
  const tokens = tokenize(trimmed)

  const scored = HELP_ARTICLES.map((article) => {
    let score = 0
    for (const keyword of article.keywords) {
      if (lower.includes(keyword)) score += keyword.includes(' ') ? 6 : 3
    }
    for (const token of tokens) {
      if (article.title.toLowerCase().includes(token)) score += 2
      if (article.summary.toLowerCase().includes(token)) score += 1
      for (const keyword of article.keywords) {
        if (keyword.includes(token)) score += 2
      }
    }
    return { article, score }
  }).filter((r) => r.score > 0)

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 3)
}

export function getDefaultHelpArticles(): HelpArticle[] {
  return HELP_ARTICLES.slice(0, 4)
}
