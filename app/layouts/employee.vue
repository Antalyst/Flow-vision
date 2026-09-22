<template>
  <div
    class="w-full h-[100dvh] flex flex-col md:flex-row overflow-hidden font-dashboard transition-colors duration-300"
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
      <div class="flex items-center gap-1">
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-candy-orange/10 text-candy-orange border border-candy-orange/20">
          Employee
        </span>
      </div>
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
            <EmployeeNav />
            <EmployeeSidebarFooter :user="auth.user" @logout="auth.logout()" />
          </div>
        </aside>
      </Transition>
    </Teleport>

    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <!-- ── Desktop sidebar ──────────────────────────────────────────── -->
      <aside
        class="hidden md:flex h-full flex-shrink-0 flex-col overflow-hidden border-r transition-all duration-300"
        :class="[isDark ? 'bg-onyx-sidebar border-onyx-border' : 'bg-white border-gray-200', isSidebarMinimized ? 'w-[72px]' : 'w-64']"
      >
        <!-- Brand -->
        <div class="px-4 pt-5 pb-2 flex-none">
          <div class="flex items-center mb-6" :class="isSidebarMinimized ? 'justify-center flex-col gap-4' : 'gap-2'">
            <div class="flex items-center gap-2">
              <div class="w-10 h-10 flex items-center justify-center">
                <img :src="brandLogo" alt="FlowVision Logo" class="w-8 h-8" />
              </div>
              <span v-if="!isSidebarMinimized" class="text-base font-bold tracking-tight text-gray-900 dark:text-white truncate">FlowVision</span>
            </div>
            <button @click="isSidebarMinimized = !isSidebarMinimized" class="p-1.5 hover:bg-gray-100 dark:hover:bg-onyx-card transition"
              :class="isSidebarMinimized ? '' : 'ml-auto'">
              <Icon :name="isSidebarMinimized ? 'ph:list-light' : 'ph:caret-left-light'" class="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <!-- Role badge + org scope pill -->
          <div v-if="!isSidebarMinimized" class="flex flex-col gap-2 mb-5">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-candy-orange/10 text-candy-orange border border-candy-orange/20">
                <span class="w-1.5 h-1.5 rounded-full bg-candy-orange"></span>
                Employee
              </span>
              <span
                v-if="auth.currentOrg?.name"
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold truncate max-w-[140px]"
                :class="isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'"
                :title="auth.currentOrg.name"
              >
                <Icon name="ph:buildings-light" class="w-3 h-3 flex-shrink-0" />
                {{ auth.currentOrg.name }}
              </span>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-0 overflow-y-auto">
          <EmployeeNav :minimized="isSidebarMinimized" />
        </nav>

        <!-- Bottom profile -->
        <div
          class="flex-none border-t px-3 py-3"
          :class="isDark ? 'border-onyx-border' : 'border-gray-200'"
        >
          <EmployeeSidebarFooter :user="auth.user" :minimized="isSidebarMinimized" @logout="auth.logout()" />
        </div>
      </aside>

      <!-- ── Main content ─────────────────────────────────────────────── -->
      <main
        class="relative z-0 h-full min-w-0 flex-1 overflow-y-auto p-4 md:p-8"
        :class="isDark ? 'bg-onyx-black' : 'bg-white-surface'"
      >
        <!-- Org-scope guard: org_id must be present for employee context -->
        <div
          v-if="!auth.user?.org_id"
          class="flex h-full min-h-[320px] items-center justify-center"
        >
          <div
            class="w-full max-w-sm rounded-xl border p-8 text-center"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
          >
            <Icon name="ph:buildings-slash-light" class="mx-auto mb-4 w-12 h-12 text-candy-orange/60" />
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
          :class="isActive(item.to) ? 'text-candy-orange' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'"
        >
          <Icon :name="item.icon" class="w-5 h-5" />
          <span class="text-xs font-semibold">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <!-- AI Overlay Chat -->
    <AiOverlay role="employee" scope="LOCAL" />

    <!-- ── Global Toast Notification ──────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="toast-fade">
        <div
          v-if="toast.visible"
          class="fixed bottom-24 right-6 z-[100] flex max-w-md items-center gap-2.5 rounded-xl border px-5 py-3.5 text-sm font-semibold shadow-2xl backdrop-blur-md md:bottom-8"
          :class="[
            toast.type === 'error'
              ? 'border-danger/30 bg-red-950/90 text-red-200'
              : toast.type === 'warning'
                ? 'border-warning/30 bg-amber-950/90 text-amber-200'
                : 'border-success/30 bg-gray-900/95 text-emerald-300',
          ]"
          role="status"
        >
          <Icon
            :name="
              toast.type === 'error'
                ? 'ph:warning-circle-fill'
                : toast.type === 'warning'
                  ? 'ph:warning-fill'
                  : 'ph:check-circle-fill'
            "
            class="h-5 w-5 flex-none"
            :class="
              toast.type === 'error'
                ? 'text-danger'
                : toast.type === 'warning'
                  ? 'text-warning'
                  : 'text-success'
            "
          />
          <span class="flex-1 text-xs leading-snug">{{ toast.message }}</span>
          <button type="button" class="ml-2 opacity-60 hover:opacity-100" @click="dismissToast">
            <Icon name="ph:x-bold" class="h-3.5 w-3.5" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useRoute } from '#imports'
