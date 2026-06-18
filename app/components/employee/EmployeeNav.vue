<template>
  <div class="space-y-6">
    <div>
      <p class="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Workspace</p>
      <div class="space-y-0.5">
        <NuxtLink v-for="item in workspaceItems" :key="item.to" :to="item.to"
          class="nav-item w-full relative"
          :class="{ 'nav-item-employee-active': isActive(item.to) }">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span class="truncate">{{ item.label }}</span>
          <span
            v-if="item.to === '/employee/notifications' && badgeCount > 0"
            class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-candy-orange px-1.5 text-[10px] font-bold text-white"
          >
            {{ badgeCount > 9 ? '9+' : badgeCount }}
          </span>
        </NuxtLink>
      </div>
    </div>

    <div>
      <p class="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Account</p>
      <div class="space-y-0.5">
        <NuxtLink v-for="item in accountItems" :key="item.to" :to="item.to"
          class="nav-item w-full"
          :class="{ 'nav-item-employee-active': isActive(item.to) }">
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
const { count: badgeCount, refresh: refreshBadge } = useEmployeeNotificationBadge()

const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`)

const workspaceItems = [
  { to: '/employee/dashboard',     label: 'Dashboard',       icon: 'ph:squares-four-fill' },
  { to: '/employee/notifications', label: 'Notifications',   icon: 'ph:bell-fill' },
  { to: '/employee/offices',       label: 'My Offices',      icon: 'ph:buildings-fill' },
  { to: '/employee/working',       label: 'Current Working', icon: 'ph:briefcase-fill' },
  { to: '/employee/stages',        label: 'Stages',          icon: 'ph:steps-fill' },
  { to: '/employee/documents',     label: 'Documents',       icon: 'ph:files-fill' },
  { to: '/employee/activity',      label: 'Activity',        icon: 'ph:clock-counter-clockwise-fill' },
  { to: '/employee/ai',            label: 'AI Intelligence', icon: 'ph:sparkle-fill' },
]

const accountItems = [
  { to: '/employee/settings', label: 'Settings', icon: 'ph:gear-six-fill' },
  { to: '/employee/help',     label: 'Help',     icon: 'ph:question-fill' },
]

onMounted(() => {
  refreshBadge()
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
  @apply absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-candy-orange rounded-full;
}
</style>
