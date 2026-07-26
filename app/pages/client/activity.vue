<template>
  <div class="space-y-6">
    <div>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:clock-counter-clockwise-fill" class="h-4 w-4 text-candy-orange" />
        <span>Client Portal</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Activity</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">Organisation Activity</h1>
      <p class="mt-1 text-sm" :class="mutedClass">Full audit timeline for your organisation — uploads, scans, and pickups.</p>
    </div>

    <div class="dashboard-card p-5 sm:p-6">
      <ActivityTimeline />
    </div>
  </div>
</template>

<script setup>
useSeoMeta({
  title: 'FlowVision | Audit Activity',
  description: 'Review real-time system interactions, security events, and audit logs across your organization.'
})
definePageMeta({ layout: 'client' })

const { isDark } = useTheme()
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
</script>
