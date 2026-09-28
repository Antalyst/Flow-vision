<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          Hello, {{ auth.user?.full_name?.split(' ')[0] || 'Messenger' }}!
        </h1>
        <p class="mt-1 text-sm" :class="mutedClass">
          Documents in your custody, ready to pick up or drop off.
        </p>
      </div>

      <div
        v-if="auth.currentOrg"
        class="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm"
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
        class="dashboard-card flex items-center gap-4 p-5"
      >
        <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-candy-orange/10">
          <Icon :name="card.icon" class="h-5 w-5 text-candy-orange" />
        </span>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider" :class="mutedClass">{{ card.label }}</p>
          <p class="mt-1 text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ card.value }}</p>
        </div>
      </div>
    </div>

    <section class="dashboard-card p-6">
      <div class="mb-5 flex items-center justify-between gap-3">
        <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
          Your Documents
        </h2>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
            :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
            :disabled="loading"
            @click="loadCustody(true)"
          >
            Refresh
          </button>
          <NuxtLink
            to="/messenger/scan?mode=dropoff"
            class="inline-flex items-center gap-1.5 rounded-lg bg-candy-orange px-3 py-1.5 text-xs font-bold text-white-pure transition hover:bg-candy-hover"
          >
            <Icon name="ph:scan-light" class="h-3.5 w-3.5" />
            Scan
          </NuxtLink>
        </div>
      </div>

      <div v-if="loading && !custody.in_transit.length" class="py-12 text-center text-sm" :class="mutedClass">
        Loading…
      </div>

      <div
        v-else-if="custody.in_transit.length === 0 && custody.awaiting_scan.length === 0"
        class="rounded-xl border border-dashed px-4 py-12 text-center text-sm"
        :class="isDark ? 'border-onyx-border text-gray-500' : 'border-gray-200 text-gray-400'"
      >
        No deliveries assigned to you yet. An office will assign you directly when there's one ready.
      </div>

      <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          v-for="doc in allCustodyDocs"
          :key="doc.id"
          type="button"
          class="flex flex-col gap-3 rounded-2xl border p-4 text-left transition"
          :class="isDark ? 'border-onyx-border bg-onyx-card/40 hover:border-candy-orange/50' : 'border-gray-200 bg-white hover:border-candy-orange/50'"
          @click="openDrawer(doc)"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="line-clamp-2 text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
              {{ doc.title }}
            </p>
            <span
              class="flex-shrink-0 rounded-full px-2 py-0.5 text-[13px] font-bold uppercase"
              :class="doc.tracking_status === 'IN_TRANSIT'
                ? 'bg-candy-orange/10 text-candy-orange'
                : doc.tracking_status === 'PICKED_UP'
                  ? 'bg-candy-orange/10 text-candy-orange'
                  : 'bg-emerald-500/10 text-emerald-500'"
            >
              {{ doc.tracking_status === 'IN_TRANSIT' ? 'On the Way' : doc.tracking_status === 'PICKED_UP' ? 'Awaiting Scan' : 'Ready for Pickup' }}
            </span>
          </div>
          <div class="flex items-center gap-2 text-xs" :class="mutedClass">
            <Icon name="ph:map-pin-light" class="h-3.5 w-3.5 text-candy-orange" />
            <span class="truncate">Next: {{ doc.destination_office_name || '—' }}</span>
          </div>
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
const { unreadCount, fetchNotifications } = useMessengerNotifications()

const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

const loading = ref(false)
const acting = ref(false)
const drawerOpen = ref(false)
const selectedDoc = ref<CustodyDocument | null>(null)

const custody = ref<{ in_transit: CustodyDocument[]; awaiting_scan: CustodyDocument[]; assigned_pending_pickup: CustodyDocument[] }>({
  in_transit: [],
  awaiting_scan: [],
  assigned_pending_pickup: [],
})

const allCustodyDocs = computed(() => [
  ...custody.value.assigned_pending_pickup,
  ...custody.value.in_transit,
  ...custody.value.awaiting_scan,
])

const kpiCards = computed(() => [
  {
    label: 'In Custody',
    value: String(custody.value.in_transit.length),
    icon: 'ph:package-fill',
  },
  {
    label: 'Assigned to You',
    value: String(custody.value.assigned_pending_pickup.length),
    icon: 'ph:hand-fill',
  },
  {
    label: 'Unread Notices',
    value: String(unreadCount.value),
    icon: 'ph:bell-fill',
  },
])

async function loadCustody(force = false) {
  if (loading.value && !force) return
  loading.value = true
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
  } catch (err) {
    console.warn('[MessengerDashboard] custody load error, defaulting to empty list:', err)
    custody.value = { in_transit: [], awaiting_scan: [], assigned_pending_pickup: [] }
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
