<template>
  <AppSidebarNav :groups="navGroups" :minimized="minimized" accent="orange" />
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebarNav from '~/components/shared/AppSidebarNav.vue'

defineProps({
  minimized: { type: Boolean, default: false }
})

const { count: badgeCount, refresh: refreshBadge } = useStaffNotificationBadge()

const navGroups = computed(() => [
  {
    title: 'Overview',
    items: [
      { to: '/staff/dashboard', label: 'Dashboard', icon: 'ph:squares-four-light' },
      { to: '/staff/notifications', label: 'Notifications', icon: 'ph:bell-light', badgeCount: badgeCount.value },
    ],
  },
  {
    title: 'Documents',
    items: [
      { to: '/staff/documents', label: 'Documents', icon: 'ph:files-light' },
      { to: '/staff/my-tracking', label: 'My Tracking', icon: 'ph:map-trifold-light' },
      { to: '/staff/scan', label: 'Scan & Update', icon: 'ph:scan-light' },
    ],
  },
  {
    title: 'Setup',
    items: [
      { to: '/staff/routes', label: 'Document Routes', icon: 'ph:steps-light' },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/staff/ai', label: 'Ask AI', icon: 'ph:sparkle-light' },
      { to: '/staff/qr', label: 'My QR Code', icon: 'ph:qr-code-light' },
      { to: '/staff/desk-qr', label: 'My Desk QR', icon: 'ph:desktop-light' },
      { to: '/staff/settings', label: 'Settings', icon: 'ph:gear-six-light' },
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
