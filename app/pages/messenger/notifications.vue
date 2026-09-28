<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">Notifications</h1>
        <p class="mt-1 text-sm" :class="mutedClass">
          Documents assigned directly to you.
        </p>
      </div>
      <NuxtLink
        to="/messenger/deliveries"
        class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-candy-hover"
      >
        <Icon name="ph:package-light" class="h-4 w-4" />
        Deliveries
      </NuxtLink>
    </div>

    <div class="dashboard-card p-5 sm:p-6">
      <div v-if="unreadCount > 0" class="mb-4 flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border px-3 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
          :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
          :disabled="markingAll"
          @click="markAllAsRead"
        >
          {{ markingAll ? 'Marking…' : 'Mark All Read' }}
        </button>
      </div>

      <div v-if="loading && notificationsList.length === 0" class="py-10 text-center text-sm" :class="mutedClass">
        Loading…
      </div>

      <div
        v-else-if="error"
        class="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger"
      >
        {{ error }}
      </div>

      <div
        v-else-if="notificationsList.length === 0"
        class="rounded-xl border border-dashed px-4 py-10 text-center text-sm"
        :class="isDark ? 'border-onyx-border text-gray-500' : 'border-gray-200 text-gray-400'"
      >
        No deliveries assigned to you yet. An office will assign you directly when there's a document ready.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="notif in notificationsList"
          :key="notif.id"
          class="flex items-center gap-4 rounded-xl border p-4"
          :class="isDark ? 'border-onyx-border bg-onyx-card/40' : 'border-gray-200 bg-white'"
        >
          <span
            class="h-2 w-2 flex-shrink-0 rounded-full"
            :class="isUnreadNotification(notif.is_read) ? 'animate-pulse bg-candy-orange' : 'bg-emerald-500'"
          />

          <div class="min-w-0 flex-1">
            <h4 class="truncate text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
              {{ notif.title }}
            </h4>
            <p class="mt-0.5 truncate text-xs" :class="mutedClass">
              {{ notif.message }}
            </p>
          </div>

          <button
            v-if="isUnreadNotification(notif.is_read)"
            type="button"
            class="flex-shrink-0 rounded-lg bg-candy-orange px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-candy-hover disabled:opacity-50"
            :disabled="markingId === notif.id"
            @click="markAsRead(notif.id)"
          >
            {{ markingId === notif.id ? '…' : 'Mark Read' }}
          </button>
          <NuxtLink
            v-else
            to="/messenger/deliveries"
            class="flex-shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-500/20"
          >
            View
          </NuxtLink>
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

onMounted(async () => {
  await fetchNotifications(true)
  startAutoRefresh(15000)
})
</script>
