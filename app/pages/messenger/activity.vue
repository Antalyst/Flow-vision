<template>
  <div class="space-y-6">
    <div>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:clock-counter-clockwise-fill" class="h-4 w-4 text-amber-500" />
        <span>Messenger Portal</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">My Activity</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">Personal Activity</h1>
      <p class="mt-1 text-sm" :class="mutedClass">Your pickup and scan history.</p>
    </div>

    <div class="dashboard-card p-5 sm:p-6">
      <ActivityTimeline />
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'messenger' })

const { isDark } = useTheme()
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
</script>
