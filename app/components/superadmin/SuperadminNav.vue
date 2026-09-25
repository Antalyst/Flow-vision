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
      { to: '/superadmin/dashboard', label: 'Dashboard', icon: 'ph:squares-four-light' },
    ],
  },
  {
    title: 'Management',
    items: [
      { to: '/superadmin/accounts', label: 'Accounts', icon: 'ph:users-three-light' },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { to: '/superadmin/activity', label: 'Activity Log', icon: 'ph:clock-counter-clockwise-light' },
      { to: '/superadmin/feedback', label: 'Feedback & Reports', icon: 'ph:chat-centered-text-light' },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/superadmin/settings', label: 'Settings', icon: 'ph:gear-six-light' },
    ],
  },
]
</script>
