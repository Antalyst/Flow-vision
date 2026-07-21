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
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm text-zinc-500 dark:text-white-muted">
        <Icon name="ph:squares-four-fill" class="h-4 w-4 text-candy-orange" />
        <span>Architecture Matrix</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium text-onyx-black dark:text-white-pure">Dashboard</span>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="relative h-8 w-14 rounded-full transition-colors duration-300"
          :class="isDark ? 'bg-candy-orange' : 'bg-zinc-300'"
          aria-label="Toggle light and dark mode"
          @click="toggleTheme"
        >
          <span
            class="absolute top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white-pure shadow-md transition-transform duration-300"
            :class="isDark ? 'translate-x-6' : 'translate-x-0.5'"
          >
            <Icon
              :name="isDark ? 'ph:moon-fill' : 'ph:sun-fill'"
              class="h-3.5 w-3.5 text-candy-orange"
            />
          </span>
        </button>
        <NuxtLink
          to="/client/notifications"
          class="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition hover:border-candy-orange/40 hover:text-candy-orange dark:border-onyx-border dark:text-white-muted"
        >
          <Icon name="ph:bell" class="h-5 w-5" />
        </NuxtLink>
      </div>
    </div>

    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-onyx-black dark:text-white-pure">Hello, {{ userName }}!</h1>
        <p class="mt-1 text-sm text-zinc-500 dark:text-white-muted">Live architecture matrix — org-scoped tracking intelligence.</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white-surface px-3 py-2 transition-colors duration-300 dark:border-onyx-border dark:bg-onyx-card">
          <Icon name="ph:layout-fill" class="h-4 w-4 text-candy-orange" />
          <span class="text-xs font-semibold text-onyx-black dark:text-white-pure">Layout</span>
          <button
            type="button"
            class="ml-1 grid h-7 w-24 grid-cols-3 gap-0.5 rounded-full bg-zinc-200 p-0.5 transition-all duration-500 ease-in-out dark:bg-onyx-black"
            @click="cycleLayout"
          >
            <span
              v-for="(opt, index) in layoutOptions"
              :key="opt.id"
              class="flex items-center justify-center rounded-full text-[9px] font-bold uppercase leading-none transition-all duration-500 ease-in-out"
              :class="activeIndex === index
                ? 'bg-candy-orange text-white-pure shadow-[0_0_12px_rgba(244,125,47,0.45)]'
                : 'text-zinc-500 dark:text-white-muted'"
            >
              {{ ['M', 'S', 'C'][index] }}
            </span>
          </button>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-candy-orange">
            {{ layoutOptions.find((o) => o.id === currentLayout)?.label }}
          </span>
        </div>

        <div class="inline-flex items-center gap-2 rounded-xl border border-candy-orange/20 bg-candy-orange/5 px-3 py-2 text-xs text-candy-orange">
          <span class="h-2 w-2 animate-pulse rounded-full bg-candy-orange" />
          Live sync
        </div>
      </div>
    </div>
  </div>
</template>
