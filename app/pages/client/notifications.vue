<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
          <Icon name="ph:bell-fill" class="h-4 w-4 text-candy-orange" />
          <span>Client Portal</span>
          <Icon name="ph:caret-right" class="h-3 w-3" />
          <span class="font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Notifications</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">Document Updates</h1>
        <p class="mt-1 text-sm" :class="mutedClass">
          Status changes for your documents — pickups, transit, and arrivals.
        </p>
      </div>
      <NuxtLink
        to="/client/documents"
        class="inline-flex items-center gap-2 rounded-none bg-candy-orange px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        <Icon name="ph:files-fill" class="h-4 w-4" />
        View Documents
      </NuxtLink>
    </div>

    <div class="dashboard-card p-5 sm:p-6">
      <div class="mb-4 flex items-center justify-between gap-3">
        <p class="text-xs" :class="mutedClass">
          {{ unreadCount }} unread update{{ unreadCount === 1 ? '' : 's' }}
        </p>
        <button
          type="button"
          class="rounded-none border px-3 py-1 text-xs font-semibold transition hover:opacity-80"
          :class="isDark ? 'border-zinc-700 text-zinc-300' : 'border-gray-200 text-gray-600'"
          :disabled="loading"
          @click="refreshAlerts"
        >
          Refresh
        </button>
      </div>

      <div v-if="loading && notifications.length === 0" class="py-10 text-center text-sm" :class="mutedClass">
        Loading document updates…
      </div>

      <div
        v-else-if="error"
        class="rounded-none border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500"
      >
        {{ error }}
      </div>

      <div
        v-else-if="notifications.length === 0"
        class="rounded-none border border-dashed px-4 py-10 text-center text-sm"
        :class="isDark ? 'border-zinc-700 text-zinc-500' : 'border-gray-200 text-gray-400'"
      >
        No document updates right now. You will be notified when your documents change status.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="notif in notifications"
          :key="notif.id"
          class="flex flex-col gap-4 rounded-none border p-5 md:flex-row md:items-center md:justify-between"
          :class="isDark ? 'border-zinc-800 bg-[#1e1e24]' : 'border-gray-200 bg-white'"
        >
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center gap-2">
              <span
                v-if="isUnreadNotification(notif.is_read)"
                class="h-2 w-2 animate-pulse rounded-none bg-candy-orange"
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

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <NuxtLink
              v-if="notif.document_id"
              :to="`/client/documents?document=${notif.document_id}`"
              class="inline-flex items-center justify-center rounded-none border px-4 py-2 text-xs font-semibold transition hover:opacity-80"
              :class="isDark ? 'border-zinc-700 text-zinc-200' : 'border-gray-200 text-gray-700'"
            >
              View Document
            </NuxtLink>
            <button
              v-if="isUnreadNotification(notif.is_read)"
              type="button"
              class="rounded-none bg-candy-orange px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              :disabled="markingId === notif.id"
              @click="markAsRead(notif.id)"
            >
              {{ markingId === notif.id ? 'Saving…' : 'Mark Read' }}
            </button>
            <span
              v-else
              class="inline-flex items-center justify-center rounded-none bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
            >
              Read
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isUnreadNotification } from '~/composables/useNotifications'

definePageMeta({ layout: 'client' })

const { isDark } = useTheme()
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

const {
  notifications,
  unreadCount,
  loading,
  error,
  markingId,
  fetchNotifications,
  markAsRead,
  startAutoRefresh,
} = useClientNotifications()

const { refresh: refreshBadge } = useClientNotificationBadge()

function formatReceived(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

async function refreshAlerts() {
  await fetchNotifications(true)
  await refreshBadge()
}

onMounted(async () => {
  await fetchNotifications(true)
  await refreshBadge()
  startAutoRefresh(15000)
})
</script>
