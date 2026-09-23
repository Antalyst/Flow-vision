<template>
  <AppSidebarNav :groups="navGroups" accent="amber" />
</template>

<script setup>
import AppSidebarNav from '~/components/shared/AppSidebarNav.vue'

const { count: badgeCount, refresh: refreshBadge } = useMessengerNotificationBadge()

const navGroups = computed(() => [
  {
    title: 'Deliveries',
    items: [
      { to: '/messenger/dashboard',      label: 'Dashboard',      icon: 'ph:squares-four-fill' },
      { to: '/messenger/notifications',  label: 'Notifications',  icon: 'ph:bell-fill', badgeCount: badgeCount.value },
      { to: '/messenger/scan',           label: 'QR Scanner',     icon: 'ph:scan-fill' },
      { to: '/messenger/deliveries',     label: 'Deliveries',     icon: 'ph:package-fill' },
      { to: '/messenger/activity',       label: 'My Activity',    icon: 'ph:clock-counter-clockwise-fill' },
      { to: '/messenger/reports',        label: 'Reports',        icon: 'ph:chart-bar-fill' },
      { to: '/messenger/history',        label: 'History',        icon: 'ph:archive-fill' },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/messenger/settings', label: 'Settings', icon: 'ph:gear-six-fill' },
    ],
  },
])

onMounted(() => {
  refreshBadge()
})

const route = useRoute()
watch(() => route.path, () => {
  refreshBadge()
})
</script>
