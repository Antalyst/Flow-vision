<template>
  <section class="w-full space-y-6 pb-24 lg:pb-8 animate-fade-in" :class="isDark ? 'text-white' : 'text-onyx-black'">

    <!-- ── Page header ────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="mb-3 h-1 w-14 rounded-full bg-candy-orange" />
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">User Management</h1>
        <p class="mt-1 text-sm animate-pulse" :class="mutedClass">
          {{ auth.currentOrg?.name || '—' }} · org_id {{ auth.user?.org_id }}
        </p>
      </div>

      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow shadow-amber-500/20 transition-all duration-200 hover:scale-[1.02] hover:bg-amber-600 active:scale-[0.98]"
        @click="openProvisionDrawer"
      >
        <Icon name="ph:motorcycle-fill" class="h-4 w-4" />
        Provision Messenger
      </button>
    </div>

    <!-- ── Stat cards ──────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-xl border p-4 transition-all duration-300"
        :class="surfaceClass"
      >
        <div class="flex items-center gap-3">
          <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" :class="stat.iconBg">
            <Icon :name="stat.icon" class="h-4 w-4" :class="stat.iconColor" />
          </span>
          <div>
            <p class="text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ stat.value }}</p>
            <p class="text-[11px] font-medium" :class="mutedClass">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Filter tabs + search ────────────────────────────────────────── -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex rounded-xl border p-1" :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'">
        <button
          v-for="tab in TABS"
          :key="tab.value"
          type="button"
          class="rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-200"
          :class="activeTab === tab.value
            ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
            : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
          <span
            v-if="tabCount(tab.value) > 0"
            class="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            :class="tab.value === 'messenger'
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              : tab.value === 'employee'
              ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400'
              : (isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600')"
          >
            {{ tabCount(tab.value) }}
          </span>
        </button>
      </div>

      <div
        class="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 transition-all"
        :class="isDark ? 'border-onyx-border bg-onyx-black/40 focus-within:border-candy-orange' : 'border-gray-200 bg-white focus-within:border-candy-orange'"
      >
        <Icon name="ph:magnifying-glass" class="h-4 w-4 flex-shrink-0" :class="mutedClass" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search members…"
          class="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400 sm:w-52"
        />
      </div>
    </div>

    <!-- ── Member table ────────────────────────────────────────────────── -->
    <article class="overflow-hidden rounded-xl border transition-all duration-300" :class="surfaceClass">
      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead :class="isDark ? 'bg-onyx-black/50 text-gray-400' : 'bg-gray-50 text-gray-500'">
            <tr>
              <th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Member</th>
              <th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Role</th>
              <th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Status</th>
              <th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Joined</th>
              <th class="whitespace-nowrap px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>

          <tbody>
            <!-- Loading skeleton -->
            <template v-if="loading">
              <tr v-for="n in 5" :key="n" class="border-t" :class="borderClass">
                <td class="px-6 py-4" colspan="5">
                  <div class="flex items-center gap-3">
                    <div class="h-9 w-9 animate-pulse rounded-xl" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
                    <div class="flex-1 space-y-2">
                      <div class="h-3 w-36 animate-pulse rounded" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
                      <div class="h-2.5 w-48 animate-pulse rounded" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
                    </div>
                  </div>
                </td>
              </tr>
            </template>

            <!-- Data rows -->
            <template v-else>
              <tr
                v-for="member in filteredMembers"
                :key="member.user_id"
                class="border-t transition-colors duration-150"
                :class="[borderClass, isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50/80']"
              >
                <!-- Name + email -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                      :class="member.role === 'messenger'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'"
                    >
                      {{ initials(member.full_name) }}
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-semibold" :class="isDark ? 'text-gray-100' : 'text-gray-900'">
                        {{ member.full_name }}
                      </p>
                      <p class="truncate text-xs" :class="mutedClass">{{ member.email }}</p>
                    </div>
                  </div>
                </td>

                <!-- Role badge -->
                <td class="whitespace-nowrap px-6 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                    :class="member.role === 'messenger'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'"
                  >
                    <Icon
                      :name="member.role === 'messenger' ? 'ph:motorcycle-fill' : 'ph:briefcase-fill'"
                      class="h-3 w-3"
                    />
                    {{ member.role }}
                  </span>
                </td>

                <!-- Status toggle -->
                <td class="whitespace-nowrap px-6 py-4">
                  <button
                    type="button"
                    :title="member.status === 1 ? 'Click to deactivate' : 'Click to activate'"
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all hover:opacity-80"
                    :class="member.status === 1
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-400/10 text-gray-500 dark:text-gray-400'"
                    @click="handleToggleStatus(member)"
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      :class="member.status === 1 ? 'bg-emerald-500' : 'bg-gray-400'"
                    />
                    {{ member.status === 1 ? 'Active' : 'Inactive' }}
                  </button>
                </td>

                <!-- Joined date -->
                <td class="whitespace-nowrap px-6 py-4 text-sm" :class="mutedClass">
                  {{ formatDate(member.created_at) }}
                </td>

                <!-- Actions -->
                <td class="whitespace-nowrap px-6 py-4">
                  <div class="flex justify-end gap-1">
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10"
                      title="Remove member"
                      @click="handleRemove(member)"
                    >
                      <Icon name="ph:trash" class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Empty state -->
              <tr v-if="!filteredMembers.length">
                <td colspan="5" class="px-6 py-16 text-center" :class="mutedClass">
                  <div class="flex flex-col items-center gap-3">
                    <Icon name="ph:users-three" class="h-10 w-10 text-gray-300" />
                    <p class="font-semibold text-base" :class="isDark ? 'text-gray-300' : 'text-gray-600'">
                      No members found
                    </p>
                    <p class="text-sm">
                      {{ searchQuery ? 'Try a different search term.' : 'Provision a messenger to get started.' }}
                    </p>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Table footer meta -->
      <div
        v-if="!loading && filteredMembers.length"
        class="flex items-center justify-between border-t px-6 py-3"
        :class="[borderClass, isDark ? 'bg-onyx-black/20' : 'bg-gray-50/70']"
      >
        <p class="text-xs" :class="mutedClass">
          Showing {{ filteredMembers.length }} of {{ members.length }} members
        </p>
        <p class="text-xs font-mono" :class="mutedClass">
          Scoped to org_id {{ auth.user?.org_id }}
        </p>
      </div>
    </article>

    <!-- ── Org scope info card ─────────────────────────────────────────── -->
    <article class="rounded-xl border p-5 transition-all duration-300" :class="surfaceClass">
      <div class="flex items-start gap-3">
        <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-candy-orange/10">
          <Icon name="ph:shield-check-fill" class="h-5 w-5 text-candy-orange" />
        </span>
        <div class="space-y-1 min-w-0">
          <p class="font-semibold text-sm" :class="isDark ? 'text-gray-100' : 'text-gray-900'">Cross-Tenant Isolation Enforced</p>
          <p class="text-xs leading-relaxed" :class="mutedClass">
            All messenger accounts provisioned here are strictly bound to <strong>org_id {{ auth.user?.org_id }}</strong>
            ({{ auth.currentOrg?.name ?? '—' }}). The server validates the administrator session on every write
            operation — the org_id is never read from the request body. Messengers can only access documents,
            offices, and logs that belong to this organization.
          </p>
        </div>
      </div>
    </article>

    <!-- ── Provision Messenger Drawer ─────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="drawerOpen"
          class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
          @click="closeDrawer"
        />
      </Transition>

      <Transition name="drawer-slide">
        <form
          v-if="drawerOpen"
          class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-lg flex-col border-l shadow-2xl"
          :class="isDark ? 'bg-[#1A1A1A] border-onyx-border' : 'bg-white border-gray-200'"
          @submit.prevent="handleProvision"
        >
          <header
            class="flex items-start justify-between gap-4 border-b px-6 py-5"
            :class="borderClass"
          >
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-amber-500">Provision</p>
              <h2 class="mt-1 text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                New Messenger Account
              </h2>
              <p class="mt-0.5 text-xs" :class="mutedClass">
                Bound to {{ auth.currentOrg?.name }} · org_id {{ auth.user?.org_id }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-gray-100 dark:hover:bg-white/5"
              @click="closeDrawer"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </header>

          <div class="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            <!-- Role badge (readonly) -->
            <div
              class="flex items-center gap-3 rounded-xl border px-4 py-3"
              :class="isDark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50'"
            >
              <Icon name="ph:motorcycle-fill" class="h-5 w-5 text-amber-500" />
              <div>
                <p class="text-sm font-bold text-amber-600 dark:text-amber-400">Role: Messenger</p>
                <p class="text-[11px]" :class="mutedClass">Fixed — only messenger roles can be provisioned here.</p>
              </div>
            </div>

            <!-- Full Name -->
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Full Name <span class="text-red-500">*</span>
              </span>
              <input
                v-model.trim="form.full_name"
                type="text"
                placeholder="e.g. Juan Dela Cruz"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-amber-500"
                :class="inputClass"
                required
              />
            </label>

            <!-- Email -->
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Email Address <span class="text-red-500">*</span>
              </span>
              <input
                v-model.trim="form.email"
                type="email"
                placeholder="messenger@yourorg.com"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-amber-500"
                :class="inputClass"
                required
              />
            </label>

            <!-- Password -->
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Initial Password <span class="text-red-500">*</span>
              </span>
              <div class="relative mt-2">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Min 8 characters"
                  class="w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-amber-500"
                  :class="inputClass"
                  minlength="8"
                  required
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 transition hover:text-amber-500"
                  :class="mutedClass"
                  @click="showPassword = !showPassword"
                >
                  <Icon :name="showPassword ? 'ph:eye-slash' : 'ph:eye'" class="h-4 w-4" />
                </button>
              </div>
              <p class="mt-1.5 text-[11px]" :class="mutedClass">
                Share this with the messenger securely. They can change it after first login.
              </p>
            </label>

            <!-- Org scope lock -->
            <div
              class="rounded-xl border p-4 text-sm"
              :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'"
            >
              <div class="flex items-center gap-2 font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                <Icon name="ph:lock-fill" class="h-4 w-4 text-candy-orange" />
                Organization Scope Lock
              </div>
              <p class="mt-2 text-xs leading-5" :class="mutedClass">
                This account will be <strong>irreversibly bound</strong> to
                <strong>{{ auth.currentOrg?.name ?? `org_id ${auth.user?.org_id}` }}</strong>.
                The org_id is set server-side from your administrator session — it cannot be overridden from the
                client or the request body.
              </p>
              <dl class="mt-3 grid grid-cols-2 gap-2 text-xs">
                <dt :class="mutedClass">Organization</dt>
                <dd class="font-semibold text-right" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                  {{ auth.currentOrg?.name ?? '—' }}
                </dd>
                <dt :class="mutedClass">Org Code</dt>
                <dd class="font-mono font-semibold text-right" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                  {{ auth.currentOrg?.code ?? '—' }}
                </dd>
                <dt :class="mutedClass">Org ID</dt>
                <dd class="font-mono font-semibold text-right text-candy-orange">{{ auth.user?.org_id }}</dd>
              </dl>
            </div>

            <!-- Error feedback -->
            <div
              v-if="provisionError"
              class="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500"
            >
              <Icon name="ph:warning-circle-fill" class="mt-0.5 h-4 w-4 flex-shrink-0" />
              {{ provisionError }}
            </div>
          </div>

          <footer class="flex items-center justify-end gap-3 border-t px-6 py-4" :class="borderClass">
            <button
              type="button"
              class="rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-gray-50 dark:hover:bg-white/5"
              :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-700'"
              @click="closeDrawer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving || !form.full_name || !form.email || form.password.length < 8"
              class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon v-if="saving" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
              <Icon v-else name="ph:motorcycle-fill" class="h-4 w-4" />
              {{ saving ? 'Provisioning…' : 'Provision Account' }}
            </button>
          </footer>
        </form>
      </Transition>
    </Teleport>

    <!-- ── Success toast ───────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="toast-fade">
        <div
          v-if="toast.visible"
          class="fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl text-sm font-semibold"
          :class="toast.type === 'success'
            ? (isDark ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
            : (isDark ? 'bg-red-900/90 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700')"
        >
          <Icon
            :name="toast.type === 'success' ? 'ph:check-circle-fill' : 'ph:x-circle-fill'"
            class="h-5 w-5"
          />
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const { isDark, toggleTheme: _toggleTheme } = useTheme()

// ── Types ──────────────────────────────────────────────────────────────
interface OrgMember {
  user_id: string | number
  full_name: string
  email: string
  role: 'employee' | 'messenger'
  org_id: string | number
  status: number
  created_at: string
}

// ── State ──────────────────────────────────────────────────────────────
const members      = ref<OrgMember[]>([])
const loading      = ref(false)
const saving       = ref(false)
const drawerOpen   = ref(false)
const showPassword = ref(false)
const activeTab    = ref<'all' | 'employee' | 'messenger'>('all')
const searchQuery  = ref('')
const provisionError = ref('')

const form = reactive({ full_name: '', email: '', password: '' })

const toast = reactive({ visible: false, message: '', type: 'success' as 'success' | 'error' })

// ── Constants ──────────────────────────────────────────────────────────
const TABS = [
  { value: 'all',       label: 'All Members' },
  { value: 'employee',  label: 'Employees'   },
  { value: 'messenger', label: 'Messengers'  },
] as const

// ── Computed ───────────────────────────────────────────────────────────
const filteredMembers = computed(() => {
  let list = members.value
  if (activeTab.value !== 'all') list = list.filter((m) => m.role === activeTab.value)
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter((m) =>
    m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  )
  return list
})

const tabCount = (tab: string) => {
  if (tab === 'all') return members.value.length
  return members.value.filter((m) => m.role === tab).length
}

const stats = computed(() => [
  {
    label: 'Total Members',
    value: members.value.length,
    icon: 'ph:users-three-fill',
    iconBg: 'bg-candy-orange/10',
    iconColor: 'text-candy-orange',
  },
  {
    label: 'Employees',
    value: members.value.filter((m) => m.role === 'employee').length,
    icon: 'ph:briefcase-fill',
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-500',
  },
  {
    label: 'Messengers',
    value: members.value.filter((m) => m.role === 'messenger').length,
    icon: 'ph:motorcycle-fill',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
  },
  {
    label: 'Inactive',
    value: members.value.filter((m) => m.status !== 1).length,
    icon: 'ph:prohibit-fill',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
  },
])

// ── Theme helpers ──────────────────────────────────────────────────────
const surfaceClass = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-[#1A1A1A] shadow-onyx-card'
    : 'border-gray-200 bg-white'
)
const borderClass  = computed(() => isDark.value ? 'border-onyx-border' : 'border-gray-200')
const mutedClass   = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass   = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

// ── Helpers ────────────────────────────────────────────────────────────
const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

const formatDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value))
    : '—'

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.message = message
  toast.type = type
  toast.visible = true
  setTimeout(() => { toast.visible = false }, 4000)
}

