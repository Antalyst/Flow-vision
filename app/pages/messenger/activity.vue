<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">My Activity</h1>
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
