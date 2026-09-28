<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
          <Icon name="ph:bell-light" class="h-4 w-4 text-amber-500" />
          <span>Messenger Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3" />
          <span class="font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Notifications</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">Assignment Notices</h1>
        <p class="mt-1 text-sm" :class="mutedClass">
          Documents an office has assigned directly to you. Nothing to accept — open Deliveries to scan.
        </p>
      </div>
      <NuxtLink
        to="/messenger/deliveries"
        class="inline-flex items-center gap-2 rounded-none bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
      >
        <Icon name="ph:package-light" class="h-4 w-4" />
        My Deliveries
      </NuxtLink>
    </div>

    <div class="dashboard-card p-5 sm:p-6">
      <div class="mb-4 flex items-center justify-between gap-3">
        <p class="text-xs" :class="mutedClass">
          {{ notificationsList.length }} notification{{ notificationsList.length === 1 ? '' : 's' }}
        </p>
        <div class="flex items-center gap-2">
          <button
            v-if="unreadCount > 0"
            type="button"
            class="rounded-none border px-3 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
            :class="isDark ? 'border-zinc-700 text-zinc-300' : 'border-gray-200 text-gray-600'"
            :disabled="markingAll"
            @click="markAllAsRead"
          >
            {{ markingAll ? 'Marking…' : 'Mark All Read' }}
          </button>
          <button
            type="button"
            class="rounded-none border px-3 py-1 text-xs font-semibold transition hover:opacity-80"
            :class="isDark ? 'border-zinc-700 text-zinc-300' : 'border-gray-200 text-gray-600'"
            :disabled="loading"
            @click="refreshList"
          >
            Refresh
          </button>
        </div>
      </div>

      <div v-if="loading && notificationsList.length === 0" class="py-10 text-center text-sm" :class="mutedClass">
        Loading notifications…
      </div>

      <div
        v-else-if="error"
        class="rounded-none border border-red-500 bg-transparent px-4 py-3 text-sm text-red-500"
      >
        {{ error }}
      </div>

      <div
        v-else-if="notificationsList.length === 0"
        class="rounded-none border border-dashed px-4 py-10 text-center text-sm"
        :class="isDark ? 'border-zinc-700 text-zinc-500' : 'border-gray-200 text-gray-400'"
      >
        No deliveries assigned to you yet. An office will assign you directly when there's a document ready.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="notif in notificationsList"
          :key="notif.id"
          class="flex flex-col gap-4 rounded-none border p-5 md:flex-row md:items-center md:justify-between"
          :class="isDark ? 'border-zinc-800 bg-[#1e1e24]' : 'border-gray-200 bg-white'"
        >
          <div class="flex-1 min-w-0">
            <div class="mb-1 flex items-center gap-2">
              <span
                class="h-2 w-2 rounded-none"
                :class="isUnreadNotification(notif.is_read) ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'"
              />
              <h4 class="truncate text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ notif.title }}
              </h4>
            </div>
            <p class="text-sm leading-relaxed" :class="isDark ? 'text-zinc-400' : 'text-gray-500'">
              {{ notif.message }}
            </p>
            <span class="mt-2 block text-xs" :class="isDark ? 'text-zinc-500' : 'text-gray-400'">
              Received: {{ formatReceived(notif.created_at) }}
            </span>
          </div>

          <div class="flex items-center">
            <button
              v-if="isUnreadNotification(notif.is_read)"
              type="button"
              class="w-full rounded-none bg-amber-500 px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors duration-200 hover:bg-amber-600 disabled:opacity-50 md:w-auto"
              :disabled="markingId === notif.id"
              @click="markAsRead(notif.id)"
            >
              {{ markingId === notif.id ? 'Marking…' : 'Mark Read' }}
            </button>
            <NuxtLink
              v-else
              to="/messenger/deliveries"
              class="w-full rounded-none border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-500/20 md:w-auto"
            >
              View Delivery
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NotificationRow } from '~/composables/useNotifications'
import { isUnreadNotification } from '~/composables/useNotifications'

definePageMeta({ layout: 'messenger' })

const { isDark } = useTheme()
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

const notificationsState = useState<NotificationRow[]>('messenger:notifications', () => [])
const loadingState = useState('messenger:notifications-loading', () => false)
const errorState = useState<string | null>('messenger:notifications-error', () => null)
const markingIdState = useState<string | null>('messenger:notifications-marking', () => null)
const markingAllState = useState('messenger:notifications-marking-all', () => false)

const { fetchNotifications, markAsRead, markAllAsRead, startAutoRefresh } = useMessengerNotifications()

const notificationsList = computed(() => notificationsState.value ?? [])
const loading = computed(() => loadingState.value)
const error = computed(() => errorState.value)
const markingId = computed(() => markingIdState.value)
const markingAll = computed(() => markingAllState.value)
const unreadCount = computed(() => notificationsList.value.filter((n) => isUnreadNotification(n.is_read)).length)

function formatReceived(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

async function refreshList() {
  await fetchNotifications(true)
}

onMounted(async () => {
  await fetchNotifications(true)
  startAutoRefresh(15000)
})
</script>
