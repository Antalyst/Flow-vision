<template>
  <div
    class="flex items-center justify-between gap-4 rounded-xl border px-4 py-4"
    :class="isDark ? 'border-onyx-border bg-onyx-card/40' : 'border-zinc-200 bg-white-surface'"
  >
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">{{ label }}</p>
      <p class="mt-0.5 text-xs leading-relaxed" :class="isDark ? 'text-white-muted' : 'text-gray-500'">
        {{ description }}
      </p>
    </div>

    <button
      type="button"
      role="switch"
      :aria-checked="checked"
      :disabled="disabled"
      class="relative h-8 w-14 flex-shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-candy-orange/40 disabled:opacity-50"
      :class="checked ? 'bg-candy-orange' : (isDark ? 'bg-onyx-border' : 'bg-gray-300')"
      @click="$emit('update:checked', !checked)"
    >
      <span
        class="absolute top-1 h-6 w-6 rounded-full bg-white-pure shadow transition"
        :class="checked ? 'left-7' : 'left-1'"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  description: string
  checked: boolean
  disabled?: boolean
}>()

defineEmits<{
  'update:checked': [value: boolean]
}>()

const { isDark } = useTheme()
</script>
