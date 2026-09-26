<template>
  <article
    :id="panelId ? `feature-panel-${panelId}` : undefined"
    ref="panelRef"
    class="features-canvas-panel group relative flex h-full flex-col overflow-hidden rounded-3xl border border-flow-muted/15 bg-flow-void transition-all duration-300 ease-out"
    :class="[
      spanClass,
      interactive ? 'cursor-pointer' : '',
      selected ? 'ring-1 ring-flow-signal/40' : '',
      dimmed ? 'pointer-events-none scale-[0.98] opacity-30' : 'opacity-100',
      noPadding ? '' : 'p-6 sm:p-8',
    ]"
    @click="interactive ? emit('select') : undefined"
  >
    <!-- Editorial card header -->
    <header v-if="eyebrow || title || description" class="mb-6 shrink-0">
      <p v-if="eyebrow" class="text-xs text-flow-muted">
        {{ eyebrow }}
      </p>
      <h2 v-if="title" class="mb-2 text-lg font-semibold text-flow-ink">
        {{ title }}
      </h2>
      <p v-if="description" class="text-sm leading-relaxed text-flow-muted">
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
defineProps<{
  panelId?: string
  spanClass?: string
  eyebrow?: string
  title?: string
  description?: string
  interactive?: boolean
  selected?: boolean
  dimmed?: boolean
  noPadding?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const panelRef = ref<HTMLElement | null>(null)

defineExpose({ panelRef })
</script>
