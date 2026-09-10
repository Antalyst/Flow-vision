<template>
  <div class="space-y-6 pb-24 md:pb-8">
    <!-- Header -->
    <div>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:package-light" class="h-4 w-4 text-candy-orange" />
        <span>Messenger Portal</span>
        <Icon name="ph:caret-right-light" class="h-3 w-3" />
        <span class="font-medium" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">Deliveries</span>
      </div>
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
            Batch Delivery Dispatch
          </h1>
          <p class="mt-1 text-sm" :class="mutedClass">
            Manage your acquired batch load, select active delivery focus, and process station handshakes.
          </p>
        </div>
        <div v-if="allDocs.length" class="flex items-center gap-2 text-xs font-semibold">
          <span class="px-2.5 py-1 rounded-none border border-candy-orange/40 bg-candy-orange/10 text-candy-orange">
            {{ custody.in_transit.length }} In Transit
          </span>
          <span class="px-2.5 py-1 rounded-none border border-amber-500/30 bg-amber-500/10 text-amber-400">
            {{ custody.awaiting_scan.length }} Awaiting Scan
          </span>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-4">
      <div class="dashboard-card h-48 animate-pulse border" :class="skeletonClass" />
      <div class="dashboard-card h-32 animate-pulse border" :class="skeletonClass" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!allDocs.length"
      class="dashboard-card rounded-none border border-dashed p-12 text-center text-sm"
      :class="isDark ? 'border-onyx-border text-white-muted' : 'border-zinc-200 text-gray-400'"
    >
      <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-none bg-candy-orange/10 text-candy-orange">
        <Icon name="ph:package-light" class="h-6 w-6" />
      </div>
      <p class="font-bold text-base" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
        No Active Deliveries in Custody
      </p>
      <p class="mt-1 text-xs" :class="mutedClass">
        Accept an inbound pickup request from the Messenger Dashboard or scan a dispatch QR to begin.
      </p>
      <NuxtLink
        to="/messenger/scan?mode=pickup"
        class="mt-4 inline-flex items-center gap-2 rounded-none bg-candy-orange px-4 py-2.5 text-xs font-bold text-white transition hover:bg-candy-orange/90 active:scale-[0.98]"
      >
        <Icon name="ph:qr-code-light" class="h-4 w-4" />
        Open Pickup Scanner
      </NuxtLink>
    </div>

    <div v-else class="space-y-6">
      <!-- ── 🎯 ACTIVE DELIVERY FOCUS CARD (Rendered only when a document is focused) ── -->
      <section
        v-if="focusedDoc"
        class="relative overflow-hidden rounded-none border-2 border-candy-orange bg-black p-6 shadow-xl shadow-candy-orange/10"
      >
        <!-- Background accent glow -->
        <div class="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-candy-orange/10 blur-3xl pointer-events-none" />

        <div class="relative z-10 flex flex-col gap-5">
          <!-- Top Row: Focus Badge, SLA Priority & Controls -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 items-center justify-center bg-candy-orange text-black font-black text-sm">
                🎯
              </span>
              <div>
                <p class="text-[11px] font-black uppercase tracking-wider text-candy-orange">
                  Active Delivery Focus
                </p>
                <p class="text-[10px] text-white/60">Primary Target for Current Leg</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <!-- SLA Priority Tag -->
              <span
                class="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider border"
                :class="getPriorityBadgeClass(focusedDoc.priority)"
              >
                <Icon name="ph:fire-simple-fill" class="h-3 w-3" />
                {{ focusedDoc.priority || 'Medium' }} SLA Priority
              </span>

              <!-- Status Tag -->
              <span
                class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border"
                :class="focusedDoc.tracking_status === 'IN_TRANSIT'
                  ? 'border-candy-orange bg-candy-orange/10 text-candy-orange'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400'"
              >
                {{ focusedDoc.tracking_status === 'IN_TRANSIT' ? 'In Transit' : 'Awaiting Scan' }}
              </span>

              <!-- Change Focus CTA -->
              <button
                type="button"
                class="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:text-white hover:bg-white/10 transition border border-white/20"
                title="Choose another document from manifest"
                @click="manifestExpanded = true"
              >
                <Icon name="ph:arrows-down-up-light" class="h-3.5 w-3.5 text-candy-orange" />
                Change Focus
              </button>

              <!-- Clear Focus Button -->
              <button
                type="button"
                class="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition border border-white/10"
                title="Clear current target focus"
                @click="messengerStore.clearFocus()"
              >
                <Icon name="ph:x-circle-light" class="h-3.5 w-3.5" />
                Clear Focus
              </button>
            </div>
          </div>

          <!-- ── 🟦 / 🟩 Context-Aware Action Banner ── -->
          <div
            class="flex items-center gap-3 px-4 py-3 rounded-none font-bold text-xs uppercase tracking-wider border shadow-md"
            :class="focusedScanMode === 'pickup'
              ? 'border-cyan-500 bg-cyan-950/80 text-cyan-300 shadow-cyan-950/40'
              : 'border-emerald-500 bg-emerald-950/80 text-emerald-300 shadow-emerald-950/40'"
          >
            <span
              class="flex h-6 w-6 items-center justify-center rounded-none text-black font-black text-xs flex-shrink-0"
              :class="focusedScanMode === 'pickup' ? 'bg-cyan-400' : 'bg-emerald-400'"
            >
              <Icon :name="focusedScanMode === 'pickup' ? 'ph:hand-bold' : 'ph:buildings-bold'" class="h-3.5 w-3.5" />
            </span>

            <div class="min-w-0 flex-1">
              <span v-if="focusedScanMode === 'pickup'" class="tracking-wide">
                🟦 Action Needed: Pickup from <strong class="text-white underline decoration-cyan-400">{{ focusedDoc.origin_office_name || 'Origin Office' }}</strong>
              </span>
              <span v-else class="tracking-wide">
                🟩 Action Needed: Drop-off at <strong class="text-white underline decoration-emerald-400">{{ focusedDoc.destination_office_name || 'Destination Office' }}</strong>
              </span>
            </div>
          </div>

          <!-- Middle Row: Document Details & Target Destination Station -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <!-- Document Meta -->
            <div class="md:col-span-6 space-y-1.5">
              <h2 class="text-xl font-extrabold text-white leading-snug">
                {{ focusedDoc.title }}
              </h2>
              <div class="flex flex-wrap items-center gap-3 text-xs text-white/60 font-mono">
                <span>ID: {{ focusedDoc.tracking_id }}</span>
                <span>•</span>
                <span class="text-amber-400 font-semibold">
                  Step {{ focusedDoc.current_step }} / {{ focusedDoc.total_steps || '—' }}
                </span>
                <span v-if="focusedDoc.target_completion_date || focusedDoc.target_date">
                  • Target: {{ formatDateSafe(focusedDoc.target_completion_date || focusedDoc.target_date) }}
                </span>
              </div>
            </div>

            <!-- Target Destination Station Spotlight -->
            <div class="md:col-span-6 rounded-none border border-candy-orange/40 bg-white/5 p-4">
              <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">
                Target Destination Station
              </p>
              <div class="mt-1.5 flex items-center gap-2">
                <Icon name="ph:map-pin-fill" class="h-5 w-5 text-candy-orange flex-shrink-0" />
                <p class="text-base font-extrabold text-white truncate">
                  {{ focusedDoc.destination_office_name || 'Destination Station Unassigned' }}
                </p>
              </div>
              <p v-if="focusedDoc.origin_office_name" class="mt-1 text-[11px] text-white/50">
                Dispatched from: {{ focusedDoc.origin_office_name }}
              </p>
            </div>
          </div>

          <!-- Bottom Row: Primary Context-Aware CTAs -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-2 rounded-none px-6 py-3.5 text-xs font-black uppercase tracking-wider text-black transition active:scale-[0.99] shadow-lg"
              :class="focusedScanMode === 'pickup'
                ? 'bg-cyan-400 hover:bg-cyan-300 shadow-cyan-400/20'
                : 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-400/20'"
              @click="goToScan(focusedDoc)"
            >
              <Icon name="ph:scan-fill" class="h-4 w-4" />
              <span v-if="focusedScanMode === 'pickup'">
                Scan Pickup (from {{ focusedDoc.origin_office_name || 'Origin' }})
              </span>
              <span v-else>
                Scan Drop-off (at {{ focusedDoc.destination_office_name || 'Destination' }})
              </span>
            </button>

            <NuxtLink
              :to="`/messenger/delivery?document_id=${focusedDoc.id}`"
              class="inline-flex items-center justify-center gap-2 rounded-none border border-white/20 bg-white/5 px-5 py-3.5 text-xs font-bold text-white transition hover:bg-white/10 hover:border-white/40 active:scale-[0.99]"
            >
              <Icon name="ph:path-light" class="h-4 w-4 text-candy-orange" />
              View Route Vector
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- ── 📋 IN-TRANSIT MANIFEST (MANUAL FOCUS QUEUE) ─────────────── -->
      <section
        class="dashboard-card border rounded-none overflow-hidden transition"
        :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white-pure'"
      >
        <!-- Manifest Header / Toggle -->
        <button
          type="button"
          class="w-full flex items-center justify-between p-5 text-left border-b transition hover:bg-white/5"
          :class="isDark ? 'border-onyx-border' : 'border-zinc-200'"
          @click="manifestExpanded = !manifestExpanded"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-none bg-candy-orange/10 text-candy-orange font-bold">
              <Icon name="ph:list-bullets-bold" class="h-4 w-4" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
                  In-Transit Manifest Queue
                </h3>
                <span class="rounded-none bg-candy-orange/20 px-2 py-0.5 text-[11px] font-bold text-candy-orange">
                  {{ allDocs.length }} {{ allDocs.length === 1 ? 'Document' : 'Documents' }}
                </span>
              </div>
              <p class="text-xs mt-0.5" :class="mutedClass">
                Batch custody roster. Click "🎯 Focus Delivery" on any item to designate it as your active destination target.
              </p>
            </div>
          </div>

          <Icon
            :name="manifestExpanded ? 'ph:caret-up-bold' : 'ph:caret-down-bold'"
            class="h-4 w-4 text-candy-orange transition-transform duration-200"
          />
        </button>

        <!-- Manifest Body -->
        <div v-show="manifestExpanded" class="p-4 space-y-3">
          <div
            v-for="doc in allDocs"
            :key="doc.id"
            class="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-none transition"
            :class="messengerStore.isFocused(doc.id)
              ? 'border-candy-orange bg-candy-orange/10 ring-1 ring-candy-orange/40 shadow-inner'
              : (isDark ? 'border-onyx-border/80 bg-onyx-card/60 hover:border-candy-orange/50' : 'border-zinc-200 bg-white-surface hover:border-candy-orange/40')"
          >
            <!-- Left Info -->
            <div class="space-y-1.5 min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-if="messengerStore.isFocused(doc.id)"
                  class="inline-flex items-center gap-1 rounded-none bg-candy-orange px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow"
                >
                  🎯 Active Focus Target
                </span>
                <span
                  class="rounded-none px-2 py-0.5 text-[10px] font-bold uppercase"
                  :class="doc.tracking_status === 'IN_TRANSIT' ? 'bg-candy-orange/10 text-candy-orange border border-candy-orange/30' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'"
                >
                  {{ doc.tracking_status === 'IN_TRANSIT' ? 'In Transit' : 'Awaiting Scan' }}
                </span>
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase border"
                  :class="getPriorityBadgeClass(doc.priority)"
                >
                  {{ doc.priority || 'Medium' }} Priority
                </span>
              </div>

              <h4 class="font-bold text-sm truncate" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
                {{ doc.title }}
              </h4>

              <div class="flex flex-wrap items-center gap-3 text-xs" :class="mutedClass">
                <span class="font-mono text-[11px]">ID: {{ doc.tracking_id }}</span>
                <span>•</span>
                <span>Next Station: <strong class="text-candy-orange">{{ doc.destination_office_name || '—' }}</strong></span>
                <span>•</span>
                <span>Step {{ doc.current_step }}/{{ doc.total_steps || '—' }}</span>
                <span v-if="doc.target_completion_date || doc.target_date">
                  • Target: {{ formatDateSafe(doc.target_completion_date || doc.target_date) }}
                </span>
              </div>
            </div>

            <!-- Right Actions -->
            <div class="flex items-center gap-2 flex-shrink-0">
              <!-- Focus Delivery Action Button -->
              <button
                v-if="!messengerStore.isFocused(doc.id)"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-none border border-candy-orange bg-candy-orange/10 px-3.5 py-2 text-xs font-bold text-candy-orange transition hover:bg-candy-orange hover:text-black active:scale-[0.98]"
                @click="messengerStore.setFocus(doc.id, doc)"
              >
                <Icon name="ph:crosshair-bold" class="h-3.5 w-3.5" />
                🎯 Focus Delivery
              </button>

              <button
                v-else
                type="button"
                class="inline-flex items-center gap-1 rounded-none border border-candy-orange/50 bg-candy-orange/20 px-3 py-2 text-xs font-bold text-candy-orange hover:bg-candy-orange/30 transition"
                title="Click to clear focus"
                @click="messengerStore.clearFocus()"
              >
                <Icon name="ph:check-bold" class="h-3.5 w-3.5" />
                Targeted (Clear)
              </button>

              <NuxtLink
                :to="`/messenger/delivery?document_id=${doc.id}`"
                class="inline-flex items-center gap-1 rounded-none border px-3 py-2 text-xs font-semibold transition"
                :class="isDark ? 'border-onyx-border text-white/80 hover:bg-white/10 hover:text-white' : 'border-zinc-200 text-gray-700 hover:bg-gray-100'"
                title="View Trip Details"
              >
                <Icon name="ph:arrow-square-out-light" class="h-4 w-4" />
                Details
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessengerStore, resolveDocumentScanMode } from '~/stores/messenger'
import type { CustodyDocument } from '~/composables/useMessengerFocus'

