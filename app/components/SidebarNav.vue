<template>
  <div>
    <!-- Main Navigation -->
    <div class="mb-4">
      <p v-if="!minimized" class="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Main Navigation</p>
      <div v-else class="h-4 border-t border-gray-200 dark:border-onyx-border mb-2 mx-4" :class="isDark ? 'border-onyx-border' : 'border-gray-200'"></div>
      
      <div class="space-y-0">
        <NuxtLink v-for="item in mainNavItems" :key="item.to" :to="item.to"
          class="nav-item w-full"
          :class="[isActive(item.to) ? 'nav-item-active' : '', minimized ? 'justify-center px-0' : '']"
          :title="minimized ? item.label : undefined">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span v-if="!minimized" class="truncate">{{ item.label }}</span>
          <span
            v-if="!minimized && item.to === '/client/notifications' && unreadCount > 0"
            class="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-sm bg-candy-orange px-1.5 text-[10px] font-bold text-white"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
          <Icon v-else-if="!minimized && item.badge" name="ph:caret-down" class="w-3 h-3 ml-auto text-gray-400" />
          
          <div v-if="minimized && item.to === '/client/notifications' && unreadCount > 0" class="absolute top-2 right-2 w-2 h-2 bg-candy-orange rounded-none"></div>
        </NuxtLink>
      </div>
    </div>

    <!-- Analytics & Insights -->
    <div class="mb-4">
      <p v-if="!minimized" class="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Analytics & Insights</p>
      <div v-else class="h-0 border-t mb-2 mx-4" :class="isDark ? 'border-onyx-border' : 'border-gray-200'"></div>
      
      <div class="space-y-0">
        <NuxtLink v-for="item in analyticsNavItems" :key="item.to" :to="item.to"
          class="nav-item w-full relative"
          :class="[isActive(item.to) ? 'nav-item-active' : '', minimized ? 'justify-center px-0' : '']"
          :title="minimized ? item.label : undefined">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span v-if="!minimized" class="truncate">{{ item.label }}</span>
          <span
            v-if="!minimized && item.to === '/client/reports' && reportUnreadCount > 0"
            class="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-sm bg-candy-orange px-1.5 text-[10px] font-bold text-white"
          >
            {{ reportUnreadCount > 9 ? '9+' : reportUnreadCount }}
          </span>
          
          <div v-if="minimized && item.to === '/client/reports' && reportUnreadCount > 0" class="absolute top-2 right-2 w-2 h-2 bg-candy-orange rounded-none"></div>
        </NuxtLink>
      </div>
    </div>

    <!-- Support -->
    <div>
      <p v-if="!minimized" class="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Support</p>
      <div v-else class="h-0 border-t mb-2 mx-4" :class="isDark ? 'border-onyx-border' : 'border-gray-200'"></div>

      <div class="space-y-0">
        <NuxtLink v-for="item in supportNavItems" :key="item.to" :to="item.to"
          class="nav-item w-full"
          :class="[isActive(item.to) ? 'nav-item-active' : '', minimized ? 'justify-center px-0' : '']"
          :title="minimized ? item.label : undefined">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span v-if="!minimized" class="truncate">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  minimized: { type: Boolean, default: false }
})

const { isDark } = useTheme()
const route = useRoute()
const { count: unreadCount, refresh: refreshUnreadCount } = useClientNotificationBadge()
const { count: reportUnreadCount, refresh: refreshReportBadge } = useClientReportBadge()

const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`)

const mainNavItems = [
  { to: '/client/dashboard', label: 'Dashboard', icon: 'ph:squares-four-light' },
  { to: '/client/messages', label: 'Messages', icon: 'ph:chat-teardrop-text-light' },
  { to: '/client/user-management', label: 'User Management', icon: 'ph:users-three-light' },
  { to: '/client/documents', label: 'Documents', icon: 'ph:files-light', badge: true },
  { to: '/client/scan', label: 'Scan QR', icon: 'ph:scan-light' },
  { to: '/client/station', label: 'Office QR', icon: 'ph:qr-code-light' },
  { to: '/client/activity', label: 'Activity', icon: 'ph:clock-counter-clockwise-light' },
  { to: '/client/notifications', label: 'Notifications', icon: 'ph:bell-light' },
  { to: '/client/office', label: 'Office', icon: 'ph:buildings-light', badge: true },
  { to: '/client/stages', label: 'Stages', icon: 'ph:steps-light' },
  { to: '/client/current-working', label: 'Current Working', icon: 'ph:briefcase-light' },
  { to: '/client/ai', label: 'AI', icon: 'ph:brain-light' },
]

const analyticsNavItems = [
  { to: '/client/sla-compliance', label: 'SLA Compliance', icon: 'ph:shield-check-light' },
  { to: '/client/workload-analytics', label: 'Workload Analytics', icon: 'ph:chart-line-up-light' },
  { to: '/client/reports', label: 'Reports', icon: 'ph:chart-bar-light' },
]

const supportNavItems = [
  { to: '/client/feedback', label: 'Feedback', icon: 'ph:chat-circle-text-light' },
  { to: '/client/help', label: 'Help & Support', icon: 'ph:question-light' },
  { to: '/client/settings', label: 'Settings', icon: 'ph:gear-six-light' },
]

onMounted(() => {
  refreshUnreadCount()
  refreshReportBadge()
})

watch(() => route.path, () => {
  refreshUnreadCount()
  refreshReportBadge()
})
</script>
