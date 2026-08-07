<template>
  <div>
    <!-- Workspace -->
    <div class="mb-4">
      <p v-if="!minimized" class="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Workspace</p>
      <div v-else class="h-4 border-t border-gray-200 dark:border-onyx-border mb-2 mx-4" :class="isDark ? 'border-onyx-border' : 'border-gray-200'"></div>
      
      <div class="space-y-0">
        <NuxtLink v-for="item in workspaceItems" :key="item.to" :to="item.to"
          class="nav-item w-full relative"
          :class="[isActive(item.to) ? 'nav-item-employee-active' : '', minimized ? 'justify-center px-0' : '']"
          :title="minimized ? item.label : undefined">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span v-if="!minimized" class="truncate">{{ item.label }}</span>
          <span
            v-if="!minimized && item.to === '/employee/notifications' && badgeCount > 0"
            class="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-none bg-candy-orange px-1.5 text-[10px] font-bold text-white"
          >
            {{ badgeCount > 9 ? '9+' : badgeCount }}
          </span>
          <span
            v-if="!minimized && item.to === '/employee/messages' && chatUnreadCount > 0"
            class="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-sm bg-red-500 px-1.5 text-[10px] font-bold text-white"
          >
            {{ chatUnreadCount > 9 ? '9+' : chatUnreadCount }}
          </span>
          <div v-if="minimized && item.to === '/employee/notifications' && badgeCount > 0" class="absolute top-2 right-2 w-2 h-2 bg-candy-orange rounded-none"></div>
          <div v-if="minimized && item.to === '/employee/messages' && chatUnreadCount > 0" class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
        </NuxtLink>
      </div>
    </div>

    <!-- Account -->
    <div>
      <p v-if="!minimized" class="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Account</p>
      <div v-else class="h-0 border-t mb-2 mx-4" :class="isDark ? 'border-onyx-border' : 'border-gray-200'"></div>

      <div class="space-y-0">
        <NuxtLink v-for="item in accountItems" :key="item.to" :to="item.to"
          class="nav-item w-full relative"
          :class="[isActive(item.to) ? 'nav-item-employee-active' : '', minimized ? 'justify-center px-0' : '']"
          :title="minimized ? item.label : undefined">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span v-if="!minimized" class="truncate">{{ item.label }}</span>
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

const workspaceItems = [
  { to: '/employee/dashboard',     label: 'Dashboard',       icon: 'ph:squares-four-light' },
  { to: '/employee/messages',      label: 'Messages',        icon: 'ph:chat-teardrop-text-light' },
  { to: '/employee/notifications', label: 'Notifications',   icon: 'ph:bell-light' },
  { to: '/employee/offices',       label: 'Office QR Codes', icon: 'ph:qr-code-light' },
  { to: '/employee/users',         label: 'Internal Staff',  icon: 'ph:users-light' },
  { to: '/employee/working',       label: 'Current Working', icon: 'ph:briefcase-light' },
  { to: '/employee/stages',        label: 'Stages',          icon: 'ph:steps-light' },
  { to: '/employee/documents',     label: 'Documents',       icon: 'ph:files-light' },
  { to: '/employee/scan',          label: 'Scan QR',         icon: 'ph:scan-light' },
  { to: '/employee/flagged',       label: 'Compliance Logs', icon: 'ph:shield-warning-light' },
  { to: '/employee/activity',      label: 'Activity',        icon: 'ph:clock-counter-clockwise-light' },
  { to: '/employee/reports',       label: 'Reports',         icon: 'ph:chart-bar-light' },
  { to: '/employee/ai',            label: 'AI Intelligence', icon: 'ph:sparkle-light' },
]

const accountItems = [
  { to: '/employee/settings', label: 'Settings', icon: 'ph:gear-six-light' },
  { to: '/employee/help',     label: 'Help',     icon: 'ph:question-light' },
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
  @apply text-candy-orange bg-candy-orange/[0.08] dark:text-[#F47D2F] dark:bg-candy-orange/[0.10] relative;
}
.nav-item-employee-active::before {
  content: '';
  @apply absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-candy-orange rounded-none;
}
</style>
