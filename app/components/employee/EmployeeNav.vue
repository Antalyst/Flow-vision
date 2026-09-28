<template>
  <AppSidebarNav :groups="navGroups" :minimized="minimized" accent="orange" />
</template>

<script setup>
import { useChatStore } from '~/stores/chat'
import AppSidebarNav from '~/components/shared/AppSidebarNav.vue'

const props = defineProps({
  minimized: { type: Boolean, default: false }
})

const { count: badgeCount, refresh: refreshBadge } = useEmployeeNotificationBadge()

const chat = useChatStore()
const chatUnreadCount = computed(() => chat.totalUnreadCount)

// Grouped by what an employee is actually trying to do, with the day-to-day
// document work surfaced right after the dashboard.
const navGroups = computed(() => [
  {
    title: 'Overview',
    items: [
      { to: '/employee/dashboard', label: 'Dashboard', icon: 'ph:squares-four-light' },
    ],
  },
  {
    title: 'My Work',
    items: [
      { to: '/employee/my-tracking', label: 'My Tracking', icon: 'ph:map-pin-light' },
      { to: '/employee/working',   label: 'Under Process', icon: 'ph:briefcase-light' },
      { to: '/employee/documents', label: 'Documents',       icon: 'ph:files-light' },
      { to: '/employee/scan',      label: 'Scan & Update',   icon: 'ph:scan-light' },
    ],
  },
  {
    title: 'Messenger',
    items: [
      { to: '/employee/deliveries', label: 'My Deliveries', icon: 'ph:package-light' },
    ],
  },
  {
    title: 'Delivery Setup',
    items: [
      { to: '/employee/stages',  label: 'Document Routes',  icon: 'ph:steps-light' },
      { to: '/employee/offices', label: 'Office QR Codes', icon: 'ph:qr-code-light' },
    ],
  },
  {
    title: 'Team',
    items: [
      { to: '/employee/messages',      label: 'Messages',      icon: 'ph:chat-teardrop-text-light', badgeCount: chatUnreadCount.value, badgeColor: 'red' },
      { to: '/employee/users',         label: 'Staff Accounts', icon: 'ph:users-light' },
      { to: '/employee/desks',   label: 'Desks', icon: 'ph:desktop-light' },
      { to: '/employee/notifications', label: 'Notifications', icon: 'ph:bell-light', badgeCount: badgeCount.value },
    ],
  },
  {
    title: 'Reports & Activity',
    items: [
      { to: '/employee/flagged',  label: 'Flagged Documents', icon: 'ph:shield-warning-light' },
      { to: '/employee/activity', label: 'Activity History',  icon: 'ph:clock-counter-clockwise-light' },
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
])

onMounted(() => {
  refreshBadge()
  chat.fetchConversations()
  chat.subscribeToMessages()
})

const route = useRoute()
watch(() => route.path, () => {
  refreshBadge()
})
</script>
