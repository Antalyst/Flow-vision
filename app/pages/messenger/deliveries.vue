<template>
  <div class="space-y-6 pb-24 md:pb-8">
    <!-- Header -->
    <div>
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
            Deliveries
          </h1>
         
        </div>
        <div v-if="allDocs.length" class="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span class="px-3 py-1.5 rounded-full  bg-success text-white">
            {{ custody.assigned_pending_pickup.length }} Ready for Pickup
          </span>
          <span class="px-3 py-1.5 rounded-full border border-candy-orange/30 bg-candy-orange/10 text-candy-orange">
            {{ custody.in_transit.length + custody.awaiting_scan.length }} In Progress
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
      class="dashboard-card border border-dashed p-12 text-center text-sm"
      :class="isDark ? 'border-onyx-border text-white-muted' : 'border-zinc-200 text-gray-400'"
    >
      <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-candy-orange/10 text-candy-orange">
        <Icon name="ph:package-light" class="h-6 w-6" />
      </div>
      <p class="font-bold text-base" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
        No Deliveries Assigned to You
      </p>
      <p class="mt-1 text-xs" :class="mutedClass">
        An office will assign you directly when a document is ready — nothing to accept or claim.
      </p>
    </div>

    <div v-else class="space-y-6">
      <!-- ── Current Delivery (focused document) ── -->
      <section v-if="focusedDoc" class="dashboard-card border-2 border-candy-orange p-5 sm:p-6">
        <div class="flex flex-col gap-4">
          <!-- Top Row: Section Label & Controls -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-4" :class="isDark ? 'border-onyx-border' : 'border-zinc-200'">
            <div class="flex items-center gap-2.5">
              <span class="flex h-8 w-8 items-center justify-center rounded-full bg-candy-orange text-white-pure">
                <Icon name="ph:crosshair-bold" class="h-4 w-4" />
              </span>
              <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">
                Current Delivery
              </p>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition"
                :class="isDark ? 'text-white-muted hover:bg-white/10 hover:text-white-pure' : 'text-gray-500 hover:bg-gray-100 hover:text-onyx-black'"
                title="Choose another document from your list"
                @click="manifestExpanded = true"
              >
                <Icon name="ph:arrows-down-up-light" class="h-3.5 w-3.5" />
                Change Focus
              </button>

              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition"
                :class="isDark ? 'text-white-muted hover:bg-white/10 hover:text-white-pure' : 'text-gray-500 hover:bg-gray-100 hover:text-onyx-black'"
                title="Clear current delivery focus"
                @click="messengerStore.clearFocus()"
              >
                <Icon name="ph:x-circle-light" class="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </div>

          <!-- Title -->
          <h2 class="text-lg font-bold leading-snug" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
            {{ focusedDoc.title }}
          </h2>

          <!-- Status + Priority -->
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border"
              :class="focusedDoc.tracking_status === 'IN_TRANSIT' || focusedDoc.tracking_status === 'PICKED_UP'
                ? 'border-candy-orange/30 bg-candy-orange/10 text-candy-orange'
                : 'border-success/30 bg-success/10 text-success'"
            >
              {{ focusedDoc.tracking_status === 'IN_TRANSIT' ? 'On the Way' : focusedDoc.tracking_status === 'PICKED_UP' ? 'Awaiting Scan' : 'Ready for Pickup' }}
            </span>

            <span
              v-if="(focusedDoc.priority || '').toLowerCase().trim() === 'urgent' || (focusedDoc.priority || '').toLowerCase().trim() === 'high'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border"
              :class="getPriorityBadgeClass(focusedDoc.priority)"
            >
              <Icon name="ph:warning-fill" class="h-3 w-3" />
              {{ focusedDoc.priority }} Priority
            </span>
          </div>

          <!-- Action Banner -->
          <div class="flex items-center gap-3 rounded-xl border border-candy-orange/30 bg-candy-orange/10 px-4 py-3 text-sm font-semibold text-candy-orange">
            <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-candy-orange text-white-pure">
              <Icon :name="focusedScanMode === 'pickup' ? 'ph:hand-bold' : 'ph:buildings-bold'" class="h-4 w-4" />
            </span>
            <span v-if="focusedScanMode === 'pickup'">
              Pick up from <strong>{{ focusedDoc.origin_office_name || 'Origin Office' }}</strong>
            </span>
            <span v-else>
              Drop off at <strong>{{ focusedDoc.destination_office_name || 'Destination Office' }}</strong>
            </span>
          </div>

          <!-- Next Stop -->
          <div class="rounded-xl border-2 border-candy-orange/40 bg-candy-orange/5 p-4" :class="isDark ? 'bg-candy-orange/10' : ''">
            <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">
              Next Stop
            </p>
            <div class="mt-1.5 flex items-center gap-2">
              <Icon name="ph:map-pin-fill" class="h-5 w-5 text-candy-orange flex-shrink-0" />
              <p class="text-base font-bold truncate" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
                {{ focusedDoc.destination_office_name || 'Not yet assigned' }}
              </p>
            </div>
            <p v-if="focusedDoc.origin_office_name" class="mt-1 text-xs" :class="mutedClass">
              From: {{ focusedDoc.origin_office_name }}
            </p>
          </div>

          <!-- CTAs -->
          <div class="flex flex-col sm:flex-row items-stretch gap-3 pt-1">
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-candy-orange px-6 py-3.5 text-sm font-bold text-white-pure transition hover:bg-candy-hover active:scale-[0.99]"
              @click="goToScan(focusedDoc)"
            >
              <Icon name="ph:scan-fill" class="h-4 w-4" />
              {{ focusedScanMode === 'pickup' ? 'Scan Pickup' : 'Scan Drop-off' }}
            </button>

            <NuxtLink
              :to="`/messenger/delivery?document_id=${focusedDoc.id}`"
              class="inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3.5 text-sm font-semibold transition"
              :class="isDark ? 'border-onyx-border text-white-muted hover:bg-white/10 hover:text-white-pure' : 'border-zinc-200 text-gray-600 hover:bg-gray-100 hover:text-onyx-black'"
            >
              <Icon name="ph:arrow-square-out-light" class="h-4 w-4" />
              Details
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- ── Your Documents ── -->
      <section class="dashboard-card overflow-hidden">
        <!-- Header / Toggle -->
        <button
          type="button"
          class="w-full flex items-center justify-between p-5 text-left border-b transition"
          :class="isDark ? 'border-onyx-border hover:bg-white/5' : 'border-zinc-200 hover:bg-gray-50'"
          @click="manifestExpanded = !manifestExpanded"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-candy-orange/10 text-candy-orange">
              <Icon name="ph:list-bullets-bold" class="h-4 w-4" />
            </div>
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-sm" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
                Your Documents
              </h3>
              <span class="rounded-full bg-candy-orange/15 px-2 py-0.5 text-xs font-bold text-candy-orange">
                {{ allDocs.length }}
              </span>
            </div>
          </div>

          <Icon
            :name="manifestExpanded ? 'ph:caret-up-bold' : 'ph:caret-down-bold'"
            class="h-4 w-4 text-candy-orange transition-transform duration-200"
          />
        </button>

        <!-- Document Cards -->
        <div v-show="manifestExpanded" class="p-4 space-y-3">
          <div
            v-for="doc in allDocs"
            :key="doc.id"
            class="rounded-2xl border p-4 transition"
            :class="messengerStore.isFocused(doc.id)
              ? 'border-candy-orange bg-candy-orange/10'
              : (isDark ? 'border-onyx-border bg-onyx-card/60' : 'border-zinc-200 bg-white-surface')"
          >
            <!-- Status -->
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border"
                :class="doc.tracking_status === 'IN_TRANSIT' || doc.tracking_status === 'PICKED_UP'
                  ? 'border-candy-orange/30 bg-candy-orange/10 text-candy-orange'
                  : 'border-success/30 bg-success/10 text-success'"
              >
                {{ doc.tracking_status === 'IN_TRANSIT' ? 'On the Way' : doc.tracking_status === 'PICKED_UP' ? 'Awaiting Scan' : 'Ready for Pickup' }}
              </span>
              <span
                v-if="messengerStore.isFocused(doc.id)"
                class="inline-flex items-center gap-1 rounded-full bg-candy-orange px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white-pure"
              >
                <Icon name="ph:crosshair-bold" class="h-3 w-3" />
                Current
              </span>
            </div>

            <!-- Title -->
            <h4 class="mt-2.5 font-bold text-[15px] leading-snug" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
              {{ doc.title }}
            </h4>

            <!-- Next stop -->
            <p class="mt-1 flex items-center gap-1.5 text-sm" :class="mutedClass">
              <Icon name="ph:map-pin-fill" class="h-4 w-4 flex-shrink-0 text-candy-orange" />
              <span class="truncate">{{ doc.destination_office_name || 'Destination not set' }}</span>
            </p>

            <!-- Actions -->
            <div class="mt-3.5 flex items-center gap-2">
              <button
                v-if="!messengerStore.isFocused(doc.id)"
                type="button"
                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-candy-orange bg-candy-orange/10 px-3.5 py-3 text-sm font-bold text-candy-orange transition hover:bg-candy-orange hover:text-white-pure active:scale-[0.98]"
                @click="messengerStore.setFocus(doc.id, doc)"
              >
                <Icon name="ph:crosshair-bold" class="h-4 w-4" />
                Select
              </button>

              <button
                v-else
                type="button"
                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-candy-orange/50 bg-candy-orange/20 px-3.5 py-3 text-sm font-bold text-candy-orange transition hover:bg-candy-orange/30"
                title="Clear current delivery focus"
                @click="messengerStore.clearFocus()"
              >
                <Icon name="ph:x-circle-bold" class="h-4 w-4" />
                Clear
              </button>

              <NuxtLink
                :to="`/messenger/delivery?document_id=${doc.id}`"
                class="inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-3 text-sm font-semibold transition"
                :class="isDark ? 'border-onyx-border text-white-muted hover:bg-white/10 hover:text-white-pure' : 'border-zinc-200 text-gray-600 hover:bg-gray-100 hover:text-onyx-black'"
                title="View delivery details"
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
const custody = ref<{ in_transit: CustodyDocument[]; awaiting_scan: CustodyDocument[]; assigned_pending_pickup: CustodyDocument[] }>({
  in_transit: [],
  awaiting_scan: [],
  assigned_pending_pickup: [],
})

const allDocs = computed(() => [
  ...custody.value.assigned_pending_pickup,
  ...custody.value.in_transit,
  ...custody.value.awaiting_scan,
])

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
    return 'border-warning/40 bg-warning/10 text-warning'
  }
  if (p === 'low') {
    return 'border-zinc-400/30 bg-zinc-400/10 text-zinc-500'
  }
  return 'border-zinc-400/30 bg-zinc-400/10 text-zinc-500'
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
      data?: { in_transit: CustodyDocument[]; awaiting_scan: CustodyDocument[]; assigned_pending_pickup: CustodyDocument[] }
    }>('/api/tracking/custody', { credentials: 'include' })

    custody.value = {
      in_transit: Array.isArray(res?.data?.in_transit) ? res.data.in_transit : [],
      awaiting_scan: Array.isArray(res?.data?.awaiting_scan) ? res.data.awaiting_scan : [],
      assigned_pending_pickup: Array.isArray(res?.data?.assigned_pending_pickup) ? res.data.assigned_pending_pickup : [],
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
    custody.value = { in_transit: [], awaiting_scan: [], assigned_pending_pickup: [] }
  } finally {
    loading.value = false
  }
})
</script>
