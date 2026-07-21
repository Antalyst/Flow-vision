<template>
  <section
    class="features-hero-banner relative overflow-hidden rounded-3xl"
    :class="isLandingDark ? 'bg-neutral-900' : 'bg-zinc-100'"
  >
  <div
    class="pointer-events-none absolute inset-0"
    aria-hidden="true"
  >
    <div
      class="absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-40 blur-3xl"
      :class="isLandingDark ? 'bg-candy-orange/20' : 'bg-candy-orange/15'"
    />
    <div
      class="absolute -bottom-24 -left-16 h-72 w-72 rounded-full opacity-30 blur-3xl"
      :class="isLandingDark ? 'bg-neutral-700/40' : 'bg-zinc-300/60'"
    />
    <div
      class="absolute inset-0 opacity-[0.04]"
      :class="isLandingDark ? 'grid-bg-lines-dark' : 'grid-bg-lines'"
    />
  </div>

  <div class="relative flex flex-col items-center px-6 py-16 text-center sm:px-10 sm:py-20 md:py-24">
    <p
      v-if="eyebrow"
      class="mb-3 text-xs font-medium uppercase tracking-[0.2em]"
      :class="isLandingDark ? 'text-neutral-500' : 'text-zinc-500'"
    >
      {{ eyebrow }}
    </p>
    <h2
      class="max-w-2xl text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl"
      :class="isLandingDark ? 'text-white' : 'text-zinc-900'"
    >
      {{ title }}
    </h2>
    <p
      v-if="description"
      class="mt-4 max-w-lg text-sm leading-relaxed sm:text-base"
      :class="isLandingDark ? 'text-neutral-400' : 'text-zinc-600'"
    >
      {{ description }}
    </p>
    <div v-if="$slots.actions" class="mt-8 flex flex-wrap items-center justify-center gap-3">
      <slot name="actions" />
    </div>
  </div>
  </section>
</template>

<script setup lang="ts">
const { isLandingDark } = useLandingTheme()

defineProps<{
  title: string
  description?: string
  eyebrow?: string
}>()
</script>
