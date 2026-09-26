<template>
  <section class="features-hero-banner relative overflow-hidden rounded-3xl border border-flow-muted/15 bg-flow-void">
  <div class="relative flex flex-col items-center px-6 py-16 text-center sm:px-10 sm:py-20 md:py-24">
    <p v-if="eyebrow" class="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-flow-muted">
      {{ eyebrow }}
    </p>
    <h2 class="max-w-2xl text-2xl font-bold leading-tight text-flow-ink sm:text-3xl lg:text-4xl">
      {{ title }}
    </h2>
    <p v-if="description" class="mt-4 max-w-lg text-sm leading-relaxed text-flow-muted sm:text-base">
      {{ description }}
    </p>
    <div v-if="$slots.actions" class="mt-8 flex flex-wrap items-center justify-center gap-3">
      <slot name="actions" />
    </div>
  </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  eyebrow?: string
}>()
</script>
