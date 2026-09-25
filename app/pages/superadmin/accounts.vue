<template>
  <section ref="pageRoot" class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
          <Icon name="ph:shield-star-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Super Admin</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Accounts</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          Manage Accounts
        </h1>
        <p class="mt-1.5 text-sm" :class="mutedText">
          Create, edit, and remove client, employee, and messenger accounts across every organization.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-candy-hover active:scale-[0.97]"
        @click="openAddModal"
      >
        <Icon name="ph:plus-light" class="h-4 w-4" />
        Add Account
      </button>
    </div>

    <!-- ── Filters ───────────────────────────────────────────────────── -->
    <div ref="filtersEl" class="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tab in roleTabs"
          :key="tab.value"
          type="button"
          class="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors border"
          :class="filters.role === tab.value
            ? 'bg-candy-orange text-white border-candy-orange'
            : isDark ? 'border-onyx-border text-gray-400 hover:bg-onyx-card' : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
          @click="filters.role = tab.value; fetchUsers()"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="flex flex-1 flex-col gap-3 sm:flex-row lg:justify-end">
        <select
          v-model="filters.org_id"
          class="rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-candy-orange"
          :class="isDark ? 'border-onyx-border bg-onyx-card text-white' : 'border-gray-300 bg-white text-gray-900'"
          @change="fetchUsers()"
        >
          <option value="">All Organizations</option>
          <option v-for="org in orgs" :key="org.org_id" :value="org.org_id">{{ org.name }}</option>
        </select>
        <select
          v-model="filters.status"
          class="rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-candy-orange"
          :class="isDark ? 'border-onyx-border bg-onyx-card text-white' : 'border-gray-300 bg-white text-gray-900'"
          @change="fetchUsers()"
        >
          <option value="all">All Statuses</option>
          <option value="1">Active</option>
          <option value="0">Suspended</option>
        </select>
        <div class="relative flex-1 lg:w-64 lg:flex-none">
          <Icon name="ph:magnifying-glass-light" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" :class="mutedText" />
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search name or email…"
            class="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-candy-orange"
            :class="isDark ? 'border-onyx-border bg-onyx-card text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
            @keyup.enter="fetchUsers()"
            @input="debouncedSearch()"
          />
        </div>
      </div>
    </div>

    <!-- ── Accounts Table ────────────────────────────────────────────── -->
    <div
      ref="tableEl"
      class="overflow-x-auto rounded-2xl border"
      :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
    >
      <table class="min-w-full divide-y text-sm" :class="isDark ? 'divide-onyx-border' : 'divide-gray-200'">
        <thead :class="isDark ? 'bg-white/[0.02]' : 'bg-gray-50'">
          <tr>
            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" :class="mutedText">Account</th>
            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" :class="mutedText">Role</th>
            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" :class="mutedText">Organization</th>
            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" :class="mutedText">Status</th>
            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" :class="mutedText">Registered</th>
            <th class="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest" :class="mutedText">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
          <tr v-if="loading">
            <td colspan="6" class="px-6 py-12 text-center" :class="mutedText">
              <Icon name="ph:spinner-gap-light" class="h-6 w-6 animate-spin mx-auto mb-3 text-candy-orange" />
              <p class="text-xs font-medium">Loading accounts…</p>
            </td>
          </tr>
          <tr v-else-if="!users.length">
            <td colspan="6" class="px-6 py-16 text-center">
              <div class="flex flex-col items-center gap-3">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-candy-orange/10 border border-candy-orange/20">
                  <Icon name="ph:users-three-light" class="h-7 w-7 text-candy-orange/60" />
                </div>
                <p class="font-semibold text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">No accounts found</p>
                <p class="text-xs" :class="mutedText">Try adjusting your filters or add a new account.</p>
              </div>
            </td>
          </tr>
          <tr
            v-for="user in users"
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
              <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-bold uppercase tracking-wide"
                :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'">
                {{ roleLabel(user.role) }}
              </span>
            </td>
            <td class="px-6 py-4 text-xs" :class="mutedText">{{ user.org_name || '—' }}</td>
            <td class="px-6 py-4">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-80"
                :class="user.status === 1
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20'"
                :title="user.status === 1 ? 'Click to suspend' : 'Click to activate'"
                @click="toggleStatus(user)"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="user.status === 1 ? 'bg-success' : 'bg-danger'" />
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
                  @click="openEditModal(user)"
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

    <!-- ── Pagination ────────────────────────────────────────────────── -->
    <div v-if="!loading && totalCount > pageSize" class="flex items-center justify-between text-xs" :class="mutedText">
      <span>Showing {{ offset + 1 }}–{{ Math.min(offset + pageSize, totalCount) }} of {{ totalCount }}</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40"
          :class="isDark ? 'border-onyx-border hover:bg-onyx-card' : 'border-gray-200 hover:bg-gray-50'"
          :disabled="offset === 0"
          @click="offset = Math.max(0, offset - pageSize); fetchUsers()"
        >
          Previous
        </button>
        <button
          type="button"
          class="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40"
          :class="isDark ? 'border-onyx-border hover:bg-onyx-card' : 'border-gray-200 hover:bg-gray-50'"
          :disabled="offset + pageSize >= totalCount"
          @click="offset += pageSize; fetchUsers()"
        >
          Next
        </button>
      </div>
    </div>

    <!-- ── Add/Edit Modal ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <form
            class="w-full max-w-md rounded-2xl border my-8"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
            @submit.prevent="saveUser"
          >
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-full border border-candy-orange/20 bg-candy-orange/10">
                  <Icon :name="isEditMode ? 'ph:pencil-line-light' : 'ph:user-plus-light'" class="h-4.5 w-4.5 text-candy-orange" />
                </span>
                <h2 class="text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ isEditMode ? 'Edit Account' : 'Add Account' }}
                </h2>
              </div>
              <button type="button" class="rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/10" @click="isModalOpen = false">
                <Icon name="ph:x-light" class="h-4 w-4" :class="mutedText" />
              </button>
            </div>

            <div class="space-y-4 px-6 py-5">
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">Account Type</label>
                <select
                  v-model="form.role"
                  required
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-300 bg-white text-gray-900'"
                  @change="onRoleChange"
                >
                  <option v-for="tab in roleTabs.filter(t => t.value !== 'all')" :key="tab.value" :value="tab.value">{{ tab.label }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">Full Name</label>
                <input
                  v-model="form.full_name"
                  type="text"
                  required
                  placeholder="Juan D. Dela Cruz"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">Email Address</label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  placeholder="example@domain.com"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">
                  Password <span v-if="!isEditMode" class="text-danger">*</span>
                </label>
                <input
                  v-model="form.password"
                  type="password"
                  :required="!isEditMode"
                  placeholder="••••••••"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
                />
                <p v-if="isEditMode" class="mt-1 text-sm" :class="mutedText">Leave blank to keep existing password.</p>
              </div>
              <div v-if="form.role !== 'client'">
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">Organization</label>
                <select
                  v-model="form.org_id"
                  required
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-300 bg-white text-gray-900'"
                  @change="onOrgChange"
                >
                  <option value="" disabled>Select an organization…</option>
                  <option v-for="org in orgs" :key="org.org_id" :value="org.org_id">{{ org.name }}</option>
                </select>
              </div>
              <div v-else>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">Organization (optional)</label>
                <select
                  v-model="form.org_id"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-300 bg-white text-gray-900'"
                >
                  <option value="">No organization (pending setup)</option>
                  <option v-for="org in orgs" :key="org.org_id" :value="org.org_id">{{ org.name }}</option>
                </select>
              </div>
              <div v-if="form.role === 'employee_sub_user' || form.role === 'employee'">
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">
                  Office / Desk <span v-if="form.role === 'employee_sub_user'" class="text-danger">*</span>
                </label>
                <select
                  v-model="form.office_id"
                  :required="form.role === 'employee_sub_user'"
                  :disabled="!form.org_id"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange disabled:opacity-50"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-300 bg-white text-gray-900'"
                >
                  <option value="">{{ form.org_id ? 'Select an office…' : 'Select an organization first' }}</option>
                  <option v-for="office in offices" :key="office.id" :value="office.id">{{ office.name }}</option>
                </select>
              </div>
            </div>

            <div v-if="errorMsg" class="mx-6 mb-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
              {{ errorMsg }}
            </div>

            <div class="flex justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                class="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors border border-transparent"
                :class="isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'"
                @click="isModalOpen = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="submitting"
                class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-candy-hover disabled:opacity-50"
              >
                <Icon v-if="submitting" name="ph:spinner-gap-light" class="h-4 w-4 animate-spin" />
                {{ submitting ? 'Saving…' : (isEditMode ? 'Update Account' : 'Add Account') }}
              </button>
            </div>
          </form>
        </div>
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

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'
import { useSuperadminToast } from '~/composables/useSuperadminToast'
import { gsap } from 'gsap'

definePageMeta({ layout: 'superadmin' })
useSeoMeta({ title: 'Super Admin · Manage Accounts', description: 'Create, edit, and remove accounts across every organization.' })

const { isDark } = useTheme()
const { show: showToast } = useSuperadminToast()
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

const roleTabs = [
  { value: 'all', label: 'All' },
  { value: 'client', label: 'Client' },
  { value: 'employee', label: 'Employee' },
  { value: 'messenger', label: 'Laison' },
]

function roleLabel(role) {
  return roleTabs.find((t) => t.value === role)?.label || role
}

const loading = ref(true)
const submitting = ref(false)
const users = ref([])
const orgs = ref([])
const offices = ref([])
const totalCount = ref(0)
const pageSize = 25
const offset = ref(0)
const errorMsg = ref('')

const filters = reactive({ role: 'all', org_id: '', status: 'all', search: '' })

let searchTimer = null
function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { offset.value = 0; fetchUsers() }, 400)
}

