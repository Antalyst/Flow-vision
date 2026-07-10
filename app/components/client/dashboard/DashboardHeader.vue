<script setup lang="ts">
import type { DashboardLayoutId } from '~/composables/useClientDashboard'

const props = withDefaults(defineProps<{
  userName?: string
}>(), {
  userName: 'User',
})

const { currentLayout, setLayout } = useDashboardLayout()
const { isDark, toggleTheme } = useTheme()

const layoutOptions: { id: DashboardLayoutId, label: string }[] = [
  { id: 'default', label: 'Matrix' },
  { id: 'focused-stream', label: 'Stream' },
  { id: 'compact_grid', label: 'Compact' },
]

const activeIndex = computed(() =>
  layoutOptions.findIndex((o) => o.id === currentLayout.value),
)

function cycleLayout() {
  const next = (activeIndex.value + 1) % layoutOptions.length
  setLayout(layoutOptions[next]!.id)
}
</script>

<template>
  <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
    <!-- Left: Title & Subtitle -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
        Hello, {{ userName }}
      </h1>
      <p class="mt-1.5 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
        Live organization tracking synced
      </p>
    </div>

    <!-- Right: Controls -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Layout Switcher -->
      <div class="flex items-center rounded-lg border border-neutral-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-[#111113]">
        <button
          v-for="(opt, index) in layoutOptions"
          :key="opt.id"
          type="button"
          class="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200"
          :class="activeIndex === index
            ? 'bg-neutral-100 text-neutral-900 shadow-sm dark:bg-white/10 dark:text-white'
            : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'"
          @click="setLayout(opt.id)"
        >
          <Icon :name="['ph:squares-four', 'ph:rows', 'ph:grid-nine'][index] || 'ph:layout'" class="h-4 w-4" />
          <span class="hidden sm:inline">{{ opt.label }}</span>
        </button>
      </div>

      <!-- Action Icons -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:border-white/10 dark:bg-[#111113] dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
          aria-label="Toggle theme"
          @click="toggleTheme"
        >
          <Icon :name="isDark ? 'ph:moon' : 'ph:sun'" class="h-4 w-4" />
        </button>

        <NuxtLink
          to="/client/notifications"
          class="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:border-white/10 dark:bg-[#111113] dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <Icon name="ph:bell" class="h-4 w-4" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
