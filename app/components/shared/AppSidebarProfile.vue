<template>
  <div>
    <div
      class="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
      :class="[isDark ? 'hover:bg-onyx-card' : 'hover:bg-gray-50', minimized ? 'justify-center px-0' : '']"
    >
      <div
        class="flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-bold"
        :class="accent === 'amber' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-candy-orange/10 text-candy-orange'"
        :title="minimized ? displayName : undefined"
      >
        {{ initials }}
      </div>
      <div v-if="!minimized" class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ displayName }}</p>
        <p class="truncate text-[14px]" :class="isDark ? 'text-gray-500' : 'text-gray-400'">{{ displayEmail }}</p>
      </div>
    </div>
    <button
      type="button"
      class="mt-2 flex items-center rounded-lg text-sm font-medium text-danger transition-colors hover:bg-danger/10"
      :class="minimized ? 'w-full justify-center p-2' : 'w-full gap-2 px-3 py-2'"
      :title="minimized ? 'Log out' : undefined"
      @click="emit('logout')"
    >
      <Icon name="ph:sign-out-light" class="h-5 w-5 flex-none" />
      <span v-if="!minimized">Log out</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ProfileUser {
  full_name?: string | null
  email?: string | null
}

const props = withDefaults(defineProps<{
  user?: ProfileUser | null
  minimized?: boolean
  accent?: 'orange' | 'amber'
  fallbackName?: string
}>(), {
  user: null,
  minimized: false,
  accent: 'orange',
  fallbackName: 'FlowVision User',
})

const emit = defineEmits<{ (e: 'logout'): void }>()

const { isDark } = useTheme()

const displayName = computed(() => props.user?.full_name || props.fallbackName)
const displayEmail = computed(() => props.user?.email || '')
const initials = computed(() => {
  const parts = displayName.value.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return displayName.value.substring(0, 2).toUpperCase()
})
</script>
