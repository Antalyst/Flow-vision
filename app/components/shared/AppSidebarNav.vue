<template>
  <div>
    <div v-for="(group, gIndex) in groups" :key="group.title" :class="gIndex > 0 ? 'mt-2.5' : ''">
      <p
        v-if="!minimized"
        class="px-4 mb-1 text-[13px] font-bold uppercase tracking-widest"
        :class="isDark ? 'text-gray-500' : 'text-gray-400'"
      >
        {{ group.title }}
      </p>
      <div v-else class="h-3 border-t mb-1 mx-4" :class="isDark ? 'border-onyx-border' : 'border-gray-200'" />

      <div class="space-y-0">
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="nav-item w-full relative rounded-lg mx-2"
          :class="[
            isActive(item.to) ? activeClass : '',
            minimized ? 'justify-center px-0 mx-0' : 'px-3 py-2',
          ]"
          :title="minimized ? item.label : undefined"
        >
          <Icon :name="item.icon" class="w-5 h-5 flex-none" />
          <span v-if="!minimized" class="truncate">{{ item.label }}</span>

          <span
            v-if="!minimized && item.badgeCount"
            class="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[13px] font-bold text-white"
            :class="item.badgeColor === 'red' ? 'bg-red-500' : accentBadgeClass"
          >
            {{ item.badgeCount > 9 ? '9+' : item.badgeCount }}
          </span>

          <div
            v-if="minimized && item.badgeCount"
            class="absolute top-2 right-2 w-2 h-2 rounded-full"
            :class="item.badgeColor === 'red' ? 'bg-red-500' : accentDotClass"
          />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface NavItem {
  to: string
  label: string
  icon: string
  /** Resolved by the calling portal-specific wrapper — this component never fetches counts itself. */
  badgeCount?: number
  badgeColor?: 'accent' | 'red'
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

const props = withDefaults(defineProps<{
  groups: NavGroup[]
  minimized?: boolean
  /** Controls the active-state accent color — keeps one visual component usable across portals with distinct brand colors. */
  accent?: 'orange' | 'amber'
}>(), {
  minimized: false,
  accent: 'orange',
})

const { isDark } = useTheme()
const route = useRoute()

const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)

const activeClass = computed(() => (props.accent === 'amber' ? 'nav-item-amber-active' : 'nav-item-active'))
const accentBadgeClass = computed(() => (props.accent === 'amber' ? 'bg-amber-500' : 'bg-candy-orange'))
const accentDotClass = computed(() => (props.accent === 'amber' ? 'bg-amber-500' : 'bg-candy-orange'))
</script>

<style scoped>
.nav-item-amber-active {
  @apply text-amber-600 bg-amber-500/[0.08] dark:text-amber-400 dark:bg-amber-500/[0.12] relative;
}
.nav-item-amber-active::before {
  content: '';
  @apply absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-500 rounded-full;
}
</style>
