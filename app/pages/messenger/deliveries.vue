<template>
  <div class="space-y-6 pb-24 md:pb-8">
    <div>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:package-light" class="h-4 w-4 text-candy-orange" />
        <span>Messenger Portal</span>
        <Icon name="ph:caret-right-light" class="h-3 w-3" />
        <span class="font-medium" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">Deliveries</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
        Active Deliveries
      </h1>
      <p class="mt-1 text-sm" :class="mutedClass">
        Open a live transit run to view route vectors and process drop-offs.
      </p>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="n in 3" :key="n" class="dashboard-card h-28 animate-pulse" :class="skeletonClass" />
    </div>

    <div
      v-else-if="!allDocs.length"
      class="dashboard-card rounded-none border border-dashed p-10 text-center text-sm"
      :class="isDark ? 'border-onyx-border text-white-muted' : 'border-zinc-200 text-gray-400'"
    >
      No active deliveries in your custody. Accept a pickup from notifications to begin.
    </div>

    <div v-else class="space-y-3">
      <NuxtLink
        v-for="doc in allDocs"
        :key="doc.id"
        :to="`/messenger/delivery?document_id=${doc.id}`"
        class="dashboard-card flex flex-col gap-2 border p-5 transition hover:-translate-y-0.5 hover:border-candy-orange"
        :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white-pure'"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="font-semibold" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">{{ doc.title }}</p>
          <span
            class="flex-shrink-0 rounded-none px-2 py-0.5 text-[10px] font-bold uppercase"
            :class="doc.tracking_status === 'IN_TRANSIT' ? 'bg-transparent text-candy-orange' : 'bg-amber-500/10 text-amber-500'"
          >
            {{ doc.tracking_status === 'IN_TRANSIT' ? 'In Transit' : 'Awaiting Scan' }}
          </span>
        </div>
        <p class="font-mono text-[10px]" :class="mutedClass">{{ doc.tracking_id }}</p>
        <p class="text-xs" :class="mutedClass">
          Next: {{ doc.destination_office_name || '—' }}
        </p>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CustodyDocument } from '~/components/messenger/MessengerCustodyDrawer.vue'

definePageMeta({ layout: 'messenger' })

const { isDark } = useTheme()

const loading = ref(true)
const custody = ref<{ in_transit: CustodyDocument[]; awaiting_scan: CustodyDocument[] }>({
  in_transit: [],
  awaiting_scan: [],
})

const allDocs = computed(() => [...custody.value.in_transit, ...custody.value.awaiting_scan])
const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))
const skeletonClass = computed(() => (isDark.value ? 'bg-onyx-card' : 'bg-gray-200'))

onMounted(async () => {
  try {
    const res = await $fetch<{
      success: boolean
      data: { in_transit: CustodyDocument[]; awaiting_scan: CustodyDocument[] }
    }>('/api/tracking/custody', { credentials: 'include' })
    custody.value = res.data ?? { in_transit: [], awaiting_scan: [] }
  } catch {
    custody.value = { in_transit: [], awaiting_scan: [] }
  } finally {
    loading.value = false
  }
})
</script>
