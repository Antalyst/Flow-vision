<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
          <Icon name="ph:bell-fill" class="h-4 w-4 text-amber-500" />
          <span>Messenger Portal</span>
          <Icon name="ph:caret-right" class="h-3 w-3" />
          <span class="font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Notifications</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">Pickup Queue</h1>
        <p class="mt-1 text-sm" :class="mutedClass">Accept a pickup before scanning the document QR.</p>
      </div>
      <NuxtLink
        to="/messenger/scan"
        class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
      >
        <Icon name="ph:scan-fill" class="h-4 w-4" />
        Open Scanner
      </NuxtLink>
    </div>

    <div class="dashboard-card p-5 sm:p-6">
      <div class="mb-4 flex items-center justify-between gap-3">
        <p class="text-xs" :class="mutedClass">
          {{ notificationsList.length }} open pickup{{ notificationsList.length === 1 ? '' : 's' }}
        </p>
        <button
          type="button"
          class="rounded-lg border px-3 py-1 text-xs font-semibold transition hover:opacity-80"
          :class="isDark ? 'border-zinc-700 text-zinc-300' : 'border-gray-200 text-gray-600'"
          :disabled="loading"
          @click="refreshQueue"
        >
          Refresh
        </button>
      </div>

      <div v-if="loading && notificationsList.length === 0" class="py-10 text-center text-sm" :class="mutedClass">
        Loading notifications…
      </div>

      <div
        v-else-if="error"
        class="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500"
      >
        {{ error }}
      </div>

      <div
        v-else-if="notificationsList.length === 0"
        class="rounded-xl border border-dashed px-4 py-10 text-center text-sm"
        :class="isDark ? 'border-zinc-700 text-zinc-500' : 'border-gray-200 text-gray-400'"
      >
        No pickup requests right now. New uploads from your organisation will appear here.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="notif in notificationsList"
          :key="notif.id"
          class="flex flex-col gap-4 rounded-xl border p-5 md:flex-row md:items-center md:justify-between"
          :class="isDark ? 'border-zinc-800 bg-[#1e1e24]' : 'border-gray-200 bg-white'"
        >
          <div class="flex-1 min-w-0">
            <div class="mb-1 flex items-center gap-2">
              <span class="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <h4 class="truncate text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ notif.title }}
              </h4>
            </div>
            <p class="text-sm leading-relaxed" :class="isDark ? 'text-zinc-400' : 'text-gray-500'">
              {{ notif.message }}
            </p>
            <div
              v-if="notif.metadata?.pickup_source_name || notif.metadata?.destination_office_name"
              class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <div
                class="rounded-lg border px-3 py-2"
                :class="isDark ? 'border-zinc-700 bg-zinc-900/50' : 'border-gray-100 bg-gray-50'"
              >
                <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">Pickup Source</p>
                <p class="mt-0.5 text-xs font-semibold" :class="isDark ? 'text-white' : 'text-gray-800'">
                  {{ notif.metadata?.pickup_source_name || '—' }}
                </p>
              </div>
              <div
                class="rounded-lg border px-3 py-2"
                :class="isDark ? 'border-zinc-700 bg-zinc-900/50' : 'border-gray-100 bg-gray-50'"
              >
                <p class="text-[10px] font-bold uppercase tracking-wider text-candy-orange">Next Drop-off</p>
                <p class="mt-0.5 text-xs font-semibold" :class="isDark ? 'text-white' : 'text-gray-800'">
                  {{ notif.metadata?.destination_office_name || '—' }}
                </p>
              </div>
            </div>
            <span class="mt-2 block text-xs" :class="isDark ? 'text-zinc-500' : 'text-gray-400'">
              Received: {{ formatReceived(notif.created_at) }}
            </span>
          </div>

          <div class="flex items-center">
            <button
              type="button"
              class="w-full rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors duration-200 hover:bg-amber-600 disabled:opacity-50 md:w-auto"
              :disabled="claimingId === notif.id"
              @click="claimPickup(notif)"
            >
              {{ claimingId === notif.id ? 'Accepting…' : 'Accept Pickup' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NotificationRow } from '~/composables/useNotifications'

definePageMeta({ layout: 'messenger' })

const { isDark } = useTheme()
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

const notificationsState = useState<NotificationRow[]>('messenger:notifications', () => [])
const loadingState = useState('messenger:notifications-loading', () => false)
const errorState = useState<string | null>('messenger:notifications-error', () => null)
const claimingIdState = useState<string | null>('messenger:notifications-claiming', () => null)

const { fetchNotifications, acceptPickup, startAutoRefresh } = useMessengerNotifications()

const notificationsList = computed(() => notificationsState.value ?? [])
const loading = computed(() => loadingState.value)
const error = computed(() => errorState.value)
const claimingId = computed(() => claimingIdState.value)

function formatReceived(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

async function refreshQueue() {
  await fetchNotifications(true)
}

async function claimPickup(notif: NotificationRow) {
  await acceptPickup(notif.id)
}

onMounted(async () => {
  await fetchNotifications(true)
  startAutoRefresh(15000)
})
</script>
