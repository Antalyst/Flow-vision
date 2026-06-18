<template>
  <section
    class="rounded-lg border p-6 shadow-card"
    :class="isDark ? 'border-onyx-border bg-onyx-card text-white' : 'border-gray-200 bg-white text-onyx-black'"
  >
    <div class="mb-3 h-1 w-12 rounded-full bg-candy-orange"></div>
    <h1 class="text-2xl font-bold tracking-tight">{{ title }}</h1>
    <p class="mt-2 max-w-2xl text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
      This workspace is ready for its module content.
    </p>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title?: string }>(), { title: 'Workspace' })
const { isDark } = useTheme()
</script>
