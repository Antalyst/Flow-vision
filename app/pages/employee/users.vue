<template>
  <section ref="pageRoot" class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
          <Icon name="ph:users-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Internal Staff</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight">Internal Desk Staff</h1>
        <p class="mt-1.5 text-sm" :class="mutedText">
          Manage internal staff accounts assigned to specific office desks and tables.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-none bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 active:scale-[0.97]"
        @click="openAddModal"
      >
        <Icon name="ph:plus-light" class="h-4 w-4" />
        Add Staff Member
      </button>
    </div>

    <!-- ── Staff Table ────────────────────────────────────────────────── -->
    <div
      ref="tableEl"
      class="overflow-x-auto rounded-none border"
      :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
    >
      <table class="min-w-full divide-y text-sm" :class="isDark ? 'divide-onyx-border' : 'divide-gray-200'">
        <thead :class="isDark ? 'bg-white/[0.02]' : 'bg-gray-50'">
          <tr>
            <th class="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest" :class="mutedText">Staff Member</th>
            <th class="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest" :class="mutedText">Email Address</th>
            <th class="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest" :class="mutedText">Assigned Desk</th>
            <th class="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest" :class="mutedText">Status</th>
            <th class="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest" :class="mutedText">Registered</th>
            <th class="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest" :class="mutedText">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
          <tr v-if="loading">
            <td colspan="6" class="px-6 py-12 text-center" :class="mutedText">
              <Icon name="ph:spinner-gap-light" class="h-6 w-6 animate-spin mx-auto mb-3 text-candy-orange" />
              <p class="text-xs font-medium">Loading internal staff…</p>
            </td>
          </tr>
          <tr v-else-if="!users.length">
            <td colspan="6" class="px-6 py-16 text-center">
              <div class="flex flex-col items-center gap-3">
                <div class="flex h-14 w-14 items-center justify-center rounded-none bg-candy-orange/10 border border-candy-orange/20">
                  <Icon name="ph:users-light" class="h-7 w-7 text-candy-orange/60" />
                </div>
                <p class="font-semibold text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">No internal staff found</p>
                <p class="text-xs" :class="mutedText">Add a staff member to assign them to a desk node.</p>
              </div>
            </td>
          </tr>
          <tr
            v-for="user in users"
            :key="user.user_id"
            class="transition-colors group"
            :class="isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50/80'"
          >
            <!-- Name + avatar -->
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <span class="flex h-8 w-8 items-center justify-center rounded-none bg-candy-orange text-white text-xs font-bold flex-shrink-0">
                  {{ user.full_name?.charAt(0)?.toUpperCase() || '?' }}
                </span>
                <span class="font-semibold text-sm" :class="isDark ? 'text-white' : 'text-gray-900'">{{ user.full_name }}</span>
              </div>
            </td>
            <!-- Email -->
            <td class="px-6 py-4 text-xs" :class="mutedText">{{ user.email }}</td>
            <!-- Assigned desk -->
            <td class="px-6 py-4">
              <span class="inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 text-[10px] font-semibold"
                :class="isDark ? 'border-candy-orange/30 bg-candy-orange/10 text-candy-orange' : 'border-orange-200 bg-orange-50 text-candy-orange'">
                <Icon name="ph:desktop-light" class="h-3 w-3" />
                {{ user.offices?.name || 'Unassigned' }}
              </span>
            </td>
            <!-- Status -->
            <td class="px-6 py-4">
              <span
                class="inline-flex items-center gap-1.5 rounded-none px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                :class="user.status === 1
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'"
              >
                <span class="h-1.5 w-1.5 rounded-none" :class="user.status === 1 ? 'bg-emerald-500' : 'bg-rose-500'" />
                {{ user.status === 1 ? 'Active' : 'Suspended' }}
              </span>
            </td>
            <!-- Date -->
            <td class="px-6 py-4 text-xs" :class="mutedText">
              {{ new Date(user.created_at).toLocaleDateString() }}
            </td>
            <!-- Actions -->
            <td class="px-6 py-4">
              <div class="flex items-center justify-center gap-2">
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-none border text-blue-500 transition-colors hover:bg-blue-500/10 hover:border-blue-500/30"
                  :class="isDark ? 'border-onyx-border' : 'border-gray-200'"
                  title="Edit Staff Member"
                  @click="openEditModal(user)"
                >
                  <Icon name="ph:pencil-line-light" class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-none border text-red-500 transition-colors hover:bg-red-500/10 hover:border-red-500/30"
                  :class="isDark ? 'border-onyx-border' : 'border-gray-200'"
                  title="Delete Staff Member"
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

    <!-- ── Add/Edit Modal ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <form
            class="w-full max-w-md rounded-none border"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
            @submit.prevent="saveUser"
          >
            <!-- Modal header -->
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-none border border-candy-orange/20 bg-candy-orange/10">
                  <Icon :name="isEditMode ? 'ph:pencil-line-light' : 'ph:user-plus-light'" class="h-4.5 w-4.5 text-candy-orange" />
                </span>
                <h2 class="text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ isEditMode ? 'Edit Staff Member' : 'Add Staff Member' }}
                </h2>
              </div>
              <button type="button" class="rounded-none p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/10" @click="isModalOpen = false">
                <Icon name="ph:x-light" class="h-4 w-4" :class="mutedText" />
              </button>
            </div>

            <div class="space-y-4 px-6 py-5">
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">Full Name</label>
                <input
                  v-model="form.full_name"
                  type="text"
                  required
                  placeholder="Juan D. Dela Cruz"
                  class="w-full rounded-none border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
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
                  class="w-full rounded-none border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">
                  Password <span v-if="!isEditMode" class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.password"
                  type="password"
                  :required="!isEditMode"
                  placeholder="••••••••"
                  class="w-full rounded-none border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
                />
                <p v-if="isEditMode" class="mt-1 text-[11px]" :class="mutedText">Leave blank to keep existing password.</p>
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">Assigned Desk / Table</label>
                <select
                  v-model="form.office_id"
                  required
                  class="w-full rounded-none border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-300 bg-white text-gray-900'"
                >
                  <option value="" disabled>Select a desk node…</option>
                  <option v-for="table in tables" :key="table.id" :value="table.id">
                    {{ table.name }} ({{ table.code }})
                  </option>
                </select>
                <p v-if="!tables.length" class="mt-1 text-xs text-amber-500">
                  No desks registered yet. Create a desk node in the Office Ledger first.
                </p>
              </div>
            </div>

            <div v-if="errorMsg" class="mx-6 mb-4 rounded-none border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
              {{ errorMsg }}
            </div>

            <div class="flex justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                class="rounded-none px-4 py-2.5 text-sm font-semibold transition-colors border border-transparent"
                :class="isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'"
                @click="isModalOpen = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="submitting"
                class="inline-flex items-center gap-2 rounded-none bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
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
            class="w-full max-w-sm rounded-none border text-center p-8"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
          >
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-none bg-red-500/10 border border-red-500/20 text-red-500">
              <Icon name="ph:warning-circle-light" class="h-7 w-7" />
            </div>
            <h3 class="text-base font-bold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Delete Staff Account?</h3>
            <p class="text-sm mb-6" :class="mutedText">
              This will permanently remove <strong :class="isDark ? 'text-white' : 'text-gray-900'">{{ userToDelete?.full_name }}</strong> from the system. This action cannot be undone.
            </p>
            <div class="flex justify-center gap-3">
              <button
                type="button"
                class="rounded-none px-4 py-2.5 text-sm font-semibold transition-colors border border-transparent"
                :class="isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'"
                @click="isDeleteConfirmOpen = false"
              >
                Cancel
              </button>
              <button
                type="button"
                :disabled="submitting"
                class="inline-flex items-center gap-2 rounded-none bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
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

