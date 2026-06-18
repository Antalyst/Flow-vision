<template>
  <div
    class="w-full h-full min-h-screen flex flex-col md:flex-row overflow-hidden font-dashboard transition-colors duration-300"
    :class="isDark ? 'bg-onyx-black text-white' : 'bg-white-surface text-onyx-black'"
  >
    <!-- ── Mobile top bar ────────────────────────────────────────────── -->
    <div
      class="md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-50"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
    >
      <button class="p-2 -ml-2 rounded-xl transition hover:bg-gray-100 dark:hover:bg-onyx-black/50" @click="mobileMenuOpen = true">
        <Icon name="ph:list" class="w-6 h-6 text-gray-700 dark:text-gray-300" />
      </button>
      <div class="flex items-center gap-2">
        <img :src="brandLogo" alt="FlowVision" class="w-8 h-8" />
        <span class="text-base font-bold tracking-tight text-gray-900 dark:text-white">FlowVision</span>
      </div>
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        Messenger
      </span>
    </div>

    <!-- ── Mobile slide-out drawer ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="overlay">
        <div
          v-if="mobileMenuOpen"
          class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden"
          @click="mobileMenuOpen = false"
        />
      </Transition>
      <Transition name="slide-menu">
        <aside
          v-if="mobileMenuOpen"
          class="fixed left-0 top-0 bottom-0 w-[280px] z-[70] md:hidden overflow-y-auto"
          :class="isDark ? 'bg-onyx-card border-r border-onyx-border' : 'bg-white border-r border-gray-200'"
        >
          <div class="p-4">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-2.5">
                <img :src="brandLogo" alt="FlowVision" class="w-8 h-8" />
                <span class="text-lg font-bold tracking-tight text-gray-900 dark:text-white">FlowVision</span>
              </div>
              <button class="p-2 rounded-xl transition hover:bg-gray-100 dark:hover:bg-onyx-black/50" @click="mobileMenuOpen = false">
                <Icon name="ph:x" class="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <MessengerNav />
            <MessengerSidebarFooter :user="auth.user" @logout="auth.logout()" />
          </div>
        </aside>
      </Transition>
    </Teleport>

    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <!-- ── Desktop sidebar ──────────────────────────────────────────── -->
      <aside
        class="hidden md:flex md:w-60 h-full flex-shrink-0 flex-col border-r"
        :class="isDark ? 'bg-onyx-sidebar border-onyx-border' : 'bg-white border-gray-200'"
      >
        <!-- Brand -->
        <div class="px-5 pt-5 pb-2 flex-none">
          <div class="flex items-center gap-2.5 mb-5">
            <img :src="brandLogo" alt="FlowVision" class="w-9 h-9" />
            <span class="text-base font-bold tracking-tight text-gray-900 dark:text-white">FlowVision</span>
          </div>

          <!-- Role + org badges -->
          <div class="flex flex-wrap items-center gap-2 mb-5">
            <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Messenger
            </span>
            <span
              v-if="auth.user?.org_id"
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :class="isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'"
            >
              <Icon name="ph:building-office" class="w-3 h-3" />
              Org {{ auth.user.org_id }}
            </span>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 overflow-y-auto">
          <MessengerNav />
        </nav>

        <!-- Bottom profile -->
        <div
          class="flex-none border-t px-3 py-3"
          :class="isDark ? 'border-onyx-border' : 'border-gray-200'"
        >
          <MessengerSidebarFooter :user="auth.user" @logout="auth.logout()" />
        </div>
      </aside>

      <!-- ── Main content ─────────────────────────────────────────────── -->
      <main
        class="relative z-0 h-full min-w-0 flex-1 overflow-y-auto p-4 md:p-8"
        :class="isDark ? 'bg-onyx-black' : 'bg-white-surface'"
      >
        <div
          v-if="!auth.user?.org_id"
          class="flex h-full min-h-[320px] items-center justify-center"
        >
          <div
            class="w-full max-w-sm rounded-xl border p-8 text-center"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
          >
            <Icon name="ph:building-office-slash" class="mx-auto mb-4 w-12 h-12 text-amber-500/60" />
            <h2 class="text-lg font-bold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">No organisation assigned</h2>
            <p class="text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              Your account hasn't been linked to an organisation yet. Contact your administrator.
            </p>
          </div>
        </div>

        <div v-else class="w-full">
          <slot />
        </div>
      </main>
    </div>

    <!-- ── Mobile bottom nav ─────────────────────────────────────────── -->
    <nav
      class="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-area-bottom"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
    >
      <div class="flex items-center justify-around px-2 py-2">
        <NuxtLink
          v-for="item in mobileNavItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]"
          :class="isActive(item.to) ? 'text-amber-500' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'"
        >
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

const auth = useAuthStore()
const { isDark } = useTheme()
const route = useRoute()

const brandLogo = computed(() => isDark.value ? '/logo/new-logo.png' : '/logo/new-logo-dark.png')
const mobileMenuOpen = ref(false)

const mobileNavItems = [
  { to: '/messenger/dashboard',   label: 'Dashboard',   icon: 'ph:squares-four-fill' },
  { to: '/messenger/scan',        label: 'Scan',        icon: 'ph:scan-fill' },
  { to: '/messenger/deliveries',  label: 'Deliveries',  icon: 'ph:package-fill' },
  { to: '/messenger/settings',    label: 'Settings',    icon: 'ph:gear-six-fill' },
]

const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`)

watch(() => route.path, () => { mobileMenuOpen.value = false })

onMounted(() => {
  if (auth.isLoggedIn && !auth.currentOrg) {
    auth.fetchMyOrg()
  }
  const { fetchNotifications } = useMessengerNotifications()
  fetchNotifications(true)
})
</script>

<style scoped>
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }

.overlay-enter-active, .overlay-leave-active { transition: opacity 0.3s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.slide-menu-enter-active, .slide-menu-leave-active { transition: transform 0.3s ease; }
.slide-menu-enter-from, .slide-menu-leave-to { transform: translateX(-100%); }
</style>