async function fetchOrgs() {
  try {
    const res = await $fetch('/api/superadmin/orgs')
    orgs.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch organizations:', err)
  }
}

async function fetchOffices(orgId) {
  if (!orgId) { offices.value = []; return }
  try {
    const res = await $fetch('/api/superadmin/offices', { params: { org_id: orgId } })
    offices.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch offices:', err)
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    const res = await $fetch('/api/superadmin/users', {
      params: {
        role: filters.role,
        org_id: filters.org_id,
        status: filters.status,
        search: filters.search,
        limit: pageSize,
        offset: offset.value,
      },
    })
    users.value = res.data || []
    totalCount.value = res.count || 0
  } catch (err) {
    console.error('Failed to fetch accounts:', err)
    showToast('Failed to load accounts', 'error')
  } finally {
    loading.value = false
  }
}

const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingUserId = ref(null)

const form = reactive({ full_name: '', email: '', password: '', role: 'client', org_id: '', office_id: '' })

function resetForm() {
  form.full_name = ''
  form.email = ''
  form.password = ''
  form.role = 'client'
  form.org_id = ''
  form.office_id = ''
  offices.value = []
}

function openAddModal() {
  isEditMode.value = false
  editingUserId.value = null
  resetForm()
  errorMsg.value = ''
  isModalOpen.value = true
}

