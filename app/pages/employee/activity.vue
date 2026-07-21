<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <div>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:clock-counter-clockwise-fill" class="h-4 w-4 text-candy-orange" />
        <span>Employee Portal</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Activity</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">Office Activity</h1>
      <p class="mt-1 text-sm" :class="mutedClass">Local office operations and outbound pickup tracking.</p>
    </div>

    <div class="dashboard-card p-5 sm:p-6">
      <ActivityTimeline />
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'employee' })

const { isDark } = useTheme()
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
</script>
