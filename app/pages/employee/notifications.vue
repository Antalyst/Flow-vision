<template>
  <div ref="pageRoot" class="space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedClass">
          <Icon name="ph:bell-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Notifications</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          Inbound Alerts
        </h1>
        <p class="mt-1.5 text-sm" :class="mutedClass">
          Documents picked up by messengers and heading to your office station.
        </p>
      </div>
      <NuxtLink
        to="/employee/documents"
        class="inline-flex items-center gap-2 rounded-none bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
      >
        <Icon name="ph:files-light" class="h-4 w-4" />
        View Documents
      </NuxtLink>
    </div>

    <!-- ── Notification Panel ─────────────────────────────────────────── -->
    <div
      ref="panelEl"
      class="rounded-none border"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
    >
      <!-- Panel header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b"
        :class="isDark ? 'border-onyx-border' : 'border-gray-100'"
      >
        <div class="flex items-center gap-2.5">
          <span
            v-if="unreadCount > 0"
            class="flex h-6 min-w-[1.5rem] items-center justify-center rounded-none bg-candy-orange px-1.5 text-[10px] font-bold text-white"
          >
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
          <p class="text-xs font-medium" :class="mutedClass">
            {{ unreadCount === 0 ? 'All caught up' : `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-none border px-3.5 py-2 text-xs font-semibold transition-colors hover:border-candy-orange hover:text-candy-orange disabled:opacity-50"
          :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
          :disabled="loading"
          @click="refreshAlerts"
        >
          <Icon name="ph:arrows-clockwise-light" class="h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" />
          Refresh
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="loading && notifications.length === 0" class="px-6 py-16 text-center" :class="mutedClass">
        <Icon name="ph:spinner-gap-light" class="h-7 w-7 animate-spin mx-auto mb-3 text-candy-orange" />
        <p class="text-xs font-medium">Loading inbound alerts…</p>
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="m-5 rounded-none border border-red-500/30 bg-red-500/5 px-5 py-4 text-sm text-red-500"
      >
        {{ error }}
      </div>

      <!-- Empty state -->
      <div
        v-else-if="notifications.length === 0"
        class="flex flex-col items-center gap-4 px-6 py-16 text-center"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-none border"
          :class="isDark ? 'border-candy-orange/20 bg-candy-orange/10' : 'border-candy-orange/30 bg-candy-orange/5'">
          <Icon name="ph:bell-slash-light" class="h-8 w-8 text-candy-orange/50" />
        </div>
        <div>
          <p class="font-semibold text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">No inbound alerts right now</p>
          <p class="mt-1 text-xs max-w-[240px]" :class="mutedClass">
            You'll be notified when a messenger picks up a document for your office.
          </p>
        </div>
      </div>

      <!-- Notification list -->
      <div v-else ref="listEl" class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
        <div
          v-for="notif in notifications"
          :key="notif.id"
          class="flex flex-col gap-4 px-6 py-5 transition-colors md:flex-row md:items-center md:justify-between"
          :class="[
            isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50/80',
            !notif.is_read ? 'border-l-2 border-l-candy-orange bg-candy-orange/5' : ''
          ]"
        >
          <div class="flex items-start gap-4 min-w-0 flex-1">
            <!-- Icon -->
            <div
              class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-none border mt-0.5"
              :class="!notif.is_read 
                ? 'border-candy-orange/20 bg-candy-orange/10' 
                : isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'"
            >
              <Icon
                name="ph:motorcycle-light"
                class="h-4 w-4"
                :class="!notif.is_read ? 'text-candy-orange' : mutedClass"
              />
            </div>
            <!-- Content -->
            <div class="min-w-0 flex-1">
              <div class="mb-0.5 flex items-center gap-2">
                <span v-if="!notif.is_read" class="h-2 w-2 flex-shrink-0 rounded-none bg-candy-orange" />
                <h4 class="truncate text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ notif.title }}
                </h4>
              </div>
              <p class="text-xs leading-relaxed" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                {{ notif.message }}
              </p>
              <span class="mt-1.5 block text-[10px] font-medium" :class="isDark ? 'text-gray-600' : 'text-gray-400'">
                Received {{ formatReceived(notif.created_at) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <NuxtLink
              v-if="notif.document_id"
              :to="`/employee/documents?document=${notif.document_id}`"
              class="inline-flex items-center justify-center rounded-none border px-4 py-2 text-xs font-semibold transition-colors hover:border-candy-orange hover:text-candy-orange"
              :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-700'"
            >
              View Document
            </NuxtLink>
            <button
              v-if="isUnreadNotification(notif.is_read)"
              type="button"
              class="rounded-none bg-candy-orange px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
              :disabled="markingId === notif.id"
              @click="markAsRead(notif.id)"
            >
              {{ markingId === notif.id ? 'Saving…' : 'Mark Read' }}
            </button>
            <span
              v-else
              class="inline-flex items-center justify-center gap-1.5 rounded-none border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
            >
              <Icon name="ph:check-circle-light" class="h-3.5 w-3.5" />
              Read
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { gsap } from 'gsap'
import { isUnreadNotification } from '~/composables/useNotifications'

definePageMeta({ layout: 'employee' })

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
} = useEmployeeNotifications()

// GSAP refs
const pageRoot = ref<HTMLElement | null>(null)
const headerEl = ref<HTMLElement | null>(null)
const panelEl  = ref<HTMLElement | null>(null)
const listEl   = ref<HTMLElement | null>(null)

function formatReceived(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

async function refreshAlerts() {
  await fetchNotifications(true)
}

// ── GSAP Entrance ──────────────────────────────────────────────────────
const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) {
    tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  }
  if (panelEl.value) {
    tl.fromTo(panelEl.value, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.18)
  }
}

const animateNotifications = () => {
  if (!listEl.value) return
  const items = listEl.value.querySelectorAll(':scope > div')
  gsap.fromTo(items,
    { opacity: 0, x: -16 },
    { opacity: 1, x: 0, duration: 0.35, stagger: 0.06, ease: 'power3.out' }
  )
}

onMounted(async () => {
  runEntranceAnimation()
  await fetchNotifications(true)
  animateNotifications()
  startAutoRefresh(15000)
})
</script>
