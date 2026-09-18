<template>
  <div class="w-full h-[100dvh] flex flex-col md:flex-row overflow-hidden font-dashboard transition-colors duration-300"
    :class="isDark ? 'bg-onyx-black text-white' : 'bg-white-surface text-onyx-black'">

    <!-- Mobile Top Bar -->
    <div
      class="fv-enter-header md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-onyx-border bg-white dark:bg-onyx-card sticky top-0 z-50"
      :class="entranceVisibleClass"
    >
      <div class="flex items-center gap-3">
        <button @click="mobileMenuOpen = true" class="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-onyx-black/50 transition">
          <Icon name="ph:list" class="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 flex items-center justify-center">
            <img :src="brandLogo" alt="FlowVision Logo" class="w-6 h-6" />
          </div>
          <span class="text-base font-bold text-gray-900 dark:text-white tracking-tight">FlowVision</span>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <!-- Sample Mobile Profile -->
        <div class="flex items-center justify-center w-8 h-8 bg-candy-orange text-white text-xs font-bold font-primary shadow-sm">
          JD
        </div>
      </div>
    </div>

    <!-- Mobile Slide-out Overlay -->
    <Teleport to="body">
      <Transition name="overlay">
        <div v-if="mobileMenuOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden" @click="mobileMenuOpen = false"></div>
      </Transition>
      <Transition name="slide-menu">
        <aside v-if="mobileMenuOpen"
          class="fixed left-0 top-0 bottom-0 w-[280px] z-[70] md:hidden overflow-y-auto flex flex-col"
          :class="isDark ? 'bg-onyx-card border-r border-onyx-border' : 'bg-white border-r border-gray-200'">
          <div class="p-4 flex-none border-b" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 flex items-center justify-center">
                  <img :src="brandLogo" alt="FlowVision Logo" class="w-6 h-6" />
                </div>
                <span class="text-lg font-bold text-gray-900 dark:text-white tracking-tight">FlowVision</span>
              </div>
              <button @click="mobileMenuOpen = false" class="p-2 hover:bg-gray-100 dark:hover:bg-onyx-black/50 transition">
                <Icon name="ph:x" class="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <!-- Mobile Profile Details -->
            <div class="flex items-center gap-3 mt-6 pb-2">
              <div class="w-10 h-10 bg-candy-orange text-white flex items-center justify-center font-bold text-lg">
                JD
              </div>
              <div>
                <p class="text-sm font-bold text-gray-900 dark:text-white leading-tight">Juan Dela Cruz</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Citizen Account</p>
              </div>
            </div>
          </div>
          
          <nav class="flex-1 px-4 overflow-y-auto py-6">
            <div class="mb-4">
              <p class="px-3 mb-3 text-[13px] font-bold uppercase tracking-wider text-gray-400">Citizen Services</p>
              <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to"
                class="flex items-center gap-3 px-3 py-3 transition-all duration-200 group mb-1 border-l-2"
                :class="isActive(item.to)
                  ? (isDark ? 'border-candy-orange bg-candy-orange/10 text-candy-orange' : 'border-candy-orange bg-candy-orange/10 text-candy-orange')
                  : (isDark ? 'border-transparent text-gray-400 hover:text-white hover:bg-onyx-black/50 hover:border-gray-600' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300')"
                @click="mobileMenuOpen = false"
              >
                <Icon :name="item.icon" class="w-5 h-5 transition-transform group-hover:scale-110" 
                  :class="isActive(item.to) ? 'text-candy-orange' : ''" />
                <span class="text-sm font-medium">{{ item.label }}</span>
              </NuxtLink>
            </div>
          </nav>
        </aside>
      </Transition>
    </Teleport>

    <!-- Desktop Sidebar -->
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <aside
        class="fv-enter-sidebar relative z-30 hidden md:flex h-full flex-shrink-0 flex-col overflow-hidden border-r transition-all duration-300"
        :class="[isDark ? 'bg-onyx-sidebar border-onyx-border' : 'bg-white border-gray-200', entranceVisibleClass, isSidebarMinimized ? 'w-[72px]' : 'w-64']"
      >
        <!-- Brand -->
        <div class="px-4 pt-6 pb-4 flex-none border-b" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
          <div class="flex items-center mb-6" :class="isSidebarMinimized ? 'justify-center flex-col gap-4' : 'gap-2'">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 flex items-center justify-center">
                <img :src="brandLogo" alt="FlowVision Logo" class="w-6 h-6" />
              </div>
              <span v-if="!isSidebarMinimized" class="text-base font-bold text-gray-900 dark:text-white tracking-tight truncate">FlowVision</span>
            </div>
            <button @click="isSidebarMinimized = !isSidebarMinimized" class="p-1.5 hover:bg-gray-100 dark:hover:bg-onyx-card transition"
              :class="isSidebarMinimized ? '' : 'ml-auto'">
              <Icon :name="isSidebarMinimized ? 'ph:list-light' : 'ph:caret-left-light'" class="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          <!-- Sample Citizen Profile -->
          <div v-if="!isSidebarMinimized" class="flex items-center gap-3 mt-4 px-2">
            <div class="w-10 h-10 bg-candy-orange text-white flex items-center justify-center font-bold font-primary text-lg flex-shrink-0">
              JD
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">Juan Dela Cruz</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">Citizen Account</p>
            </div>
          </div>
          <div v-else class="flex justify-center mt-4">
             <div class="w-10 h-10 bg-candy-orange text-white flex items-center justify-center font-bold font-primary text-lg cursor-pointer">
              JD
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 overflow-y-auto py-6">
          <div class="mb-4">
            <p v-if="!isSidebarMinimized" class="px-4 mb-3 text-[13px] font-bold uppercase tracking-wider text-gray-400">Citizen Services</p>
            <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to"
              class="flex items-center gap-3 py-3 transition-all duration-200 group mb-1 relative"
              :class="[
                isActive(item.to)
                  ? (isDark ? 'bg-candy-orange/10 text-candy-orange border-l-2 border-candy-orange' : 'bg-candy-orange/10 text-candy-orange border-l-2 border-candy-orange')
                  : (isDark ? 'border-l-2 border-transparent text-gray-400 hover:text-white hover:bg-onyx-black/50 hover:border-gray-600' : 'border-l-2 border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300'),
                isSidebarMinimized ? 'px-0 justify-center border-l-0 border-b-2' : 'px-4'
              ]"
            >
              <Icon :name="item.icon" class="w-5 h-5 transition-transform group-hover:scale-110" 
                :class="isActive(item.to) ? 'text-candy-orange' : ''" />
              <span v-if="!isSidebarMinimized" class="text-sm font-medium">{{ item.label }}</span>
              <!-- Tooltip for minimized state -->
              <div v-if="isSidebarMinimized" class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                {{ item.label }}
              </div>
            </NuxtLink>
          </div>
        </nav>

        <!-- Bottom Actions -->
        <div class="flex-none border-t p-3 flex justify-center"
          :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
           <button @click="toggleTheme" class="w-full flex items-center justify-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-onyx-black/50 transition text-gray-600 dark:text-gray-300">
             <Icon :name="isDark ? 'ph:sun' : 'ph:moon'" class="w-5 h-5" />
             <span v-if="!isSidebarMinimized" class="text-sm">Toggle Theme</span>
           </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="h-full min-w-0 flex-1 overflow-y-auto p-4 md:p-8" :class="isDark ? 'bg-onyx-black' : 'bg-white-surface'">
        <div class="w-full h-full max-w-7xl mx-auto">
          <slot />
        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-area-bottom"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'">
      <div class="flex items-center justify-around px-2 py-2">
        <NuxtLink v-for="item in navItems" :key="item.to"
          :to="item.to"
          class="flex flex-col items-center gap-1 px-3 py-1.5 transition-colors min-w-[56px] border-t-2"
          :class="isActive(item.to)
            ? 'text-candy-orange border-candy-orange'
            : isDark ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-600'">
          <Icon :name="item.icon" class="w-5 h-5" />
          <span class="text-[13px] font-semibold">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from '~/composables/useTheme'
import { provideDashboardEntrance } from '~/composables/useDashboardEntrance'

const { isDark, toggleTheme } = useTheme()
const route = useRoute()
const { entranceVisibleClass } = provideDashboardEntrance()

const brandLogo = computed(() => (isDark.value ? '/logo/new-logo.png' : '/logo/new-logo-dark.png'))

const mobileMenuOpen = ref(false)
const isSidebarMinimized = ref(false)

const isActive = (path) => {
  if (path === '/public-users' && route.path === '/public-users') return true
  if (path !== '/public-users' && route.path.startsWith(path)) return true
  return false
}

const navItems = [
  { label: 'Document Tracking', to: '/public-users', icon: 'ph:magnifying-glass' },
  { label: 'AI Assistant', to: '/public-users/ai', icon: 'ph:magic-wand' },
  { label: 'Profile', to: '/public-users/profile', icon: 'ph:user' }
]
</script>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.slide-menu-enter-active,
.slide-menu-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-menu-enter-from,
.slide-menu-leave-to {
  transform: translateX(-100%);
}
</style>
