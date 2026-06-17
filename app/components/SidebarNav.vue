<template>
  <div>
    <!-- Main Navigation -->
    <div class="mb-4">
      <p class="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Main Navigation</p>
      <div class="space-y-0.5">
        <NuxtLink v-for="item in mainNavItems" :key="item.to" :to="item.to"
          class="nav-item w-full"
          :class="{ 'nav-item-active': isActive(item.to) }">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span class="truncate">{{ item.label }}</span>
          <span
            v-if="item.to === '/client/notifications' && unreadCount > 0"
            class="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rich-orange px-1.5 text-[10px] font-bold text-white"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
          <Icon v-else-if="item.badge" name="ph:caret-down" class="w-3 h-3 ml-auto text-gray-400" />
        </NuxtLink>
      </div>
    </div>

    <!-- Analytics & Insights -->
    <div class="mb-4">
      <p class="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Analytics & Insights</p>
      <div class="space-y-0.5">
        <NuxtLink v-for="item in analyticsNavItems" :key="item.to" :to="item.to"
          class="nav-item w-full"
          :class="{ 'nav-item-active': isActive(item.to) }">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span class="truncate">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Support -->
    <div>
      <p class="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Support</p>
      <div class="space-y-0.5">
        <NuxtLink v-for="item in supportNavItems" :key="item.to" :to="item.to"
          class="nav-item w-full"
          :class="{ 'nav-item-active': isActive(item.to) }">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span class="truncate">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const { isDark } = useTheme()
const route = useRoute()
const { count: unreadCount, refresh: refreshUnreadCount } = useClientNotificationBadge()

const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`)

const mainNavItems = [
  { to: '/client/dashboard', label: 'Dashboard', icon: 'ph:squares-four-fill' },
  { to: '/client/user-management', label: 'User Management', icon: 'ph:users-three-fill' },
  { to: '/client/documents', label: 'Documents', icon: 'ph:files-fill', badge: true },
  { to: '/client/activity', label: 'Activity', icon: 'ph:clock-counter-clockwise-fill' },
  { to: '/client/notifications', label: 'Notifications', icon: 'ph:bell-fill' },
  { to: '/client/office', label: 'Office', icon: 'icomoon-free:office', badge: true },
  { to: '/client/stages', label: 'Stages', icon: 'ph:steps-fill' },
  { to: '/client/current-working', label: 'Current Working', icon: 'ph:briefcase-fill' },
  { to: '/client/ai', label: 'AI', icon: 'ph:brain-fill' },
]

const analyticsNavItems = [
  { to: '/client/sla-compliance', label: 'SLA Compliance', icon: 'ph:shield-check-fill' },
  { to: '/client/workload-analytics', label: 'Workload Analytics', icon: 'ph:chart-line-up-fill' },
  { to: '/client/reports', label: 'Reports', icon: 'ph:chart-bar-fill' },
]

const supportNavItems = [
  { to: '/client/feedback', label: 'Feedback', icon: 'ph:chat-circle-text-fill' },
  { to: '/client/help', label: 'Help & Support', icon: 'ph:question-fill' },
  { to: '/client/settings', label: 'Settings', icon: 'ph:gear-six-fill' },
]

onMounted(() => {
  refreshUnreadCount()
})

watch(() => route.path, () => {
  refreshUnreadCount()
})
</script>
