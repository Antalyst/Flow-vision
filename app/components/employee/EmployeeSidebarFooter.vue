<template>
  <div>
    <div class="flex items-center gap-3 px-2 py-2 rounded-xl"
      :class="isDark ? 'hover:bg-onyx-card' : 'hover:bg-gray-50'">
      <div class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-none bg-sky-500/10 text-sky-600 dark:text-sky-400">
        {{ initials }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold truncate" :class="isDark ? 'text-white' : 'text-gray-900'">{{ displayName }}</p>
        <p class="text-[11px] truncate" :class="isDark ? 'text-gray-500' : 'text-gray-400'">{{ displayEmail }}</p>
      </div>
    </div>
    <button
      type="button"
      class="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-red-500 hover:bg-red-500/10"
      @click="emit('logout')"
    >
      <Icon name="ph:sign-out" class="w-4 h-4" />
      Log out
    </button>
  </div>
</template>

<script setup>
const props = defineProps({ user: { type: Object, default: null } })
const emit = defineEmits(['logout'])
const { isDark } = useTheme()

const displayName  = computed(() => props.user?.full_name || 'Employee')
const displayEmail = computed(() => props.user?.email    || '')
const initials = computed(() => {
  const parts = displayName.value.split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts.at(-1)[0]).toUpperCase()
    : displayName.value.substring(0, 2).toUpperCase()
})
</script>
