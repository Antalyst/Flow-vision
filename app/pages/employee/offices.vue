<template>
  <section ref="pageRoot" class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
          <Icon name="ph:buildings-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Office QR Codes</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight">Office QR Codes</h1>
        <p class="mt-1.5 text-sm" :class="mutedText">
          Manage the desks registered under your office, and view each staff member's QR code.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-candy-hover active:scale-[0.97]"
        @click="openCreateModal"
      >
        <Icon name="ph:plus-light" class="h-4 w-4" />
        Register New Desk
      </button>
    </div>

    <!-- ── Stats Summary ─────────────────────────────────────────────── -->
    <div ref="statsEl" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div
        class="flex items-center gap-4 rounded-2xl border p-5 transition-colors hover:bg-gray-50 dark:hover:bg-onyx-black"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-candy-orange/10 border border-candy-orange/20">
          <Icon name="ph:desktop-light" class="h-6 w-6 text-candy-orange" />
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-candy-orange">Active Desks</p>
          <p class="mt-0.5 text-3xl font-bold tracking-tight">{{ tables.length }}</p>
        </div>
      </div>
      <div
        class="flex items-center gap-4 rounded-2xl border p-5 transition-colors hover:bg-gray-50 dark:hover:bg-onyx-black"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 border border-success/20">
          <Icon name="ph:user-check-light" class="h-6 w-6 text-success" />
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-success">Assigned</p>
          <p class="mt-0.5 text-3xl font-bold tracking-tight">{{ tables.filter(t => t.assigned_user_profile).length }}</p>
        </div>
      </div>
      <div
        class="flex items-center gap-4 rounded-2xl border p-5 transition-colors hover:bg-gray-50 dark:hover:bg-onyx-black"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 border border-warning/20">
          <Icon name="ph:user-minus-light" class="h-6 w-6 text-warning" />
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-warning">Unassigned</p>
          <p class="mt-0.5 text-3xl font-bold tracking-tight">{{ tables.filter(t => !t.assigned_user_profile).length }}</p>
        </div>
      </div>
    </div>

    <!-- ── Ledger Table ───────────────────────────────────────────────── -->
    <!-- ── Ledger Grid ───────────────────────────────────────────────── -->
    <div ref="tableEl" class="space-y-8">
      
      <!-- Assigned Offices Section -->
      <div>
        <h2 class="mb-4 text-sm font-bold uppercase tracking-wide" :class="isDark ? 'text-white' : 'text-gray-900'">My Assigned Offices</h2>
        <div v-if="myOfficesLoading" class="py-12 text-center" :class="mutedText">
          <Icon name="ph:spinner-gap-light" class="h-6 w-6 animate-spin mx-auto mb-3 text-candy-orange" />
          <p class="text-xs font-medium">Loading offices…</p>
        </div>
        <div v-else-if="!myOffices.length" class="py-12 text-center rounded-2xl transition-all" :class="isDark ? 'bg-[#18181B] shadow-md shadow-black/20' : 'bg-white shadow-sm'">
          <div class="flex flex-col items-center gap-2">
            <Icon name="ph:building-office-light" class="h-6 w-6 text-gray-400" />
            <p class="text-xs font-medium" :class="mutedText">No offices assigned to you yet.</p>
          </div>
        </div>
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <OfficeQrCard
            v-for="office in myOffices"
            :key="'my-' + office.id"
            :office="office"
            :editable="false"
          />
        </div>
      </div>

      <!-- Sub-Offices / Desks Section -->
      <div>
        <h2 class="mb-4 text-sm font-bold uppercase tracking-wide" :class="isDark ? 'text-white' : 'text-gray-900'">Staff Desks</h2>
        <div v-if="loading" class="py-12 text-center" :class="mutedText">
          <Icon name="ph:spinner-gap-light" class="h-6 w-6 animate-spin mx-auto mb-3 text-candy-orange" />
          <p class="text-xs font-medium">Loading office desks…</p>
        </div>
        <div v-else-if="!tables.length" class="py-16 text-center rounded-2xl transition-all" :class="isDark ? 'bg-[#18181B] shadow-md shadow-black/20' : 'bg-white shadow-sm'">
          <div class="flex flex-col items-center gap-3">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-candy-orange/10 border-transparent">
              <Icon name="ph:buildings-light" class="h-7 w-7 text-candy-orange/60" />
            </div>
            <p class="font-semibold text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">No desks registered</p>
            <p class="text-xs max-w-[220px]" :class="mutedText">Register a new desk to begin assigning internal staff.</p>
          </div>
        </div>
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <OfficeQrCard
            v-for="table in tables"
            :key="'table-' + table.id"
            :office="table"
            @edit="openEditModal"
            @delete="handleDeleteOffice"
          />
        </div>
      </div>

    </div>

    <!-- ── Registration Modal ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <form
            class="w-full max-w-md rounded-2xl border"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
            @submit.prevent="submitOfficeForm"
          >
            <!-- Modal header -->
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-full border border-candy-orange/20 bg-candy-orange/10">
                  <Icon name="ph:desktop-light" class="h-4.5 w-4.5 text-candy-orange" />
                </span>
                <h2 class="text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ editingId ? 'Edit Desk' : 'Register New Desk' }}
                </h2>
              </div>
              <button
                type="button"
                class="rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
                @click="isModalOpen = false"
              >
                <Icon name="ph:x-light" class="h-4 w-4" :class="mutedText" />
              </button>
            </div>

            <div class="space-y-4 px-6 py-5">
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">
                  Desk Name <span class="text-danger">*</span>
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  placeholder="e.g. Front Counter A"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
                  @input="generateCode"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">
                  Desk Code <span class="text-danger">*</span>
                </label>
                <input
                  v-model="form.code"
                  type="text"
                  required
                  placeholder="e.g. DESK-A"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange font-mono uppercase tracking-wider"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">
                  Assign to Staff Member
                </label>
                <select
                  v-model="form.assigned_user"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-300 bg-white text-gray-900'"
                >
                  <option value="">Unassigned</option>
                  <option v-for="user in subUsers" :key="user.user_id" :value="user.user_id">
                    {{ user.full_name }} ({{ user.email }})
                  </option>
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
                {{ submitting ? (editingId ? 'Saving…' : 'Registering…') : (editingId ? 'Save Changes' : 'Register Desk') }}
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>

  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'
