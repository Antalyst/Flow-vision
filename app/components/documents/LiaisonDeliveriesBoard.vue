<template>
  <section class="w-full max-w-[1400px] mx-auto space-y-6 pb-24 lg:pb-8 font-dashboard animate-fade-in" :class="isDark ? 'text-white' : 'text-onyx-black'">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange mb-1">Messenger</p>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">My Deliveries</h1>
        <p class="mt-1 text-sm" :class="mutedTextClass">
          Documents assigned to you to pick up or deliver. An office assigns you directly — there's nothing to accept.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <NuxtLink
          :to="`${scanBasePath}?mode=pickup`"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white dark:bg-onyx-card border px-4 py-2 font-medium transition duration-200 hover:bg-gray-50 dark:hover:bg-white/5"
          :class="isDark ? 'border-onyx-border text-white' : 'border-gray-200 text-onyx-black'"
        >
          <Icon name="ph:scan-bold" class="h-4 w-4 text-candy-orange" />
          Pickup Scan
        </NuxtLink>
        <NuxtLink
          :to="`${scanBasePath}?mode=dropoff`"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-2 font-medium text-white shadow-sm shadow-candy-orange/20 transition duration-200 hover:bg-candy-hover"
        >
          <Icon name="ph:map-pin-bold" class="h-4 w-4" />
          Drop-off Scan
        </NuxtLink>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="n in 3" :key="n" class="dashboard-card h-36 animate-pulse border" :class="skeletonClass" />
    </div>

    <div
      v-else-if="!allDocs.length"
      class="dashboard-card rounded-2xl border border-dashed p-12 text-center text-sm"
      :class="isDark ? 'border-onyx-border text-white-muted' : 'border-zinc-200 text-gray-400'"
    >
      <Icon name="ph:package-light" class="mx-auto mb-3 h-12 w-12 text-candy-orange" />
      <p class="font-bold text-base" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">No Deliveries Assigned to You</p>
      <p class="mt-1 text-xs" :class="mutedTextClass">
        When an office assigns you as messenger for a document, it appears here — ready for pickup right away.
      </p>
    </div>

    <div v-else class="space-y-6">
      <section v-for="group in groupedSections" :key="group.key" v-show="group.docs.length">
        <h2 class="mb-3 text-sm font-bold uppercase tracking-wide" :class="mutedTextClass">{{ group.title }}</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="doc in group.docs"
            :key="doc.id"
            class="dashboard-card border p-4"
            :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
          >
            <div class="mb-2 flex items-start justify-between gap-2">
              <p class="line-clamp-2 text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ doc.title }}
              </p>
              <span class="flex-shrink-0 rounded-full border px-2 py-0.5 text-[13px] font-bold uppercase" :class="group.badgeClass">
                {{ group.title }}
              </span>
            </div>
            <p class="font-mono text-[13px]" :class="mutedTextClass">{{ doc.tracking_id }}</p>
            <div class="mt-2 flex items-center gap-2 text-xs" :class="mutedTextClass">
              <Icon name="ph:map-pin-light" class="h-3.5 w-3.5 text-candy-orange" />
              <span class="truncate">Next: {{ doc.destination_office_name || '—' }}</span>
            </div>
            <p class="mt-1 text-[14px]" :class="mutedTextClass">Step {{ doc.current_step }} / {{ doc.total_steps || '—' }}</p>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

interface CustodyDoc {
  id: string
  title: string
  tracking_status: string
  tracking_id: string
  current_step: number
  total_steps: number
  origin_office_name?: string | null
  destination_office_name?: string | null
  priority?: string | null
}

withDefaults(defineProps<{
  /** Route to this portal's own scanner page — the only portal-specific piece. */
  scanBasePath: string
}>(), {
  scanBasePath: '/client/scan',
})

const { isDark } = useTheme()

const loading = ref(true)
const custody = ref<{ in_transit: CustodyDoc[]; awaiting_scan: CustodyDoc[]; assigned_pending_pickup: CustodyDoc[] }>({
  in_transit: [],
  awaiting_scan: [],
  assigned_pending_pickup: [],
})

const allDocs = computed(() => [
  ...custody.value.assigned_pending_pickup,
  ...custody.value.in_transit,
  ...custody.value.awaiting_scan,
])

const groupedSections = computed(() => [
  {
    key: 'ready',
    title: 'Ready for Pickup',
    docs: custody.value.assigned_pending_pickup,
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
  },
  {
    key: 'transit',
    title: 'On the Way',
    docs: custody.value.in_transit,
    badgeClass: 'border-candy-orange/30 bg-candy-orange/10 text-candy-orange',
  },
  {
    key: 'awaiting',
    title: 'Awaiting Scan',
    docs: custody.value.awaiting_scan,
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
  },
])

const mutedTextClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const skeletonClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-zinc-200 bg-gray-200'))

async function loadCustody() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data?: typeof custody.value }>('/api/tracking/custody', { credentials: 'include' })
    custody.value = {
      in_transit: res?.data?.in_transit ?? [],
      awaiting_scan: res?.data?.awaiting_scan ?? [],
      assigned_pending_pickup: res?.data?.assigned_pending_pickup ?? [],
    }
  } catch {
    custody.value = { in_transit: [], awaiting_scan: [], assigned_pending_pickup: [] }
  } finally {
    loading.value = false
  }
}

onMounted(loadCustody)
</script>
