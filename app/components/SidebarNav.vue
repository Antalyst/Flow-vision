<template>
  <AppSidebarNav :groups="navGroups" :minimized="minimized" accent="orange" />
</template>

<script setup>
import { useChatStore } from '~/stores/chat'
import AppSidebarNav from '~/components/shared/AppSidebarNav.vue'

const props = defineProps({
  minimized: { type: Boolean, default: false }
})

const { count: unreadCount, refresh: refreshUnreadCount } = useClientNotificationBadge()
const { count: reportUnreadCount, refresh: refreshReportBadge } = useClientReportBadge()

const chat = useChatStore()
const chatUnreadCount = computed(() => chat.totalUnreadCount)

// Grouped around what the user is actually trying to do, most-used first:
// track a document, check messages/alerts, check reports, then setup/help
// tucked lower since those are occasional, not daily, tasks.
const navGroups = computed(() => [
  {
    title: 'Track Documents',
    items: [
      { to: '/client/my-tracking', label: 'My Tracking', icon: 'ph:map-pin-light' },
      { to: '/client/dashboard', label: 'Dashboard', icon: 'ph:squares-four-light' },
      { to: '/client/current-working', label: 'Live Tracking', icon: 'ph:truck-light' },
      { to: '/client/documents', label: 'All Documents', icon: 'ph:files-light' },
      { to: '/client/scan', label: 'Scan & Update', icon: 'ph:scan-light' },
      { to: '/client/activity', label: 'Activity History', icon: 'ph:clock-counter-clockwise-light' },
    ],
  },
  {
    title: 'Messenger',
    items: [
      { to: '/client/deliveries', label: 'My Deliveries', icon: 'ph:package-light' },
    ],
  },
  {
    title: 'Messages & Alerts',
    items: [
      { to: '/client/messages', label: 'Messages', icon: 'ph:chat-teardrop-text-light', badgeCount: chatUnreadCount.value, badgeColor: 'red' },
      { to: '/client/notifications', label: 'Notifications', icon: 'ph:bell-light', badgeCount: unreadCount.value },
    ],
  },
  {
    title: 'Reports & Insights',
    items: [
      { to: '/client/sla-compliance', label: 'On-Time Status', icon: 'ph:shield-check-light' },
      { to: '/client/workload-analytics', label: 'Team Workload', icon: 'ph:chart-line-up-light' },
      { to: '/client/reports', label: 'Reports', icon: 'ph:chart-bar-light', badgeCount: reportUnreadCount.value },
      { to: '/client/ai', label: 'Ask AI', icon: 'ph:brain-light' },
    ],
  },
  {
    title: 'Setup & Team',
    items: [
      { to: '/client/stages', label: 'Document Routes', icon: 'ph:steps-light' },
      { to: '/client/office', label: 'Branch Offices', icon: 'ph:buildings-light' },
      { to: '/client/station', label: 'QR Terminals', icon: 'ph:qr-code-light' },
      { to: '/client/user-management', label: 'Team Members', icon: 'ph:users-three-light' },
    ],
  },
  {
    title: 'Help & Settings',
    items: [
      { to: '/client/feedback', label: 'Send Feedback', icon: 'ph:chat-circle-text-light' },
      { to: '/client/help', label: 'Help & Support', icon: 'ph:question-light' },
      { to: '/client/settings', label: 'Settings', icon: 'ph:gear-six-light' },
    ],
  },
])

onMounted(() => {
  refreshUnreadCount()
  refreshReportBadge()
  chat.fetchConversations()
  chat.subscribeToMessages()
})

const route = useRoute()
watch(() => route.path, () => {
  refreshUnreadCount()
  refreshReportBadge()
})
</script>