function openEditModal(user) {
  isEditMode.value = true
  editingUserId.value = user.user_id
  form.full_name = user.full_name || ''
  form.email = user.email || ''
  form.password = ''
  form.role = user.role
  form.org_id = user.org_id || ''
  form.office_id = user.office_id || ''
  errorMsg.value = ''
  isModalOpen.value = true
  if (user.org_id) fetchOffices(user.org_id)
}

function onRoleChange() {
  if (form.role === 'client') form.office_id = ''
}

function onOrgChange() {
  form.office_id = ''
  fetchOffices(form.org_id)
}

async function saveUser() {
  if (submitting.value) return
  submitting.value = true
  errorMsg.value = ''

  try {
    if (isEditMode.value && editingUserId.value) {
      await $fetch(`/api/superadmin/users/${editingUserId.value}`, { method: 'PUT', body: form })
      showToast(`Account "${form.full_name}" updated successfully`, 'success')
    } else {
      await $fetch('/api/superadmin/users', { method: 'POST', body: form })
      showToast(`Account "${form.full_name}" created successfully`, 'success')
    }
    isModalOpen.value = false
    await fetchUsers()
  } catch (err) {
    console.error('Failed to save account:', err)
    errorMsg.value = err.data?.message || 'Failed to save account'
    showToast(errorMsg.value, 'error')
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(user) {
  const nextStatus = user.status === 1 ? 0 : 1
  try {
    await $fetch(`/api/superadmin/users/${user.user_id}/status`, { method: 'POST', body: { status: nextStatus } })
    user.status = nextStatus
    showToast(`${user.full_name} is now ${nextStatus === 1 ? 'active' : 'suspended'}`, 'success')
  } catch (err) {
    console.error('Failed to update status:', err)
    showToast(err.data?.message || 'Failed to update status', 'error')
  }
}

const isDeleteConfirmOpen = ref(false)
const userToDelete = ref(null)

function confirmDelete(user) {
  userToDelete.value = user
  isDeleteConfirmOpen.value = true
}

async function executeDelete() {
  if (!userToDelete.value || submitting.value) return
  submitting.value = true
  try {
    await $fetch(`/api/superadmin/users/${userToDelete.value.user_id}`, { method: 'DELETE' })
    showToast(`Account "${userToDelete.value.full_name}" deleted successfully`, 'success')
    isDeleteConfirmOpen.value = false
    userToDelete.value = null
    await fetchUsers()
  } catch (err) {
    console.error('Failed to delete account:', err)
    showToast(err.data?.message || 'Failed to delete account', 'error')
  } finally {
    submitting.value = false
  }
}

// GSAP refs
const pageRoot = ref(null)
const headerEl = ref(null)
const filtersEl = ref(null)
const tableEl = ref(null)

const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  if (filtersEl.value) tl.fromTo(filtersEl.value, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, 0.1)
  if (tableEl.value) tl.fromTo(tableEl.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.18)
}

onMounted(() => {
  runEntranceAnimation()
  fetchOrgs()
  fetchUsers()
})
</script>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