import AiOverlay from '~/components/ai/AiOverlay.vue'
import { useEmployeeToast } from '~/composables/useEmployeeToast'
import { useInboundDispatchRealtime } from '~/composables/useInboundDispatchRealtime'

const auth = useAuthStore()
const { isDark } = useTheme()
const route = useRoute()
const { toast, dismiss: dismissToast } = useEmployeeToast()

const brandLogo = computed(() => isDark.value ? '/logo/new-logo.png' : '/logo/new-logo-dark.png')
const mobileMenuOpen = ref(false)
const isSidebarMinimized = ref(false)

const mobileNavItems = [
  { to: '/employee/dashboard', label: 'Dashboard', icon: 'ph:squares-four-fill' },
  { to: '/employee/office',    label: 'Office',     icon: 'ph:buildings-fill' },
  { to: '/employee/working',   label: 'Working',    icon: 'ph:briefcase-fill' },
  { to: '/employee/settings',  label: 'Settings',   icon: 'ph:gear-six-fill' },
]

const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`)

watch(() => route.path, () => { mobileMenuOpen.value = false })

// ── Global Realtime Inbound Dispatch Subscription ──────────────────────────
const layoutOffices = ref([])
const employeeOfficeIds = computed(() => {
  const ids = layoutOffices.value.map((o) => o.id)
  if (auth.user?.office_id) ids.push(auth.user.office_id)
  if (auth.user?.current_office_id) ids.push(auth.user.current_office_id)
  if (Array.isArray(auth.user?.officeIds)) ids.push(...auth.user.officeIds)
  return ids
})
const orgIdComputed = computed(() => (auth.user?.org_id ? String(auth.user.org_id) : null))

useInboundDispatchRealtime(orgIdComputed, employeeOfficeIds)

const fetchLayoutOffices = async () => {
  const orgId = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return
  try {
    const res = await $fetch('/api/employee/my-offices', { params: { orgId, userId } })
    layoutOffices.value = res.data ?? []
  } catch {
    // silent
  }
}

onMounted(() => {
  if (auth.isLoggedIn && !auth.currentOrg) {
    auth.fetchMyOrg()
  }
  fetchLayoutOffices()
  const { fetchNotifications } = useEmployeeNotifications()
  const { hydrate, applyHandoffPolling } = useEmployeeSettings()
  hydrate()
  fetchNotifications(true)
  applyHandoffPolling()
})
</script>

<style scoped>
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }

.overlay-enter-active, .overlay-leave-active { transition: opacity 0.3s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.slide-menu-enter-active, .slide-menu-leave-active { transition: transform 0.3s ease; }
.slide-menu-enter-from, .slide-menu-leave-to { transform: translateX(-100%); }

.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
