<template>
  <section class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">
    
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="mb-3 h-1 w-14 rounded-full bg-candy-orange" />
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Office & Desk Ledger</h1>
        <p class="mt-1 text-sm" :class="mutedText">
          Manage desks and tables registered under your primary office node.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-candy-orange/25 transition-all duration-200 hover:bg-[#e95a0b] active:scale-[0.97]"
        @click="openCreateModal"
      >
        <Icon name="ph:plus-bold" class="h-4 w-4" />
        Register New Table/Desk
      </button>
    </div>

    <!-- Stats summary -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="flex items-center gap-4 rounded-xl border p-4 shadow-sm" :class="glassSurface">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-candy-orange/10 text-candy-orange">
          <Icon name="ph:desktop-fill" class="h-6 w-6" />
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-candy-orange">Active Desks</p>
          <p class="text-2xl font-bold mt-0.5">{{ tables.length }}</p>
        </div>
      </div>
    </div>

    <!-- Ledger table -->
    <div class="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-onyx-black shadow-sm">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-white/10 text-sm text-left">
        <thead class="bg-gray-50 dark:bg-white/[0.02] text-xs font-bold uppercase tracking-wider">
          <tr>
            <th class="px-6 py-4 text-gray-500 dark:text-gray-400">Office/Table Name</th>
            <th class="px-6 py-4 text-gray-500 dark:text-gray-400">Unique Code</th>
            <th class="px-6 py-4 text-gray-500 dark:text-gray-400">Assigned User</th>
            <th class="px-6 py-4 text-gray-500 dark:text-gray-400">Created At</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-white/10">
          <tr v-if="loading">
            <td colspan="4" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              <Icon name="ph:spinner-gap-bold" class="h-6 w-6 animate-spin mx-auto mb-2 text-candy-orange" />
              Loading office tables & desks...
            </td>
          </tr>
          <tr v-else-if="!tables.length">
            <td colspan="4" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              <Icon name="ph:buildings-fill" class="h-10 w-10 mx-auto mb-3 text-candy-orange/50" />
              <p class="font-semibold text-base">No desks registered</p>
              <p class="text-xs mt-1">Spin up a new table/desk node to assign sub-staff.</p>
            </td>
          </tr>
          <tr v-for="table in tables" :key="table.id" class="hover:bg-gray-50 dark:hover:bg-white/[0.01]">
            <td class="px-6 py-4 font-semibold text-gray-900 dark:text-white">{{ table.name }}</td>
            <td class="px-6 py-4">
              <span class="font-mono bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-xs font-semibold">
                {{ table.code }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div v-if="table.assigned_user_profile" class="flex flex-col">
                <span class="font-medium text-gray-900 dark:text-white">{{ table.assigned_user_profile.full_name }}</span>
                <span class="text-[11px] text-gray-500">{{ table.assigned_user_profile.email }}</span>
              </div>
              <span v-else class="text-gray-400 italic text-xs">Unassigned</span>
            </td>
            <td class="px-6 py-4 text-gray-500 dark:text-gray-400">
              {{ new Date(table.created_at).toLocaleDateString() }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Registration Modal -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <form @submit.prevent="registerOffice" class="w-full max-w-md rounded-2xl bg-white dark:bg-onyx-black p-6 shadow-2xl border border-gray-200 dark:border-white/10">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Register New Table/Desk</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Table/Desk Name <span class="text-red-500">*</span>
              </label>
              <input 
                v-model="form.name" 
                type="text" 
                required 
                placeholder="e.g. Table A - Public Intake"
                class="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-transparent px-3.5 py-2.5 text-gray-900 dark:text-white focus:border-candy-orange focus:ring-1 focus:ring-candy-orange outline-none transition" 
                @input="generateCode"
              />
            </div>
            
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Custom Table Code <span class="text-red-500">*</span>
              </label>
              <input 
                v-model="form.code" 
                type="text" 
                required 
                placeholder="e.g. TABLE-A"
                class="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-transparent px-3.5 py-2.5 text-gray-900 dark:text-white focus:border-candy-orange focus:ring-1 focus:ring-candy-orange outline-none transition font-mono uppercase" 
              />
            </div>
            
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Assigned Sub-User
              </label>
              <select 
                v-model="form.assigned_user" 
                class="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-transparent px-3.5 py-2.5 text-gray-900 dark:text-white focus:border-candy-orange focus:ring-1 focus:ring-candy-orange outline-none transition"
              >
                <option value="">Unassigned</option>
                <option v-for="user in subUsers" :key="user.user_id" :value="user.user_id">
                  {{ user.full_name }} ({{ user.email }})
                </option>
              </select>
            </div>
          </div>

          <div v-if="errorMsg" class="mt-4 p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs">
            {{ errorMsg }}
          </div>
          
          <div class="mt-6 flex justify-end gap-3">
            <button type="button" @click="isModalOpen = false" class="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition">
              Cancel
            </button>
            <button 
              type="submit" 
              :disabled="submitting" 
              class="rounded-xl bg-candy-orange px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#e95a0b] disabled:opacity-50 transition inline-flex items-center gap-2"
            >
              <Icon v-if="submitting" name="ph:spinner-gap-bold" class="h-4 w-4 animate-spin" />
              {{ submitting ? 'Registering...' : 'Register' }}
            </button>
          </div>
        </form>
      </div>
    </Teleport>

  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'

definePageMeta({ layout: 'employee' })

const { isDark } = useTheme()

const loading = ref(true)
const submitting = ref(false)
const isModalOpen = ref(false)
const tables = ref<any[]>([])
const subUsers = ref<any[]>([])
const errorMsg = ref('')

const form = reactive({
  name: '',
  code: '',
  assigned_user: ''
})

// Theming helpers
const glassSurface = computed(() =>
  isDark.value
    ? 'border-white/10 bg-white/[0.04]'
    : 'border-gray-200 bg-white'
)
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

// Auto-generate code from name
function generateCode() {
  if (!form.name) return
  const prefix = form.name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  
  // Append a short random string to guarantee basic uniqueness
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  form.code = `${prefix}-${rand}`
}

async function fetchTables() {
  loading.value = true
  try {
    const res = await $fetch<{ data: any[] }>('/api/employee/offices')
    tables.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch desks/tables:', err)
  } finally {
    loading.value = false
  }
}

async function fetchSubUsers() {
  try {
    const res = await $fetch<{ data: any[] }>('/api/employee/users')
    subUsers.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch sub-users:', err)
  }
}

function openCreateModal() {
  form.name = ''
  form.code = ''
  form.assigned_user = ''
  errorMsg.value = ''
  isModalOpen.value = true
}

async function registerOffice() {
  if (submitting.value) return
  submitting.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/employee/offices', {
      method: 'POST',
      body: {
        name: form.name,
        code: form.code,
        assigned_user: form.assigned_user || undefined
      }
    })
    isModalOpen.value = false
    await fetchTables()
  } catch (err: any) {
    console.error('Failed to register desk/table:', err)
    errorMsg.value = err.data?.message || 'Failed to register desk/table'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchTables()
  fetchSubUsers()
})
</script>
