<template>
  <component
    :is="to ? 'NuxtLink' : 'button'"
    :to="to"
    :type="to ? undefined : 'button'"
    class="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold tracking-tight transition-all duration-300 ease-out active:scale-[0.98]"
    :class="variant === 'solid'
      ? 'bg-flow-signal text-flow-void hover:bg-flow-signal/85'
      : 'border border-flow-muted/40 text-flow-ink hover:border-flow-signal/60'"
    @click="!to ? emit('click', $event) : undefined"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
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
