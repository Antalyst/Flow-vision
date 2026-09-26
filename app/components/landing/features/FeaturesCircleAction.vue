<template>
  <button
    type="button"
    class="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-flow-muted/20 text-flow-signal transition-all duration-300 ease-out hover:border-flow-signal hover:bg-flow-signal hover:text-flow-void"
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
withDefaults(defineProps<{
  ariaLabel?: string
}>(), {
  ariaLabel: 'Explore feature',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>
