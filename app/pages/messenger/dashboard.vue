<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
          <Icon name="ph:squares-four-light" class="h-4 w-4 text-candy-orange" />
          <span>Messenger Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3" />
          <span class="font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Dashboard</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          Hello, {{ auth.user?.full_name?.split(' ')[0] || 'Messenger' }}!
        </h1>
        <p class="mt-1 text-sm" :class="mutedClass">
          Manage documents in your custody and plan your next route leg.
        </p>
      </div>

      <div
        v-if="auth.currentOrg"
        class="inline-flex items-center gap-2 rounded-none border px-4 py-2.5 text-sm"
        :class="isDark ? 'border-onyx-border bg-onyx-card text-gray-300' : 'border-gray-200 bg-white text-gray-700'"
      >
        <Icon name="ph:buildings-light" class="h-4 w-4 text-candy-orange" />
        <span class="font-semibold">{{ auth.currentOrg.name }}</span>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <div
        v-for="card in kpiCards"
        :key="card.label"
        class="dashboard-card flex items-start gap-4 p-5"
      >
        <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none" :class="card.iconBg">
          <Icon :name="card.icon" class="h-5 w-5" :class="card.iconColor" />
        </span>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider" :class="mutedClass">{{ card.label }}</p>
          <p class="mt-1 text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ card.value }}</p>
        </div>
      </div>
    </div>

    <section class="dashboard-card p-6">
      <div class="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
            Documents in Your Custody
          </h2>
          <p class="mt-0.5 text-xs" :class="mutedClass">
            {{ custody.in_transit.length }} in transit
            <span v-if="custody.awaiting_scan.length"> · {{ custody.awaiting_scan.length }} awaiting scan</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-none border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
            :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
            :disabled="loading"
            @click="loadCustody(true)"
          >
            Refresh
          </button>
          <NuxtLink
            to="/messenger/scan?mode=dropoff"
            class="inline-flex items-center gap-1.5 rounded-none bg-candy-orange px-3 py-1.5 text-xs font-bold text-white-pure transition hover:bg-opacity-90"
          >
            <Icon name="ph:scan-light" class="h-3.5 w-3.5" />
            Scanner
          </NuxtLink>
        </div>
      </div>

      <div v-if="loading && !custody.in_transit.length" class="py-12 text-center text-sm" :class="mutedClass">
        Loading custody inventory…
      </div>

      <div
        v-else-if="custody.in_transit.length === 0 && custody.awaiting_scan.length === 0"
        class="rounded-none border border-dashed px-4 py-12 text-center text-sm"
        :class="isDark ? 'border-onyx-border text-gray-500' : 'border-gray-200 text-gray-400'"
      >
        No documents in your custody. Accept a pickup from notifications to begin.
      </div>

      <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          v-for="doc in allCustodyDocs"
          :key="doc.id"
          type="button"
          class="flex flex-col gap-3 rounded-none border p-4 text-left transition hover:-translate-y-0.5 hover:"
          :class="isDark ? 'border-onyx-border bg-onyx-card/40 hover:border-candy-orange' : 'border-gray-200 bg-white hover:border-candy-orange'"
          @click="openDrawer(doc)"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="line-clamp-2 text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
              {{ doc.title }}
            </p>
            <span
              class="flex-shrink-0 rounded-none px-2 py-0.5 text-[13px] font-bold uppercase"
              :class="doc.tracking_status === 'IN_TRANSIT'
                ? 'bg-transparent text-candy-orange'
                : 'bg-amber-500/10 text-amber-500'"
            >
              {{ doc.tracking_status === 'IN_TRANSIT' ? 'In Transit' : 'Awaiting Scan' }}
            </span>
          </div>
          <p class="font-mono text-[13px]" :class="mutedClass">{{ doc.tracking_id }}</p>
          <div class="flex items-center gap-2 text-xs" :class="mutedClass">
            <Icon name="ph:map-pin-light" class="h-3.5 w-3.5 text-candy-orange" />
            <span class="truncate">Next: {{ doc.destination_office_name || '—' }}</span>
          </div>
          <p class="text-[14px]" :class="mutedClass">Step {{ doc.current_step }} / {{ doc.total_steps || '—' }}</p>
        </button>
      </div>
    </section>

    <MessengerCustodyDrawer
      :is-open="drawerOpen"
      :document="selectedDoc"
      :acting="acting"
      @close="drawerOpen = false"
      @confirm-pickup="handleConfirmPickup"
      @process-dropoff="handleProcessDropoff"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import MessengerCustodyDrawer, { type CustodyDocument } from '~/components/messenger/MessengerCustodyDrawer.vue'

definePageMeta({ layout: 'messenger' })

const auth = useAuthStore()
const { isDark } = useTheme()
const router = useRouter()
const { unclaimedCount, fetchNotifications } = useMessengerNotifications()

const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

const loading = ref(false)
const acting = ref(false)
const drawerOpen = ref(false)
const selectedDoc = ref<CustodyDocument | null>(null)

const custody = ref<{ in_transit: CustodyDocument[]; awaiting_scan: CustodyDocument[] }>({
  in_transit: [],
  awaiting_scan: [],
})

const allCustodyDocs = computed(() => [...custody.value.in_transit, ...custody.value.awaiting_scan])

const kpiCards = computed(() => [
  {
    label: 'In Custody',
    value: String(custody.value.in_transit.length),
    icon: 'ph:package-fill',
    iconBg: 'bg-transparent',
    iconColor: 'text-candy-orange',
  },
  {
    label: 'Awaiting Scan',
    value: String(custody.value.awaiting_scan.length),
    icon: 'ph:hand-fill',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
  },
  {
    label: 'Open Pickups',
    value: String(unclaimedCount.value),
    icon: 'ph:bell-fill',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
  },
])

async function loadCustody(force = false) {
  if (loading.value && !force) return
  loading.value = true
  try {
    const res = await $fetch<{
      success: boolean
      data?: { in_transit: CustodyDocument[]; awaiting_scan: CustodyDocument[] }
    }>('/api/tracking/custody', { credentials: 'include' })
    custody.value = {
      in_transit: Array.isArray(res?.data?.in_transit) ? res.data.in_transit : [],
      awaiting_scan: Array.isArray(res?.data?.awaiting_scan) ? res.data.awaiting_scan : [],
    }
  } catch (err) {
    console.warn('[MessengerDashboard] custody load error, defaulting to empty list:', err)
    custody.value = { in_transit: [], awaiting_scan: [] }
  } finally {
    loading.value = false
  }
}

function openDrawer(doc: CustodyDocument) {
  router.push({ path: '/messenger/delivery', query: { document_id: doc.id } })
}

async function handleConfirmPickup(doc: CustodyDocument) {
  acting.value = true
  try {
    await $fetch('/api/tracking/pickup', {
      method: 'POST',
      body: { document_id: doc.id },
      credentials: 'include',
    })
    drawerOpen.value = false
    await loadCustody(true)
  } catch (err: any) {
    alert(err?.data?.message || 'Failed to confirm pickup')
  } finally {
    acting.value = false
  }
}

function handleProcessDropoff(doc: CustodyDocument) {
  drawerOpen.value = false
  router.push({ path: '/messenger/delivery', query: { document_id: doc.id } })
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await Promise.all([loadCustody(true), fetchNotifications(true)])
})
</script>
