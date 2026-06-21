<template>
  <article
    :id="panelId ? `feature-panel-${panelId}` : undefined"
    ref="panelRef"
    class="features-canvas-panel group relative flex h-full flex-col overflow-hidden rounded-3xl transition-all duration-300 ease-out"
    :class="[
      panelSurfaceClass,
      spanClass,
      interactive ? 'cursor-pointer' : '',
      selected ? 'ring-1 ring-candy-orange/30' : '',
      dimmed ? 'pointer-events-none scale-[0.98] opacity-30' : 'opacity-100',
      noPadding ? '' : 'p-6 sm:p-8',
    ]"
    @click="interactive ? emit('select') : undefined"
  >
    <div
      class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-candy-orange/6 blur-3xl transition-opacity duration-500"
      :class="selected || glow ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'"
      aria-hidden="true"
    />

    <!-- Editorial card header -->
    <header v-if="eyebrow || title || description" class="mb-6 shrink-0">
      <p v-if="eyebrow" class="text-xs text-neutral-500">
        {{ eyebrow }}
      </p>
      <h2
        v-if="title"
        class="text-lg font-semibold text-neutral-100 mb-2"
        :class="!isLandingDark && '!text-zinc-900'"
      >
        {{ title }}
      </h2>
      <p
        v-if="description"
        class="text-sm leading-relaxed"
        :class="isLandingDark ? 'text-neutral-400' : 'text-zinc-600'"
      >
        {{ description }}
      </p>
    </header>

  <div class="flex min-h-0 flex-1 flex-col">
    <slot />
  </div>

  <footer
    v-if="interactive"
    class="mt-6 flex shrink-0 justify-end pt-2"
  >
    <FeaturesCircleAction
      :aria-label="`Explore ${title ?? 'feature'}`"
      @click.stop="emit('select')"
    />
  </footer>
  </article>
</template>

<script setup lang="ts">
const { isLandingDark } = useLandingTheme()

defineProps<{
  panelId?: string
  spanClass?: string
  eyebrow?: string
  title?: string
  description?: string
  interactive?: boolean
  selected?: boolean
  dimmed?: boolean
  glow?: boolean
  noPadding?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const panelRef = ref<HTMLElement | null>(null)

const panelSurfaceClass = computed(() =>
  isLandingDark.value
    ? 'bg-neutral-900 border border-neutral-800'
    : 'bg-white border border-zinc-200',
)

defineExpose({ panelRef })
</script>
