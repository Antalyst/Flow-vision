<template>
  <header
    class="features-section-header mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-8"
  >
    <div class="max-w-xl">
      <p
        v-if="eyebrow"
        class="mb-2 text-xs font-medium uppercase tracking-[0.2em]"
        :class="eyebrowClass"
      >
        {{ eyebrow }}
      </p>
      <h2
        class="text-xl font-bold leading-tight sm:text-2xl lg:text-3xl"
        :class="titleClass"
      >
        {{ title }}
      </h2>
    </div>
    <p
      v-if="description"
      class="max-w-md text-sm leading-relaxed"
      :class="descClass"
    >
      {{ description }}
    </p>
  </header>
</template>

<script setup lang="ts">
const { isLandingDark } = useLandingTheme()

defineProps<{
  title: string
  description?: string
  eyebrow?: string
}>()

const titleClass = computed(() =>
  isLandingDark.value ? 'text-white' : 'text-zinc-900',
)

const descClass = computed(() =>
  isLandingDark.value ? 'text-neutral-400' : 'text-zinc-600',
)

const eyebrowClass = computed(() =>
  isLandingDark.value ? 'text-neutral-500' : 'text-zinc-500',
)
</script>
