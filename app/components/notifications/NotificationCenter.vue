<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <p class="text-xs" :class="mutedClass">
        {{ unreadCount }} unread notification{{ unreadCount === 1 ? '' : 's' }}
      </p>
      <button
        type="button"
        class="rounded-lg border px-3 py-1 text-xs font-semibold transition hover:opacity-80"
        :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
        :disabled="loading"
        @click="fetchNotifications(true)"
      >
        Refresh
      </button>
    </div>

    <div v-if="loading && notifications.length === 0" class="py-8 text-center text-sm" :class="mutedClass">
      Loading notifications…
    </div>
    <div v-else-if="error" class="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">
      {{ error }}
    </div>
    <div v-else-if="notifications.length === 0" class="rounded-xl border border-dashed px-4 py-10 text-center text-sm" :class="emptyClass">
      No deliveries assigned to you yet. An office will assign you directly when there's one ready.
    </div>

    <ul v-else class="space-y-3">
      <li
        v-for="item in notifications"
        :key="item.id"
        class="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
        :class="isDark ? 'border-onyx-border bg-onyx-card/30' : 'border-gray-200 bg-white'"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold truncate" :class="isDark ? 'text-white' : 'text-gray-900'">{{ item.title }}</p>
          <p v-if="item.message" class="mt-0.5 text-xs" :class="mutedClass">{{ item.message }}</p>
          <time class="mt-1 block text-[14px]" :class="mutedClass">{{ formatWhen(item.created_at) }}</time>
        </div>
        <button
          v-if="isUnreadNotification(item.is_read)"
          type="button"
          class="flex-shrink-0 rounded-lg bg-candy-orange px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          :disabled="markingId === item.id"
          @click="markAsRead(item.id)"
        >
          {{ markingId === item.id ? 'Marking…' : 'Mark Read' }}
        </button>
        <span
          v-else
          class="flex-shrink-0 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
        >
          Read
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { isUnreadNotification } from '~/composables/useNotifications'

const { isDark } = useTheme()
const {
  notifications,
  unreadCount,
  loading,
  error,
  markingId,
  fetchNotifications,
  markAsRead,
  startAutoRefresh,
} = useMessengerNotifications()

const mutedClass = computed(() => (isDark.value ? 'text-gray-500' : 'text-gray-400'))
const emptyClass = computed(() =>
  isDark.value ? 'border-onyx-border text-gray-500' : 'border-gray-200 text-gray-400',
)

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

onMounted(async () => {
  await fetchNotifications(true)
  startAutoRefresh(15000)
})
</script>
