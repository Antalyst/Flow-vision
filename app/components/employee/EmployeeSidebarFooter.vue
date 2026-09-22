<template>
  <div>
    <div class="flex items-center gap-3 px-2 py-2 rounded-lg transition"
      :class="[isDark ? 'hover:bg-onyx-card' : 'hover:bg-gray-50', minimized ? 'justify-center px-0' : '']">
      <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-none bg-candy-orange/10 text-candy-orange"
           :title="minimized ? displayName : undefined">
        {{ initials }}
      </div>
      <div v-if="!minimized" class="flex-1 min-w-0">
        <p class="text-sm font-semibold truncate" :class="isDark ? 'text-white' : 'text-gray-900'">{{ displayName }}</p>
        <p class="text-xs truncate" :class="isDark ? 'text-gray-400' : 'text-white-muted'">{{ displayEmail }}</p>
      </div>
    </div>
    <button
      type="button"
      class="mt-2 flex items-center rounded-lg text-sm font-medium transition-colors text-danger hover:bg-danger/10"
      :class="minimized ? 'w-full justify-center p-2' : 'w-full gap-2 px-3 py-2'"
      :title="minimized ? 'Log out' : undefined"
      @click="emit('logout')"
    >
      <Icon name="ph:sign-out-light" class="w-5 h-5 flex-none" />
      <span v-if="!minimized">Log out</span>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({ 
  user: { type: Object, default: null },
  minimized: { type: Boolean, default: false }
})
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
