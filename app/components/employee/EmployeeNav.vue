<template>
  <div>
    <div v-for="(group, gIndex) in navGroups" :key="group.title" :class="gIndex > 0 ? 'mt-4' : ''">
      <p v-if="!minimized" class="px-4 mb-2 text-xs font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-400' : 'text-white-muted'">{{ group.title }}</p>
      <div v-else class="h-4 border-t mb-2 mx-4" :class="isDark ? 'border-onyx-border' : 'border-gray-200'"></div>

      <div class="space-y-0.5">
        <NuxtLink v-for="item in group.items" :key="item.to" :to="item.to"
          class="nav-item w-full relative rounded-lg mx-2"
          :class="[isActive(item.to) ? 'nav-item-employee-active' : '', minimized ? 'justify-center px-0 mx-0' : 'px-3 py-2']"
          :title="minimized ? item.label : undefined">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span v-if="!minimized" class="truncate">{{ item.label }}</span>

          <span
            v-if="!minimized && item.to === '/employee/notifications' && badgeCount > 0"
            class="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-candy-orange px-1.5 text-xs font-bold text-white"
          >
            {{ badgeCount > 9 ? '9+' : badgeCount }}
          </span>
          <span
            v-if="!minimized && item.to === '/employee/messages' && chatUnreadCount > 0"
            class="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-danger px-1.5 text-xs font-bold text-white"
          >
            {{ chatUnreadCount > 9 ? '9+' : chatUnreadCount }}
          </span>

          <div v-if="minimized && item.to === '/employee/notifications' && badgeCount > 0" class="absolute top-2 right-2 w-2 h-2 bg-candy-orange rounded-full"></div>
          <div v-if="minimized && item.to === '/employee/messages' && chatUnreadCount > 0" class="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full"></div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useChatStore } from '~/stores/chat'

const props = defineProps({
  minimized: { type: Boolean, default: false }
})

const { isDark } = useTheme()
const route = useRoute()
const { count: badgeCount, refresh: refreshBadge } = useEmployeeNotificationBadge()

const chat = useChatStore()
const chatUnreadCount = computed(() => chat.totalUnreadCount)

const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`)

// Grouped by what an employee is actually trying to do, with the day-to-day
// document work surfaced right after the dashboard.
const navGroups = [
  {
    title: 'Overview',
    items: [
      { to: '/employee/dashboard', label: 'Dashboard', icon: 'ph:squares-four-light' },
    ],
  },
  {
    title: 'My Work',
    items: [
      { to: '/employee/working',   label: 'Current Working', icon: 'ph:briefcase-light' },
      { to: '/employee/documents', label: 'Documents',       icon: 'ph:files-light' },
      { to: '/employee/scan',      label: 'Scan & Update',   icon: 'ph:scan-light' },
    ],
  },
  {
    title: 'Office Setup',
    items: [
      { to: '/employee/stages',  label: 'Workflow Steps',  icon: 'ph:steps-light' },
      { to: '/employee/offices', label: 'Office QR Codes', icon: 'ph:qr-code-light' },
    ],
  },
  {
    title: 'Team',
    items: [
      { to: '/employee/messages',      label: 'Messages',      icon: 'ph:chat-teardrop-text-light' },
      { to: '/employee/users',         label: 'Team Members',  icon: 'ph:users-light' },
      { to: '/employee/notifications', label: 'Notifications', icon: 'ph:bell-light' },
    ],
  },
  {
    title: 'Reports & Activity',
    items: [
      { to: '/employee/flagged',  label: 'Flagged Documents', icon: 'ph:shield-warning-light' },
      { to: '/employee/activity', label: 'Activity Log',      icon: 'ph:clock-counter-clockwise-light' },
      { to: '/employee/reports',  label: 'Reports',           icon: 'ph:chart-bar-light' },
      { to: '/employee/ai',       label: 'Ask AI',            icon: 'ph:sparkle-light' },
    ],
  },
  {
    title: 'Support',
    items: [
      { to: '/employee/settings', label: 'Settings',        icon: 'ph:gear-six-light' },
      { to: '/employee/help',     label: 'Help & Support',  icon: 'ph:question-light' },
    ],
  },
]

onMounted(() => {
  refreshBadge()
  chat.fetchConversations()
  chat.subscribeToMessages()
})

watch(() => route.path, () => {
  refreshBadge()
})
</script>

<style scoped>
.nav-item-employee-active {
  @apply text-candy-orange bg-candy-orange/[0.08] dark:bg-candy-orange/[0.12] relative;
}
.nav-item-employee-active::before {
  content: '';
  @apply absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-candy-orange rounded-full;
}
</style>
