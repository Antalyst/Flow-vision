<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <header>
      <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedClass">
        <Icon name="ph:question-light" class="h-3.5 w-3.5 text-candy-orange" />
        <span>Employee Portal</span>
        <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
        <span class="font-medium" :class="headingClass">Help &amp; Knowledge Base</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">Help &amp; Documentation</h1>
      <p class="mt-1 text-sm" :class="mutedClass">Guidance on document scanning, inbound dispatches, desk reviews, and compliance flags.</p>
    </header>

    <!-- Search Input -->
    <div class="relative">
      <Icon name="ph:magnifying-glass-light" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-candy-orange" />
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search employee workflows (e.g., 'scan qr', 'inbound dispatch', 'flag issue')..."
        class="w-full rounded-none border py-3.5 pl-12 pr-4 text-sm outline-none transition-all duration-200 focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
        :class="inputClass"
      />
    </div>

    <!-- Quick Category Cards -->
    <div v-if="!searchQuery.trim()" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="rounded-none border p-5 transition-all duration-200 hover:border-candy-orange hover:shadow-sm cursor-pointer"
        :class="panelClass"
        @click="searchQuery = cat.keyword"
      >
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-none bg-candy-orange/10 text-candy-orange">
            <Icon :name="cat.icon" class="h-5 w-5" />
          </span>
          <div>
            <h2 class="text-sm font-bold" :class="headingClass">{{ cat.title }}</h2>
            <p class="text-[14px]" :class="mutedClass">{{ cat.articlesCount }} articles</p>
          </div>
        </div>
        <p class="mt-3 text-xs leading-relaxed" :class="mutedClass">{{ cat.description }}</p>
      </div>
    </div>

    <!-- Filtered Articles -->
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b pb-2" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
        <h2 class="text-xs font-bold uppercase tracking-wider text-candy-orange">
          {{ searchQuery.trim() ? `Search Results (${filteredArticles.length})` : 'Frequently Asked Questions' }}
        </h2>
      </div>

      <div v-if="filteredArticles.length" class="space-y-3">
        <article
          v-for="item in filteredArticles"
          :key="item.id"
          class="rounded-none border p-5 transition-colors"
          :class="panelClass"
        >
          <div class="flex items-start gap-3">
            <Icon :name="item.icon || 'ph:info-light'" class="mt-0.5 h-5 w-5 flex-none text-candy-orange" />
            <div class="min-w-0 flex-1">
              <h3 class="text-sm font-bold" :class="headingClass">{{ item.title }}</h3>
              <p class="mt-1 text-xs leading-relaxed" :class="mutedClass">{{ item.summary }}</p>
              <ul v-if="item.steps" class="mt-3 list-disc space-y-1.5 pl-5 text-xs" :class="mutedClass">
                <li v-for="(step, sIdx) in item.steps" :key="sIdx">{{ step }}</li>
              </ul>
            </div>
          </div>
        </article>
      </div>

      <div
        v-else
        class="rounded-none border p-8 text-center"
        :class="panelClass"
      >
        <Icon name="ph:seal-question-light" class="mx-auto h-8 w-8 text-candy-orange opacity-50" />
        <p class="mt-2 text-sm font-semibold" :class="headingClass">No matching documentation found</p>
        <p class="mt-1 text-xs" :class="mutedClass">Try searching for keywords like "pickup", "checkpoint", "manifest", or "QR code".</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'employee' })

const { isDark } = useTheme()

const searchQuery = ref('')

const headingClass = computed(() => (isDark.value ? 'text-white' : 'text-gray-900'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => (isDark.value ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'))
const inputClass = computed(() => (isDark.value ? 'bg-onyx-card border-onyx-border text-white' : 'bg-white border-gray-200 text-gray-900'))

const categories = [
  {
    id: 'inbound',
    title: 'Inbound Dispatches & ASN',
    keyword: 'inbound',
    icon: 'ph:motorcycle-light',
    articlesCount: 3,
    description: 'Understand how Advance Shipping Notices (ASN) notify destination desks in real-time when couriers scan documents for pickup.',
  },
  {
    id: 'checkpoints',
    title: 'Desk Reviews & Checkpoints',
    keyword: 'checkpoint',
    icon: 'ph:clipboard-text-light',
    articlesCount: 3,
    description: 'Learn how to inspect incoming packages, verify physical stamps, and mark step checkpoints cleared before the next courier handoff.',
  },
  {
    id: 'compliance',
    title: 'Compliance & Flags',
    keyword: 'flag',
    icon: 'ph:shield-warning-light',
    articlesCount: 2,
    description: 'How to flag document discrepancies, open real-time issue chats with station admins, and resolve active holds.',
  },
]

const articles = [
  {
    id: 'asn-alerts',
    title: 'How Advance Shipping Notices (ASN) Work',
    category: 'inbound',
    icon: 'ph:bell-ringing-light',
    summary: 'When a courier scans a document at an origin office, a real-time broadcast is sent directly to your destination station.',
    steps: [
      'The courier performs a physical pickup scan with the FlowVision mobile app.',
      'Your workstation receives an audible chime and real-time toast alert indicating the courier and estimated delivery step.',
      'The document moves to the "In Transit" column on your Live Workspace board.',
    ],
  },
  {
    id: 'clearing-checkpoints',
    title: 'Clearing Step Checkpoints upon Drop-off',
    category: 'checkpoints',
    icon: 'ph:check-square-light',
    summary: 'When a courier drops off a package at your office, review the documents and clear the checkpoint.',
    steps: [
      'Open the document preview in the Live Workspace or scan the document QR code.',
      'Review document attachments and verify the physical security seal.',
      'Click "Clear Step Checkpoint" to permit the next leg courier to initiate pickup.',
    ],
  },
  {
    id: 'flagging-issues',
    title: 'Reporting Discrepancies & Flagging Documents',
    category: 'compliance',
    icon: 'ph:warning-circle-light',
    summary: 'If a document is damaged, missing signatures, or routing incorrectly, report a discrepancy immediately.',
    steps: [
      'Click "Flag Issue / Discrepancy" in the Document Preview Drawer.',
      'Select the reason (e.g., Missing Signature, Damaged Seal, Routing Error) and add notes.',
      'The document status immediately freezes to prevent unauthorized courier transit until resolved.',
    ],
  },
  {
    id: 'qr-desks',
    title: 'Managing Office & Desk QR Codes',
    category: 'checkpoints',
    icon: 'ph:qr-code-light',
    summary: 'Generate unique QR station tags for your office tables and intake counters.',
    steps: [
      'Navigate to the "Office QR Codes" section from the sidebar.',
      'Click "Register New Desk" to create a named desk node.',
      'Print the generated QR placard and affix it to your physical station.',
    ],
  },
]

const filteredArticles = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return articles
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.steps.some((s) => s.toLowerCase().includes(q)),
  )
})
</script>
