<template>
  <div class="relative flex items-center px-2 py-2 cursor-pointer transition-colors group"
    :class="[isDark ? 'hover:bg-onyx-card' : 'hover:bg-gray-50', minimized ? 'justify-center' : 'gap-3']">
    <div class="w-9 h-9 flex items-center justify-center text-xs font-bold flex-none"
      :class="isDark ? 'bg-candy-orange/[0.15] text-candy-orange' : 'bg-candy-orange/10 text-candy-orange'">
      {{ userInitials }}
    </div>
    <div v-if="!minimized" class="flex-1 min-w-0">
      <p class="text-sm font-semibold truncate"
        :class="isDark ? 'text-white' : 'text-gray-900'">{{ displayName }}</p>
      <p class="text-sm truncate"
        :class="isDark ? 'text-gray-400' : 'text-white-muted'">{{ displayEmail }}</p>
    </div>
    <Icon v-if="!minimized" name="ph:caret-up-down" class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex-none text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
=======
  <AppSidebarProfile
    :user="user"
    :minimized="minimized"
    accent="orange"
    fallback-name="FlowVision User"
    @logout="emit('logout')"
  />
</template>

<script setup>
import AppSidebarProfile from '~/components/shared/AppSidebarProfile.vue'

defineProps({
  user: { type: Object, default: null },
  minimized: { type: Boolean, default: false }
})
const emit = defineEmits(['logout'])
</script>
