<template>
  <div>
    <div v-for="(group, gIndex) in navGroups" :key="group.title" :class="gIndex > 0 ? 'mt-2.5' : ''">
      <p v-if="!minimized" class="px-4 mb-1 text-sm font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-400' : 'text-white-muted'">{{ group.title }}</p>
      <div v-else class="h-3 border-t mb-1 mx-4" :class="isDark ? 'border-onyx-border' : 'border-gray-200'"></div>

      <div class="space-y-0">
        <NuxtLink v-for="item in group.items" :key="item.to" :to="item.to"
          class="nav-item w-full relative rounded-lg mx-2"
          :class="[isActive(item.to) ? 'nav-item-active' : '', minimized ? 'justify-center px-0 mx-0' : 'px-3 py-2']"
          :title="minimized ? item.label : undefined">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span v-if="!minimized" class="truncate">{{ item.label }}</span>

          <span
            v-if="!minimized && item.to === '/client/notifications' && unreadCount > 0"
            class="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-candy-orange px-1.5 text-sm font-bold text-white"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>

          <span
            v-if="!minimized && item.to === '/client/messages' && chatUnreadCount > 0"
            class="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-sm font-bold text-white"
          >
            {{ chatUnreadCount > 9 ? '9+' : chatUnreadCount }}
          </span>

          <span
            v-if="!minimized && item.to === '/client/reports' && reportUnreadCount > 0"
            class="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-candy-orange px-1.5 text-sm font-bold text-white"
          >
            {{ reportUnreadCount > 9 ? '9+' : reportUnreadCount }}
          </span>

          <div v-if="minimized && item.to === '/client/notifications' && unreadCount > 0" class="absolute top-2 right-2 w-2 h-2 bg-candy-orange rounded-full"></div>
          <div v-if="minimized && item.to === '/client/messages' && chatUnreadCount > 0" class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
          <div v-if="minimized && item.to === '/client/reports' && reportUnreadCount > 0" class="absolute top-2 right-2 w-2 h-2 bg-candy-orange rounded-full"></div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  minimized: { type: Boolean, default: false }
})

import { useChatStore } from '~/stores/chat'

const { isDark } = useTheme()
const route = useRoute()
const { count: unreadCount, refresh: refreshUnreadCount } = useClientNotificationBadge()
const { count: reportUnreadCount, refresh: refreshReportBadge } = useClientReportBadge()

const chat = useChatStore()
const chatUnreadCount = computed(() => chat.totalUnreadCount)

const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`)

// Grouped around what the user is actually trying to do, most-used first:
// track a document, check messages/alerts, check reports, then setup/help
// tucked lower since those are occasional, not daily, tasks.
const navGroups = [
  {
    title: 'Track Documents',
    items: [
      { to: '/client/dashboard', label: 'Dashboard', icon: 'ph:squares-four-light' },
      { to: '/client/current-working', label: 'Live Tracking', icon: 'ph:truck-light' },
      { to: '/client/documents', label: 'All Documents', icon: 'ph:files-light' },
      { to: '/client/scan', label: 'Scan & Update', icon: 'ph:scan-light' },
      { to: '/client/activity', label: 'Activity Log', icon: 'ph:clock-counter-clockwise-light' },
    ],
  },
  {
    title: 'Messages & Alerts',
    items: [
      { to: '/client/messages', label: 'Messages', icon: 'ph:chat-teardrop-text-light' },
      { to: '/client/notifications', label: 'Notifications', icon: 'ph:bell-light' },
    ],
  },
  {
    title: 'Reports & Insights',
    items: [
      { to: '/client/sla-compliance', label: 'On-Time Status', icon: 'ph:shield-check-light' },
      { to: '/client/workload-analytics', label: 'Team Workload', icon: 'ph:chart-line-up-light' },
      { to: '/client/reports', label: 'Reports', icon: 'ph:chart-bar-light' },
      { to: '/client/ai', label: 'Ask AI', icon: 'ph:brain-light' },
    ],
  },
  {
    title: 'Setup & Team',
    items: [
      { to: '/client/stages', label: 'Workflow Steps', icon: 'ph:steps-light' },
      { to: '/client/office', label: 'Branch Offices', icon: 'ph:buildings-light' },
      { to: '/client/station', label: 'QR Terminals', icon: 'ph:qr-code-light' },
      { to: '/client/user-management', label: 'Team Members', icon: 'ph:users-three-light' },
    ],
  },
  {
    title: 'Help & Settings',
    items: [
      { to: '/client/feedback', label: 'Send Feedback', icon: 'ph:chat-circle-text-light' },
      { to: '/client/help', label: 'Help & Support', icon: 'ph:question-light' },
      { to: '/client/settings', label: 'Settings', icon: 'ph:gear-six-light' },
    ],
  },
]

onMounted(() => {
  refreshUnreadCount()
  refreshReportBadge()
  chat.fetchConversations()
  chat.subscribeToMessages()
})

watch(() => route.path, () => {
  refreshUnreadCount()
  refreshReportBadge()
})
</script>
