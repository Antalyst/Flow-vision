<template>
  <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
    :class="isDark ? 'border-onyx-border bg-onyx-card/50' : 'border-gray-200 bg-white'">
    <div class="flex items-center gap-2 text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-600'">
      <Icon name="ph:layout-fill" class="h-4 w-4 text-candy-orange" />
      <span class="font-medium">Dashboard layout</span>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="option in layoutOptions"
        :key="option.id"
        type="button"
        class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
        :class="currentLayout === option.id
          ? 'border-candy-orange bg-candy-orange/10 text-candy-orange'
          : isDark
            ? 'border-onyx-border text-gray-400 hover:border-candy-orange/50 hover:text-gray-200'
            : 'border-gray-200 text-gray-500 hover:border-candy-orange/40 hover:text-gray-700'"
        @click="setLayout(option.id)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DashboardLayoutId } from '~/composables/useClientDashboard'

const { isDark } = useTheme()
const { currentLayout, setLayout } = useDashboardLayout()

const layoutOptions: { id: DashboardLayoutId, label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'focused-stream', label: 'Focused Stream' },
  { id: 'compact_grid', label: 'Compact Grid' },
]
</script>
