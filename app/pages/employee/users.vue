<template>
  <section ref="pageRoot" class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
          <Icon name="ph:users-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Staff Accounts</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight">Staff Accounts</h1>
        <p class="mt-1.5 text-sm" :class="mutedText">
          Staff log in through their own portal to create documents, hand off to a messenger, or deliver documents themselves — anywhere in your organization.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
          :class="isDark ? 'border-onyx-border text-gray-200 hover:bg-onyx-card' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
          @click="openAddDrawer('messenger')"
        >
          <Icon name="ph:motorcycle-fill" class="h-4 w-4" />
          Add Messenger
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-candy-hover active:scale-[0.97]"
          @click="openAddDrawer('employee_sub_user')"
        >
          <Icon name="ph:plus-light" class="h-4 w-4" />
          Add Staff
        </button>
      </div>
    </div>

    <!-- ── Stat cards ──────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-2xl border p-4"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
      >
        <div class="flex items-center gap-3">
          <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" :class="stat.iconBg">
            <Icon :name="stat.icon" class="h-4 w-4" :class="stat.iconColor" />
          </span>
          <div>
            <p class="text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ stat.value }}</p>
            <p class="text-sm font-medium" :class="mutedText">{{ stat.label }}</p>
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
            class="ml-1.5 rounded-full px-1.5 py-0.5 text-sm font-bold"
            :class="isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600'"
          >
            {{ tabCount(tab.value) }}
          </span>
        </button>
      </div>

      <div
        class="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 transition-all"
        :class="isDark ? 'border-onyx-border bg-onyx-black/40 focus-within:border-candy-orange' : 'border-gray-200 bg-white focus-within:border-candy-orange'"
      >
        <Icon name="ph:magnifying-glass" class="h-4 w-4 flex-shrink-0" :class="mutedText" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search…"
          class="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400 sm:w-52"
        />
      </div>
    </div>

    <!-- ── Table ──────────────────────────────────────────────────────── -->
    <div
      ref="tableEl"
      class="overflow-x-auto rounded-2xl border"
      :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
    >
      <table class="min-w-full divide-y text-sm" :class="isDark ? 'divide-onyx-border' : 'divide-gray-200'">
        <thead :class="isDark ? 'bg-white/[0.02]' : 'bg-gray-50'">
          <tr>
            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" :class="mutedText">Member</th>
            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" :class="mutedText">Role</th>
            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" :class="mutedText">Status</th>
            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" :class="mutedText">Registered</th>
            <th class="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest" :class="mutedText">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
          <tr v-if="loading">
            <td colspan="5" class="px-6 py-12 text-center" :class="mutedText">
              <Icon name="ph:spinner-gap-light" class="h-6 w-6 animate-spin mx-auto mb-3 text-candy-orange" />
              <p class="text-xs font-medium">Loading accounts…</p>
            </td>
          </tr>
          <tr v-else-if="!filteredUsers.length">
            <td colspan="5" class="px-6 py-16 text-center">
              <div class="flex flex-col items-center gap-3">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-candy-orange/10 border border-candy-orange/20">
                  <Icon name="ph:users-light" class="h-7 w-7 text-candy-orange/60" />
                </div>
                <p class="font-semibold text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">No accounts found</p>
                <p class="text-xs" :class="mutedText">{{ searchQuery ? 'Try a different search term.' : 'Add a staff or messenger account to get started.' }}</p>
              </div>
            </td>
          </tr>
          <tr
            v-for="user in filteredUsers"
            :key="user.user_id"
            class="transition-colors group"
            :class="isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50/80'"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-candy-orange text-white text-xs font-bold flex-shrink-0">
                  {{ user.full_name?.charAt(0)?.toUpperCase() || '?' }}
                </span>
                <div class="min-w-0">
                  <p class="font-semibold text-sm truncate" :class="isDark ? 'text-white' : 'text-gray-900'">{{ user.full_name }}</p>
                  <p class="text-sm truncate" :class="mutedText">{{ user.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold uppercase tracking-wider"
                :class="user.role === 'messenger'
                  ? 'bg-candy-orange/10 text-candy-orange'
                  : (isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600')"
              >
                <Icon :name="user.role === 'messenger' ? 'ph:motorcycle-fill' : 'ph:briefcase-fill'" class="h-3 w-3" />
                {{ user.role === 'messenger' ? 'Messenger' : 'Staff' }}
              </span>
            </td>
            <td class="px-6 py-4">
              <button
                type="button"
                :title="user.status === 1 ? 'Click to deactivate' : 'Click to activate'"
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold transition-all hover:opacity-80"
                :class="user.status === 1 ? 'bg-success/10 text-success' : 'bg-gray-400/10 text-gray-500 dark:text-gray-400'"
                @click="toggleStatus(user)"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="user.status === 1 ? 'bg-success' : 'bg-gray-400'" />
                {{ user.status === 1 ? 'Active' : 'Suspended' }}
              </button>
            </td>
            <td class="px-6 py-4 text-xs" :class="mutedText">
              {{ user.created_at ? new Date(user.created_at).toLocaleDateString() : '—' }}
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-center gap-2">
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-candy-orange transition-colors hover:bg-candy-orange/10"
                  title="Edit Account"
                  @click="openEditDrawer(user)"
                >
                  <Icon name="ph:pencil-line-light" class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-danger transition-colors hover:bg-danger/10"
                  title="Delete Account"
                  @click="confirmDelete(user)"
                >
                  <Icon name="ph:trash-light" class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Add/Edit Drawer ───────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="isDrawerOpen"
          class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
          @click="closeDrawer"
        />
      </Transition>

      <Transition name="drawer-slide">
        <form
          v-if="isDrawerOpen"
          class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-lg flex-col border-l shadow-2xl"
          :class="isDark ? 'bg-[#1A1A1A] border-onyx-border' : 'bg-white border-gray-200'"
          @submit.prevent="saveUser"
        >
          <header class="flex items-start justify-between gap-4 border-b px-6 py-5" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
            <div>
              <p class="text-sm font-bold uppercase tracking-widest text-candy-orange">
                {{ isEditMode ? 'Edit' : 'Add' }}
              </p>
              <h2 class="mt-1 text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ isEditMode ? 'Edit Account' : (drawerRole === 'messenger' ? 'New Messenger Account' : 'New Staff Account') }}
              </h2>
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
            <div class="flex items-center gap-3 rounded-xl border px-4 py-3" :class="isDark ? 'border-candy-orange/20 bg-candy-orange/5' : 'border-candy-orange/20 bg-candy-orange/5'">
              <Icon :name="drawerRole === 'messenger' ? 'ph:motorcycle-fill' : 'ph:briefcase-fill'" class="h-5 w-5 text-candy-orange" />
              <div>
                <p class="text-sm font-bold text-candy-orange">Role: {{ drawerRole === 'messenger' ? 'Messenger' : 'Staff' }}</p>
                <p class="text-sm" :class="mutedText">Role cannot be changed after the account is created.</p>
              </div>
            </div>

            <!-- Full Name -->
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Full Name <span class="text-danger">*</span>
              </span>
              <input
                v-model.trim="form.full_name"
                type="text"
                placeholder="Juan D. Dela Cruz"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="inputClass"
                required
              />
            </label>

            <!-- Email -->
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Email Address <span class="text-danger">*</span>
              </span>
              <input
                v-model.trim="form.email"
                type="email"
                placeholder="example@domain.com"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="inputClass"
                required
              />
            </label>

            <!-- Password -->
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                {{ isEditMode ? 'New Password' : 'Initial Password' }}
                <span v-if="!isEditMode" class="text-danger">*</span>
              </span>
              <div class="relative mt-2">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Min 8 characters"
                  class="w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                  :class="inputClass"
                  minlength="8"
                  :required="!isEditMode"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 transition hover:text-candy-orange"
                  :class="mutedText"
                  @click="showPassword = !showPassword"
                >
                  <Icon :name="showPassword ? 'ph:eye-slash' : 'ph:eye'" class="h-4 w-4" />
                </button>
              </div>
            </label>

            <!-- Confirm Password -->
            <label v-if="form.password" class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Confirm Password <span class="text-danger">*</span>
              </span>
              <input
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Re-enter the password"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="[inputClass, confirmPassword && confirmPassword !== form.password ? '!border-danger' : '']"
              />
              <p v-if="confirmPassword && confirmPassword !== form.password" class="mt-1.5 text-sm text-danger">
                Passwords do not match.
              </p>
            </label>
            <p v-else-if="isEditMode" class="-mt-3 text-sm" :class="mutedText">
              Leave password blank to keep the current password.
            </p>
          </div>

          <div v-if="errorMsg" class="mx-6 mb-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
            {{ errorMsg }}
          </div>

          <footer class="flex items-center justify-end gap-3 border-t px-6 py-4" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
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
              :disabled="!canSubmit"
              class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-candy-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon v-if="submitting" name="ph:spinner-gap-light" class="h-4 w-4 animate-spin" />
              {{ submitting ? 'Saving…' : (isEditMode ? 'Save Changes' : 'Create Account') }}
            </button>
          </footer>
        </form>
      </Transition>
    </Teleport>

    <!-- ── Delete Confirmation Modal ─────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div
            class="w-full max-w-sm rounded-2xl border text-center p-8"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
          >
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 border border-danger/20 text-danger">
              <Icon name="ph:warning-circle-light" class="h-7 w-7" />
            </div>
            <h3 class="text-base font-bold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Delete Account?</h3>
            <p class="text-sm mb-6" :class="mutedText">
              This will permanently remove <strong :class="isDark ? 'text-white' : 'text-gray-900'">{{ userToDelete?.full_name }}</strong> from the system. This action cannot be undone.
            </p>
            <div class="flex justify-center gap-3">
              <button
                type="button"
                class="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors border border-transparent"
                :class="isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'"
                @click="isDeleteConfirmOpen = false"
              >
                Cancel
              </button>
              <button
                type="button"
                :disabled="submitting"
                class="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                @click="executeDelete"
              >
                <Icon v-if="submitting" name="ph:spinner-gap-light" class="h-4 w-4 animate-spin" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'
import { useEmployeeToast } from '~/composables/useEmployeeToast'
import { gsap } from 'gsap'

definePageMeta({ layout: 'employee' })

const { isDark } = useTheme()
const { show: showToast } = useEmployeeToast()

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'employee_sub_user', label: 'Staff' },
  { value: 'messenger', label: 'Messengers' },
] as const

const loading = ref(true)
const submitting = ref(false)
const users = ref<any[]>([])
const activeTab = ref<'all' | 'employee_sub_user' | 'messenger'>('all')
const searchQuery = ref('')
const errorMsg = ref('')

const isDrawerOpen = ref(false)
const isEditMode = ref(false)
const drawerRole = ref<'employee_sub_user' | 'messenger'>('employee_sub_user')
const editingUserId = ref<string | null>(null)
const showPassword = ref(false)
const confirmPassword = ref('')

const isDeleteConfirmOpen = ref(false)
const userToDelete = ref<any | null>(null)

const form = reactive({
  full_name: '',
  email: '',
  password: '',
})

// GSAP refs
const pageRoot = ref<HTMLElement | null>(null)
const headerEl = ref<HTMLElement | null>(null)
const tableEl  = ref<HTMLElement | null>(null)

const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

const filteredUsers = computed(() => {
  let list = users.value
  if (activeTab.value !== 'all') list = list.filter((u) => u.role === activeTab.value)
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter((u) => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
  return list
})

const tabCount = (tab: string) => {
  if (tab === 'all') return users.value.length
  return users.value.filter((u) => u.role === tab).length
}

const stats = computed(() => [
  {
    label: 'Total Accounts', value: users.value.length, icon: 'ph:users-three-fill',
    iconBg: 'bg-candy-orange/10', iconColor: 'text-candy-orange',
  },
  {
    label: 'Staff', value: users.value.filter((u) => u.role === 'employee_sub_user').length, icon: 'ph:briefcase-fill',
    iconBg: isDark.value ? 'bg-white/10' : 'bg-gray-200', iconColor: isDark.value ? 'text-gray-300' : 'text-gray-600',
  },
  {
    label: 'Messengers', value: users.value.filter((u) => u.role === 'messenger').length, icon: 'ph:motorcycle-fill',
    iconBg: 'bg-candy-orange/10', iconColor: 'text-candy-orange',
  },
  {
    label: 'Inactive', value: users.value.filter((u) => u.status !== 1).length, icon: 'ph:prohibit-fill',
    iconBg: 'bg-danger/10', iconColor: 'text-danger',
  },
])

const canSubmit = computed(() => {
  if (submitting.value) return false
  if (!form.full_name || !form.email) return false
  if (!isEditMode.value && form.password.length < 8) return false
  if (form.password && form.password.length < 8) return false
  if (form.password && confirmPassword.value !== form.password) return false
  return true
})

async function fetchUsers() {
  loading.value = true
  try {
    const res = await $fetch<{ data: any[] }>('/api/employee/users')
    users.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch staff/messenger accounts:', err)
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.full_name = ''
  form.email = ''
  form.password = ''
  confirmPassword.value = ''
}

function openAddDrawer(role: 'employee_sub_user' | 'messenger') {
  isEditMode.value = false
  drawerRole.value = role
  editingUserId.value = null
  resetForm()
  errorMsg.value = ''
  showPassword.value = false
  isDrawerOpen.value = true
}

function openEditDrawer(user: any) {
  isEditMode.value = true
  drawerRole.value = user.role
  editingUserId.value = user.user_id
  resetForm()
  form.full_name = user.full_name
  form.email = user.email
  errorMsg.value = ''
  showPassword.value = false
  isDrawerOpen.value = true
}

function closeDrawer() {
  isDrawerOpen.value = false
}

async function saveUser() {
  if (!canSubmit.value) return
  submitting.value = true
  errorMsg.value = ''

  try {
    if (isEditMode.value && editingUserId.value) {
      await $fetch(`/api/employee/users/${editingUserId.value}`, {
        method: 'PUT',
        body: form,
      })
      showToast(`Account "${form.full_name}" updated successfully`, 'success')
    } else {
      await $fetch('/api/employee/users', {
        method: 'POST',
        body: { ...form, role: drawerRole.value },
      })
      showToast(`${drawerRole.value === 'messenger' ? 'Messenger' : 'Staff'} account "${form.full_name}" created successfully`, 'success')
    }
    isDrawerOpen.value = false
    await fetchUsers()
  } catch (err: any) {
    console.error('Failed to save account:', err)
    errorMsg.value = err.data?.message || 'Failed to save account'
    showToast(errorMsg.value, 'error')
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(user: any) {
  const nextStatus = user.status === 1 ? 0 : 1
  try {
    await $fetch(`/api/employee/users/${user.user_id}/status`, { method: 'POST', body: { status: nextStatus } })
    user.status = nextStatus
    showToast(`${user.full_name} is now ${nextStatus === 1 ? 'active' : 'suspended'}`, 'success')
  } catch (err: any) {
    showToast(err.data?.message || 'Failed to update status', 'error')
  }
}

function confirmDelete(user: any) {
  userToDelete.value = user
  isDeleteConfirmOpen.value = true
}

async function executeDelete() {
  if (!userToDelete.value || submitting.value) return
  submitting.value = true
  try {
    await $fetch(`/api/employee/users/${userToDelete.value.user_id}`, { method: 'DELETE' })
    showToast(`"${userToDelete.value.full_name}" deleted successfully`, 'success')
    isDeleteConfirmOpen.value = false
    userToDelete.value = null
    await fetchUsers()
  } catch (err: any) {
    console.error('Failed to delete account:', err)
    showToast(err.data?.message || 'Failed to delete account', 'error')
  } finally {
    submitting.value = false
  }
}

// ── GSAP Entrance ──────────────────────────────────────────────────────
const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) {
    tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  }
  if (tableEl.value) {
    tl.fromTo(tableEl.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.18)
  }
}

onMounted(() => {
  runEntranceAnimation()
  fetchUsers()
})
</script>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.2s ease; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }

.drawer-slide-enter-active, .drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }
</style>