// ── Data fetching ──────────────────────────────────────────────────────
const fetchMembers = async () => {
  const orgId = auth.user?.org_id
  if (!orgId) return
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: OrgMember[] }>('/api/users/org-members', {
      params: { orgId },
    })
    members.value = res.data ?? []
  } catch (err: any) {
    console.error('[UserManagement] fetch error:', err)
    showToast(err?.data?.message || 'Failed to load members', 'error')
  } finally {
    loading.value = false
  }
}

// ── Drawer handlers ────────────────────────────────────────────────────
const openProvisionDrawer = () => {
  form.full_name = ''
  form.email     = ''
  form.password  = ''
  provisionError.value = ''
  showPassword.value   = false
  drawerOpen.value     = true
}

const closeDrawer = () => { drawerOpen.value = false }

// ── CRUD ───────────────────────────────────────────────────────────────
const handleProvision = async () => {
  if (saving.value) return
  provisionError.value = ''
  saving.value = true

  try {
    const res = await $fetch<{ success: boolean; data: OrgMember; message: string }>('/api/users/provision', {
      method: 'POST',
      body: {
        full_name: form.full_name,
        email:     form.email,
        password:  form.password,
        role:      'messenger',
      },
    })
    members.value.push(res.data)
    members.value.sort((a, b) => a.full_name.localeCompare(b.full_name))
    closeDrawer()
    showToast(`Messenger "${res.data.full_name}" provisioned successfully`)
  } catch (err: any) {
    provisionError.value = err?.data?.message || 'Provisioning failed. Please try again.'
  } finally {
    saving.value = false
  }
}

const handleToggleStatus = async (member: OrgMember) => {
  const newStatus = member.status === 1 ? 0 : 1
  try {
    await $fetch('/api/users/toggle-status', {
      method: 'POST',
      body: { userId: member.user_id, status: newStatus },
    })
    member.status = newStatus
    showToast(`${member.full_name} is now ${newStatus === 1 ? 'active' : 'inactive'}`)
  } catch (err: any) {
    showToast(err?.data?.message || 'Failed to update status', 'error')
  }
}

const handleRemove = async (member: OrgMember) => {
  if (!confirm(`Remove "${member.full_name}"? This action is permanent and cannot be undone.`)) return
  try {
    await $fetch('/api/users/remove', {
      method: 'DELETE',
      params: { userId: member.user_id },
    })
    members.value = members.value.filter((m) => m.user_id !== member.user_id)
    showToast(`${member.full_name}'s account has been removed`)
  } catch (err: any) {
    showToast(err?.data?.message || 'Failed to remove member', 'error')
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await fetchMembers()
})
</script>

<style scoped>
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.2s ease; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }

.drawer-slide-enter-active, .drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }

.toast-fade-enter-active, .toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-fade-enter-from, .toast-fade-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.95);
}
</style>
