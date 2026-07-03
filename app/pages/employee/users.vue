<template>
  <section class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">
    
    <!-- Header -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-3 h-1 w-14 rounded-full bg-candy-orange" />
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Internal Desk Staff</h1>
        <p class="mt-1 text-sm" :class="mutedText">
          Manage internal staff accounts assigned to specific office desks/tables.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-candy-orange/25 transition-all duration-200 hover:bg-[#e95a0b] active:scale-[0.97]"
          @click="openAddModal"
        >
          <Icon name="ph:plus-bold" class="h-4 w-4" />
          Add Internal Staff
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-onyx-black shadow-sm">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-white/10 text-sm">
        <thead class="bg-gray-50 dark:bg-white/[0.02]">
          <tr>
            <th class="px-6 py-4 text-left font-semibold text-gray-900 dark:text-gray-300">Full Name</th>
            <th class="px-6 py-4 text-left font-semibold text-gray-900 dark:text-gray-300">Email Address</th>
            <th class="px-6 py-4 text-left font-semibold text-gray-900 dark:text-gray-300">Assigned Desk/Table Node</th>
            <th class="px-6 py-4 text-left font-semibold text-gray-900 dark:text-gray-300">Account Status</th>
            <th class="px-6 py-4 text-left font-semibold text-gray-900 dark:text-gray-300">Date Registered</th>
            <th class="px-6 py-4 text-center font-semibold text-gray-900 dark:text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-white/10">
          <tr v-if="loading">
            <td colspan="6" class="px-6 py-8 text-center text-gray-500">
              <Icon name="ph:spinner-gap-bold" class="h-6 w-6 animate-spin mx-auto mb-2 text-candy-orange" />
              Loading internal staff...
            </td>
          </tr>
          <tr v-else-if="!users.length">
            <td colspan="6" class="px-6 py-8 text-center text-gray-500">No internal staff found. Create one to get started.</td>
          </tr>
          <tr v-for="user in users" :key="user.user_id" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
            <td class="px-6 py-4 font-semibold text-gray-900 dark:text-white">{{ user.full_name }}</td>
            <td class="px-6 py-4 text-gray-500 dark:text-gray-400">{{ user.email }}</td>
            <td class="px-6 py-4 text-gray-500 dark:text-gray-400">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-candy-orange/30 bg-candy-orange/10 px-2.5 py-0.5 text-xs font-semibold text-candy-orange">
                {{ user.offices?.name || 'Unassigned / Unknown' }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="user.status === 1 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="user.status === 1 ? 'bg-emerald-500' : 'bg-rose-500'" />
                {{ user.status === 1 ? 'Active' : 'Suspended' }}
              </span>
            </td>
            <td class="px-6 py-4 text-gray-500 dark:text-gray-400">{{ new Date(user.created_at).toLocaleDateString() }}</td>
            <td class="px-6 py-4 text-center">
              <div class="flex items-center justify-center gap-2">
                <button
                  type="button"
                  class="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition"
                  title="Edit Sub-User"
                  @click="openEditModal(user)"
                >
                  <Icon name="ph:pencil-line-bold" class="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  class="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                  title="Delete Sub-User"
                  @click="confirmDelete(user)"
                >
                  <Icon name="ph:trash-bold" class="h-4.5 w-4.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <form @submit.prevent="saveUser" class="w-full max-w-md rounded-2xl bg-white dark:bg-onyx-black p-6 shadow-2xl border border-gray-200 dark:border-white/10">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {{ isEditMode ? 'Edit Internal Staff' : 'Add Internal Staff' }}
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input v-model="form.full_name" type="text" required placeholder="Juan D. Dela Cruz" class="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-transparent px-3.5 py-2.5 text-gray-900 dark:text-white focus:border-candy-orange focus:ring-1 focus:ring-candy-orange outline-none transition" />
            </div>
            
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <input v-model="form.email" type="email" required placeholder="example@domain.com" class="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-transparent px-3.5 py-2.5 text-gray-900 dark:text-white focus:border-candy-orange focus:ring-1 focus:ring-candy-orange outline-none transition" />
            </div>
            
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Password <span v-if="!isEditMode" class="text-red-500">*</span>
              </label>
              <input v-model="form.password" type="password" :required="!isEditMode" placeholder="••••••••" class="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-transparent px-3.5 py-2.5 text-gray-900 dark:text-white focus:border-candy-orange focus:ring-1 focus:ring-candy-orange outline-none transition" />
              <p v-if="isEditMode" class="mt-1 text-[11px]" :class="mutedText">Leave blank to keep existing password.</p>
            </div>
            
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Assigned Desk/Table</label>
              <select v-model="form.office_id" required class="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-transparent px-3.5 py-2.5 text-gray-900 dark:text-white focus:border-candy-orange focus:ring-1 focus:ring-candy-orange outline-none transition">
                <option value="" disabled>Select a sub-desk table...</option>
                <option v-for="table in tables" :key="table.id" :value="table.id">
                  {{ table.name }} ({{ table.code }})
                </option>
              </select>
              <p v-if="!tables.length" class="mt-1 text-xs text-amber-500">
                No active sub-desks registered. Create a desk node first in My Offices.
              </p>
            </div>
          </div>

          <div v-if="errorMsg" class="mt-4 p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs">
            {{ errorMsg }}
          </div>
          
          <div class="mt-6 flex justify-end gap-3">
            <button type="button" @click="isModalOpen = false" class="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition">Cancel</button>
            <button type="submit" :disabled="submitting" class="rounded-xl bg-candy-orange px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#e95a0b] disabled:opacity-50 transition inline-flex items-center gap-2">
              <Icon v-if="submitting" name="ph:spinner-gap-bold" class="h-4 w-4 animate-spin" />
              {{ submitting ? 'Saving...' : (isEditMode ? 'Update Account' : 'Add Account') }}
            </button>
          </div>
        </form>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="w-full max-w-md rounded-2xl bg-white dark:bg-onyx-black p-6 shadow-2xl border border-gray-200 dark:border-white/10 text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 mb-4">
            <Icon name="ph:warning-circle-bold" class="h-6 w-6" />
          </div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Internal Staff Account?</h3>
          <p class="text-sm mb-6" :class="mutedText">
            Are you sure you want to permanently delete <strong>{{ userToDelete?.full_name }}</strong>? This action is irreversible.
          </p>
          <div class="flex justify-center gap-3">
            <button type="button" @click="isDeleteConfirmOpen = false" class="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition">
              Cancel
            </button>
            <button 
              type="button" 
              :disabled="submitting" 
              class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition inline-flex items-center gap-2 disabled:opacity-50"
              @click="executeDelete"
            >
              <Icon v-if="submitting" name="ph:spinner-gap-bold" class="h-4 w-4 animate-spin" />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'
import { useEmployeeToast } from '~/composables/useEmployeeToast'

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

// Delete variables
const isDeleteConfirmOpen = ref(false)
const userToDelete = ref<any | null>(null)

const form = reactive({
  full_name: '',
  email: '',
  password: '',
  office_id: ''
})

const glassSurface = computed(() =>
  isDark.value
    ? 'border-white/10 bg-white/[0.04]'
    : 'border-gray-200 bg-white'
)
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
  form.password = '' // Blank on edit unless changing
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

onMounted(() => {
  fetchTables()
  fetchUsers()
})
</script>