definePageMeta({ layout: 'messenger' })

const router = useRouter()
const { isDark } = useTheme()
const messengerStore = useMessengerStore()

const loading = ref(true)
const manifestExpanded = ref(true)
const custody = ref<{ in_transit: CustodyDocument[]; awaiting_scan: CustodyDocument[] }>({
  in_transit: [],
  awaiting_scan: [],
})

const allDocs = computed(() => [...custody.value.in_transit, ...custody.value.awaiting_scan])

// Active Focus is strictly manual / liaison-driven
const focusedDoc = computed(() => {
  if (!allDocs.value.length || !messengerStore.focusedDocumentId) return null
  return allDocs.value.find((d) => d.id === messengerStore.focusedDocumentId) ?? null
})

const focusedScanMode = computed(() => resolveDocumentScanMode(focusedDoc.value))

const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))
const skeletonClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-zinc-200 bg-gray-200'))

function getPriorityBadgeClass(priority?: string | null) {
  const p = (priority || '').toLowerCase().trim()
  if (p === 'urgent' || p === 'high') {
    return 'border-rose-500/40 bg-rose-500/10 text-rose-400'
  }
  if (p === 'low') {
    return 'border-zinc-500/40 bg-zinc-500/10 text-zinc-400'
  }
  return 'border-amber-500/40 bg-amber-500/10 text-amber-400'
}