import { gsap } from 'gsap'
import OfficeQrCard from '~/components/employee/OfficeQrCard.vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'employee' })

const { isDark } = useTheme()
const auth = useAuthStore()

const loading = ref(true)
const submitting = ref(false)
const isModalOpen = ref(false)
const tables = ref<any[]>([])
const subUsers = ref<any[]>([])
const errorMsg = ref('')
const editingId = ref<string | null>(null)

const myOffices = ref<any[]>([])
const myOfficesLoading = ref(true)

const form = reactive({
  name: '',
  code: '',
  assigned_user: ''
})

// GSAP refs
const pageRoot = ref<HTMLElement | null>(null)
const headerEl = ref<HTMLElement | null>(null)
const statsEl  = ref<HTMLElement | null>(null)
const tableEl  = ref<HTMLElement | null>(null)

const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const staffMembers = computed(() => subUsers.value.filter((u) => u.role === 'employee_sub_user'))

function generateCode() {
  if (!form.name) return
  const prefix = form.name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  form.code = `${prefix}-${rand}`
}

async function fetchMyOffices() {
  const orgId  = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) {
    myOfficesLoading.value = false
    return
  }
  myOfficesLoading.value = true
  try {
    const res = await $fetch<{ data: any[] }>('/api/employee/my-offices', {
      params: { orgId, userId }
    })
    myOffices.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch my offices:', err)
  } finally {
    myOfficesLoading.value = false
  }
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
  editingId.value = null
  form.name = ''
  form.code = ''
  form.assigned_user = ''
  errorMsg.value = ''
  isModalOpen.value = true
}

function openEditModal(office: any) {
  editingId.value = String(office.id)
  form.name = office.name || ''
  form.code = office.code || ''
  form.assigned_user = office.assigned_user ? String(office.assigned_user) : ''
  errorMsg.value = ''
  isModalOpen.value = true
}

async function submitOfficeForm() {
  if (submitting.value) return
  submitting.value = true
  errorMsg.value = ''
  try {
    const body = {
      name: form.name,
      code: form.code,
      assigned_user: form.assigned_user || undefined
    }
    if (editingId.value) {
      await $fetch(`/api/employee/offices/${editingId.value}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/employee/offices', { method: 'POST', body })
    }
    isModalOpen.value = false
    await fetchTables()
  } catch (err: any) {
    console.error('Failed to save desk/table:', err)
    errorMsg.value = err.data?.message || 'Failed to save desk/table'
  } finally {
    submitting.value = false
  }
}

async function handleDeleteOffice(id: string) {
  if (!confirm('Delete this desk? This cannot be undone.')) return
  try {
    await $fetch(`/api/employee/offices/${id}`, { method: 'DELETE' })
    tables.value = tables.value.filter((t) => String(t.id) !== String(id))
  } catch (err: any) {
    console.error('Failed to delete desk/table:', err)
    alert(err.data?.message || 'Failed to delete desk/table')
  }
}

// ── GSAP Entrance ──────────────────────────────────────────────────────
const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) {
    tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  }
  if (statsEl.value) {
    const cards = statsEl.value.querySelectorAll(':scope > div')
    tl.fromTo(cards, { opacity: 0, y: 18, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.08 }, 0.15)
  }
  if (tableEl.value) {
    tl.fromTo(tableEl.value, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45 }, 0.32)
  }
}

onMounted(() => {
  runEntranceAnimation()
  fetchMyOffices()
  fetchTables()
  fetchSubUsers()
})
</script>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
