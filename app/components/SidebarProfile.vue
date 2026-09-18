<template>
  <div class="flex items-center px-2 py-2 cursor-pointer transition-colors group"
    :class="[isDark ? 'hover:bg-onyx-card' : 'hover:bg-gray-50', minimized ? 'justify-center' : 'gap-3']">
    <div class="w-9 h-9 flex items-center justify-center text-xs font-bold flex-none"
      :class="isDark ? 'bg-candy-orange/[0.15] text-candy-orange' : 'bg-candy-orange/10 text-candy-orange'">
      {{ userInitials }}
    </div>
    <div v-if="!minimized" class="flex-1 min-w-0">
      <p class="text-sm font-semibold truncate"
        :class="isDark ? 'text-white' : 'text-gray-900'">{{ displayName }}</p>
      <p class="text-[14px] truncate"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'">{{ displayEmail }}</p>
    </div>
    <Icon v-if="!minimized" name="ph:caret-up-down" class="w-4 h-4 flex-none text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
</template>

<script setup>
const props = defineProps({
  user: { type: Object, default: null },
  minimized: { type: Boolean, default: false }
})
defineEmits(['logout'])

const { isDark } = useTheme()

const displayName = computed(() => props.user?.full_name || 'FlowVision User')
const displayEmail = computed(() => props.user?.email || 'user@flowvision.com')
const userInitials = computed(() => {
  const name = displayName.value
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
})
</script>
