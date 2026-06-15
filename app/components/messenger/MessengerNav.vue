<template>
  <div class="space-y-6">
    <div>
      <p class="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Deliveries</p>
      <div class="space-y-0.5">
        <NuxtLink v-for="item in deliveryItems" :key="item.to" :to="item.to"
          class="nav-item w-full"
          :class="{ 'nav-item-messenger-active': isActive(item.to) }">
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span class="truncate">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <div>
      <p class="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">Account</p>
      <div class="space-y-0.5">
        <NuxtLink v-for="item in accountItems" :key="item.to" :to="item.to"
          class="nav-item w-full"
          :class="{ 'nav-item-messenger-active': isActive(item.to) }">
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
const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`)

const deliveryItems = [
  { to: '/messenger/dashboard',  label: 'Dashboard',  icon: 'ph:squares-four-fill' },
  { to: '/messenger/scan',       label: 'QR Scanner', icon: 'ph:scan-fill' },
  { to: '/messenger/deliveries', label: 'Deliveries', icon: 'ph:package-fill' },
  { to: '/messenger/history',    label: 'History',    icon: 'ph:clock-counter-clockwise-fill' },
]

const accountItems = [
  { to: '/messenger/settings', label: 'Settings', icon: 'ph:gear-six-fill' },
]
</script>

<style scoped>
.nav-item-messenger-active {
  @apply text-amber-600 bg-amber-500/[0.08] dark:text-amber-400 dark:bg-amber-500/[0.12] relative;
}
.nav-item-messenger-active::before {
  content: '';
  @apply absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-500 rounded-full;
}
</style>
