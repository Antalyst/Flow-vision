<script setup lang="ts">
import type { DashboardLayoutId } from '~/composables/useClientDashboard'

const props = withDefaults(defineProps<{
  userName?: string
}>(), {
  userName: 'User',
})

const { currentLayout, setLayout } = useDashboardLayout()

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
      <div class="flex items-center gap-2 text-sm text-zinc-400">
        <Icon name="ph:squares-four-fill" class="h-4 w-4 text-amber-500" />
        <span>Architecture Matrix</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium text-white">Dashboard</span>
      </div>
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/client/notifications"
          class="rounded-xl border border-zinc-800 p-2 text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-400"
        >
          <Icon name="ph:bell" class="h-5 w-5" />
        </NuxtLink>
      </div>
    </div>

    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Hello, {{ userName }}!</h1>
        <p class="mt-1 text-sm text-zinc-400">Live architecture matrix — org-scoped tracking intelligence.</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
          <Icon name="ph:layout-fill" class="h-4 w-4 text-amber-500" />
          <span class="text-xs font-semibold text-zinc-300">Layout</span>
          <button
            type="button"
            class="ml-1 grid h-7 w-24 grid-cols-3 gap-0.5 rounded-full bg-zinc-800 p-0.5 transition-all duration-500 ease-in-out"
            @click="cycleLayout"
          >
            <span
              v-for="(opt, index) in layoutOptions"
              :key="opt.id"
              class="flex items-center justify-center rounded-full text-[9px] font-bold uppercase leading-none transition-all duration-500 ease-in-out"
              :class="activeIndex === index
                ? 'bg-amber-500 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                : 'text-zinc-400'"
            >
              {{ ['M', 'S', 'C'][index] }}
            </span>
          </button>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            {{ layoutOptions.find((o) => o.id === currentLayout)?.label }}
          </span>
        </div>

        <div class="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
          <span class="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Live sync
        </div>
      </div>
    </div>
  </div>
</template>
