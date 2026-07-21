<template>
  <component
    :is="to ? 'NuxtLink' : 'button'"
    :to="to"
    :type="to ? undefined : 'button'"
    class="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold tracking-tight transition-all duration-300 ease-out active:scale-[0.98]"
    :class="variant === 'solid'
      ? 'bg-candy-orange text-white hover:bg-candy-hover'
      : isLandingDark
        ? 'border border-neutral-700 text-neutral-200 hover:border-candy-orange/50 hover:text-white'
        : 'border border-zinc-300 text-zinc-700 hover:border-candy-orange/50 hover:text-zinc-900'"
    @click="!to ? emit('click', $event) : undefined"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
const { isLandingDark } = useLandingTheme()

withDefaults(defineProps<{
  variant?: 'solid' | 'outline'
  to?: string
}>(), {
  variant: 'solid',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>