const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingUserId = ref<string | null>(null)
const loading = ref(true)
const submitting = ref(false)
const users = ref<any[]>([])
const tables = ref<any[]>([])
const errorMsg = ref('')

const isDeleteConfirmOpen = ref(false)
const userToDelete = ref<any | null>(null)

const form = reactive({
  full_name: '',
  email: '',
  password: '',
  office_id: ''
})

// GSAP refs
const pageRoot = ref<HTMLElement | null>(null)
const headerEl = ref<HTMLElement | null>(null)
const tableEl  = ref<HTMLElement | null>(null)

const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

async function fetchTables() {
  try {
    const res = await $fetch<{ data: any[] }>('/api/employee/offices')
    tables.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch desk tables:', err)
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    const res = await $fetch<{ data: any[] }>('/api/employee/users')
    users.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch internal users:', err)
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  isEditMode.value = false
  editingUserId.value = null
  form.full_name = ''
  form.email = ''
  form.password = ''
  form.office_id = ''
  errorMsg.value = ''
  isModalOpen.value = true
}

function openEditModal(user: any) {
  isEditMode.value = true
  editingUserId.value = user.user_id
  form.full_name = user.full_name
  form.email = user.email
  form.password = ''
  form.office_id = user.office_id || ''
  errorMsg.value = ''
  isModalOpen.value = true
}

async function saveUser() {
  if (submitting.value) return
  submitting.value = true
  errorMsg.value = ''

  try {
    if (isEditMode.value && editingUserId.value) {
      await $fetch(`/api/employee/users/${editingUserId.value}`, {
        method: 'PUT',
        body: form
      })
      showToast(`Staff member "${form.full_name}" updated successfully`, 'success')
    } else {
      await $fetch('/api/employee/users', {
        method: 'POST',
        body: form
      })
      showToast(`Staff member "${form.full_name}" registered successfully`, 'success')
    }
    isModalOpen.value = false
    await fetchUsers()
  } catch (err: any) {
    console.error('Failed to save user:', err)
    errorMsg.value = err.data?.message || 'Failed to save internal staff account'
    showToast(errorMsg.value, 'error')
  } finally {
    submitting.value = false
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
    await $fetch(`/api/employee/users/${userToDelete.value.user_id}`, {
      method: 'DELETE'
    })
    showToast(`Staff member "${userToDelete.value.full_name}" deleted successfully`, 'success')
    isDeleteConfirmOpen.value = false
    userToDelete.value = null
    await fetchUsers()
  } catch (err: any) {
    console.error('Failed to delete user:', err)
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
  fetchTables()
  fetchUsers()
})
</script>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
