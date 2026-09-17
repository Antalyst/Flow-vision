<script setup lang="ts">
import type { DashboardLayoutId } from '~/composables/useClientDashboard'

const props = withDefaults(defineProps<{
  userName?: string
  offices?: { id: string; name: string }[]
  selectedOfficeId?: string | null
}>(), {
  userName: 'User',
  offices: () => [],
  selectedOfficeId: null,
})

const emit = defineEmits<{
  (e: 'update:selectedOfficeId', value: string | null): void
  (e: 'refresh'): void
  (e: 'openAiDigest'): void
}>()

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

const localOfficeId = computed({
  get: () => props.selectedOfficeId,
  set: (val) => emit('update:selectedOfficeId', val),
})
</script>

<template>
  <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between w-full">
    <!-- Left: Title & Subtitle (Donezo greeting hierarchy) -->
    <div>
      <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange mb-1">Executive Overview</p>
      <h1 class="text-2xl font-bold tracking-tight text-onyx-black dark:text-white-pure sm:text-3xl">
        Hello, {{ userName }}
      </h1>
      <p class="mt-1 flex items-center gap-2 text-xs sm:text-sm text-zinc-500 dark:text-white-muted">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-none bg-candy-orange opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-none bg-candy-orange"></span>
        </span>
        Live organization tracking synced · Monitor routing & velocity with ease.
      </p>
    </div>

    <!-- Right: Unified Action Toolbar (Donezo style) -->
    <div class="flex flex-wrap items-center gap-2.5">
      <!-- Office selector -->
      <div class="relative">
        <select
          v-model="localOfficeId"
          class="h-9 rounded-none border border-zinc-200 bg-white px-3 pr-8 text-xs font-semibold text-onyx-black shadow-card transition focus:border-candy-orange focus:outline-none dark:border-onyx-border dark:bg-onyx-card dark:text-white-pure cursor-pointer"
        >
          <option :value="null">Global Organization</option>
          <option v-for="office in offices" :key="office.id" :value="office.id">
            {{ office.name }}
          </option>
        </select>
        <Icon name="ph:caret-down" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-white-muted" />
      </div>

      <!-- AI Digest Button -->
      <button
        type="button"
        @click="$emit('openAiDigest')"
        class="flex h-9 items-center gap-1.5 rounded-none border border-zinc-200 bg-white px-3 text-xs font-semibold text-onyx-black shadow-card transition hover:border-candy-orange hover:text-candy-orange dark:border-onyx-border dark:bg-onyx-card dark:text-white-pure dark:hover:border-candy-orange dark:hover:text-candy-orange"
      >
        <Icon name="ph:sparkle-fill" class="h-3.5 w-3.5 text-candy-orange" />
        <span>AI Digest</span>
      </button>

      <!-- Primary CTA: Register Document -->
      <NuxtLink
        to="/client/documents"
        class="flex h-9 items-center gap-1.5 rounded-none bg-candy-orange px-3.5 text-xs font-semibold text-white-pure shadow-card transition hover:bg-candy-hover"
      >
        <Icon name="ph:plus-bold" class="h-3.5 w-3.5" />
        <span>New Document</span>
      </NuxtLink>

      <!-- Refresh button -->
      <button
        type="button"
        @click="$emit('refresh')"
        class="flex h-9 w-9 items-center justify-center rounded-none border border-zinc-200 bg-white text-zinc-500 shadow-card transition hover:border-candy-orange hover:text-candy-orange dark:border-onyx-border dark:bg-onyx-card dark:text-white-muted dark:hover:text-candy-orange"
        title="Refresh Data"
      >
        <Icon name="ph:arrows-clockwise" class="h-4 w-4" />
      </button>

      <!-- Layout Switcher -->
      <div class="flex items-center rounded-none border border-zinc-200 bg-white p-0.5 shadow-card dark:border-onyx-border dark:bg-onyx-card">
        <button
          v-for="(opt, index) in layoutOptions"
          :key="opt.id"
          type="button"
          class="flex h-8 items-center gap-1.5 rounded-none px-2.5 text-xs font-semibold transition-all duration-200"
          :class="activeIndex === index
            ? 'bg-candy-orange/10 text-candy-orange dark:bg-candy-orange/15 dark:text-candy-orange'
            : 'text-zinc-500 hover:text-onyx-black dark:text-white-muted dark:hover:text-white-pure'"
          :title="opt.label"
          @click="setLayout(opt.id)"
        >
          <Icon :name="['ph:squares-four', 'ph:rows', 'ph:grid-nine'][index] || 'ph:layout'" class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ opt.label }}</span>
        </button>
      </div>

      <!-- Action Icons: Theme + Notifications -->
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-none border border-zinc-200 bg-white text-zinc-500 shadow-card transition hover:border-candy-orange hover:text-candy-orange dark:border-onyx-border dark:bg-onyx-card dark:text-white-muted dark:hover:text-candy-orange"
          aria-label="Toggle theme"
          @click="toggleTheme"
        >
          <Icon :name="isDark ? 'ph:moon' : 'ph:sun'" class="h-4 w-4" />
        </button>

        <NuxtLink
          to="/client/notifications"
          class="flex h-9 w-9 items-center justify-center rounded-none border border-zinc-200 bg-white text-zinc-500 shadow-card transition hover:border-candy-orange hover:text-candy-orange dark:border-onyx-border dark:bg-onyx-card dark:text-white-muted dark:hover:text-candy-orange"
          title="Notifications"
        >
          <Icon name="ph:bell" class="h-4 w-4" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
