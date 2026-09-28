<template>
  <AppSidebarNav :groups="navGroups" :minimized="minimized" accent="orange" />
</template>

<script setup>
import AppSidebarNav from '~/components/shared/AppSidebarNav.vue'

defineProps({
  minimized: { type: Boolean, default: false }
})

const navGroups = [
  {
    title: 'Overview',
    items: [
      { to: '/staff/dashboard', label: 'Dashboard', icon: 'ph:squares-four-light' },
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
    title: 'Deliveries',
    items: [
      { to: '/staff/deliveries', label: 'My Deliveries', icon: 'ph:package-light' },
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
      { to: '/staff/settings', label: 'Settings', icon: 'ph:gear-six-light' },
    ],
  },
]
</script>
