<template>
  <div class="w-full h-full min-h-screen flex flex-col md:flex-row overflow-hidden font-dashboard transition-colors duration-300"
    :class="isDark ? 'bg-rich-black text-white' : 'bg-surface text-heading-dark'">

    <!-- Mobile Top Bar -->
    <div
      class="fv-enter-header md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-card-border bg-white dark:bg-card-dark sticky top-0 z-50"
      :class="entranceVisibleClass"
    >
      <button @click="mobileMenuOpen = true" class="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-rich-black/50 transition">
        <Icon name="ph:list" class="w-6 h-6 text-gray-700 dark:text-gray-300" />
      </button>
      <div class="flex items-center gap-2">
         <div class="w-14 h-14 rounded-xl flex items-center justify-center">
              <img :src="brandLogo" alt="FlowVision Logo" class="w-10 h-10" />
            </div>
        <span class="text-base font-bold text-gray-900 dark:text-white tracking-tight">FlowVision</span>
      </div>
      <button class="p-2 -mr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-rich-black/50 transition">
        <Icon name="ph:bell" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </button>
    </div>

    <!-- Mobile Slide-out Overlay -->
    <Teleport to="body">
      <Transition name="overlay">
        <div v-if="mobileMenuOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden" @click="mobileMenuOpen = false"></div>
      </Transition>
      <Transition name="slide-menu">
        <aside v-if="mobileMenuOpen"
          class="fixed left-0 top-0 bottom-0 w-[280px] z-[70] md:hidden overflow-y-auto"
          :class="isDark ? 'bg-card-dark border-r border-card-border' : 'bg-white border-r border-gray-200'">
          <div class="p-4">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-2.5">
                <div class="w-14 h-14 rounded-xl flex items-center justify-center">
                  <img :src="brandLogo" alt="FlowVision Logo" class="w-10 h-10" />
                </div>
                <span class="text-lg font-bold text-gray-900 dark:text-white tracking-tight">FlowVision</span>
              </div>
              <button @click="mobileMenuOpen = false" class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-rich-black/50 transition">
                <Icon name="ph:x" class="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <!-- Reuse nav content -->
            <SidebarNav />
            <SidebarProfile :user="auth.user" @logout="auth.logout()" />
          </div>
        </aside>
      </Transition>
    </Teleport>

    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <!-- Desktop Sidebar -->
      <aside
        class="fv-enter-sidebar relative z-30 hidden md:flex md:w-64 h-full flex-shrink-0 flex-col overflow-hidden border-r"
        :class="[isDark ? 'bg-sidebar-dark border-card-border' : 'bg-white border-gray-200', entranceVisibleClass]"
      >

        <!-- Brand -->
        <div class="px-5 pt-5 pb-2 flex-none">
          <div class="flex items-center gap-2  mb-6">
            <div class="w-14 h-14 rounded-xl flex items-center justify-center">
              <img :src="brandLogo" alt="FlowVision Logo" class="w-10 h-10" />
            </div>
            <span class="text-lg font-bold text-gray-900 dark:text-white tracking-tight">FlowVision</span>
            <button class="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-card-dark transition">
              <Icon name="ph:sidebar-simple" class="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <!-- Search -->
          <div class="relative mb-5">
            <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search anything"
              class="w-full pl-9 pr-16 py-2.5 rounded-xl text-xs outline-none transition border"
              :class="isDark
                ? 'bg-rich-black/50 border-card-border text-gray-300 placeholder:text-gray-500 focus:border-rich-orange/50'
                : 'bg-gray-50 border-gray-200 text-gray-700 placeholder:text-gray-400 focus:border-rich-orange/50'" />
            <div class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                :class="isDark ? 'bg-card-border text-gray-400' : 'bg-gray-200 text-gray-500'">⌘</kbd>
              <kbd class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                :class="isDark ? 'bg-card-border text-gray-400' : 'bg-gray-200 text-gray-500'">K</kbd>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 overflow-y-auto">
          <SidebarNav />
        </nav>

        <!-- Bottom Profile -->
        <div class="flex-none border-t px-3 py-3"
          :class="isDark ? 'border-card-border' : 'border-gray-200'">
          <SidebarProfile :user="auth.user" @logout="auth.logout()" />
        </div>
      </aside>

      <!-- Main Content -->
      <main class="relative z-0 h-full min-w-0 flex-1 overflow-y-auto p-4 md:p-8" :class="isDark ? 'bg-rich-black' : 'bg-surface'">
        <div class="w-full">
          <ClientOrgSetup v-if="auth.needsOrgSetup" />
          <slot v-else />
        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-area-bottom"
      :class="isDark ? 'bg-card-dark border-card-border' : 'bg-white border-gray-200'">
      <div class="flex items-center justify-around px-2 py-2">
        <NuxtLink v-for="item in mobileNavItems" :key="item.to"
          :to="item.to"
          class="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]"
          :class="isActive(item.to)
            ? 'text-rich-orange'
            : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'">
          <Icon :name="item.icon" class="w-5 h-5" />
          <span class="text-[10px] font-semibold">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import ClientOrgSetup from '~/components/client/org.vue'

const auth = useAuthStore()
const { isDark } = useTheme()
const route = useRoute()
const { entranceVisibleClass } = provideDashboardEntrance()

// Theme-aware branding: dark logo for light surfaces, white logo for dark.
const brandLogo = computed(() => (isDark.value ? '/logo/new-logo.png' : '/logo/new-logo-dark.png'))

const mobileMenuOpen = ref(false)

const mobileNavItems = [
  { to: '/client/dashboard', label: 'Dashboard', icon: 'ph:squares-four-fill' },
  { to: '/client/documents', label: 'Documents', icon: 'ph:files-fill' },
  { to: '/client/activity', label: 'Activity', icon: 'ph:clock-counter-clockwise-fill' },
  { to: '/client/ai', label: 'AI', icon: 'ph:brain-fill' },
  { to: '/client/reports', label: 'Reports', icon: 'ph:chart-bar-fill' },
  { to: '/client/settings', label: 'Settings', icon: 'ph:gear-six-fill' },
]

const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`)

// Close the mobile drawer whenever navigation occurs.
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})

onMounted(() => {
  if (auth.isLoggedIn && !auth.currentOrg) {
    auth.fetchMyOrg()
  }
  const { refresh } = useClientNotificationBadge()
  refresh()
})
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

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
  transition: transform 0.3s ease;
}
.slide-menu-enter-from,
.slide-menu-leave-to {
  transform: translateX(-100%);
}
</style>
