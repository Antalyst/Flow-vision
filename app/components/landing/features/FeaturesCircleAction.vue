<template>
  <button
    type="button"
    class="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-out"
    :class="isLandingDark
      ? 'bg-neutral-800 text-candy-orange hover:bg-candy-orange hover:text-neutral-950'
      : 'bg-zinc-100 text-candy-orange hover:bg-candy-orange hover:text-white'"
    :aria-label="ariaLabel"
    @click="emit('click', $event)"
  >
    <Icon
      name="ph:arrow-right-bold"
      class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
    />
  </button>
</template>

<script setup lang="ts">
const { isLandingDark } = useLandingTheme()

withDefaults(defineProps<{
  ariaLabel?: string
}>(), {
  ariaLabel: 'Explore feature',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>