function formatDateSafe(val?: string | null): string {
  if (!val) return ''
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return String(val)
  }
}

function goToScan(doc: CustodyDocument) {
  messengerStore.setFocus(doc.id, doc)
  const targetMode = resolveDocumentScanMode(doc)
  router.push({
    path: '/messenger/scan',
    query: {
      mode: targetMode,
      document_id: doc.id,
      docId: doc.id,
    },
  })
}

onMounted(async () => {
  try {
    const res = await $fetch<{
      success: boolean
      data?: { in_transit: CustodyDocument[]; awaiting_scan: CustodyDocument[] }
    }>('/api/tracking/custody', { credentials: 'include' })

    custody.value = {
      in_transit: Array.isArray(res?.data?.in_transit) ? res.data.in_transit : [],
      awaiting_scan: Array.isArray(res?.data?.awaiting_scan) ? res.data.awaiting_scan : [],
    }

    // Safeguard: verify if current stored focus is still in custody roster
    if (messengerStore.focusedDocumentId) {
      const match = allDocs.value.find((d) => d.id === messengerStore.focusedDocumentId)
      if (!match) {
        messengerStore.clearFocus()
      } else {
        messengerStore.setFocus(match.id, match)
      }
    }
  } catch (err) {
    console.warn('[MessengerDeliveries] custody load error, defaulting to empty list:', err)
    custody.value = { in_transit: [], awaiting_scan: [] }
  } finally {
    loading.value = false
  }
})
</script>
