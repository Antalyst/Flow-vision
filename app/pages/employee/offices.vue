<template>
  <section ref="pageRoot" class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
          <Icon name="ph:buildings-fill" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Office Ledger</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight">Office & Desk Ledger</h1>
        <p class="mt-1.5 text-sm" :class="mutedText">
          Manage desks and tables registered under your primary office node.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-candy-orange/25 transition-all duration-200 hover:bg-candy-hover active:scale-[0.97]"
        @click="openCreateModal"
      >
        <Icon name="ph:plus-bold" class="h-4 w-4" />
        Register New Desk
      </button>
    </div>

    <!-- ── Stats Summary ─────────────────────────────────────────────── -->
    <div ref="statsEl" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div
        class="flex items-center gap-4 rounded-2xl border p-5 transition-all duration-200 hover:border-candy-orange/30"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-candy-orange/10 ring-1 ring-candy-orange/20">
          <Icon name="ph:desktop-fill" class="h-6 w-6 text-candy-orange" />
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">Active Desks</p>
          <p class="mt-0.5 text-3xl font-bold tracking-tight">{{ tables.length }}</p>
        </div>
      </div>
      <div
        class="flex items-center gap-4 rounded-2xl border p-5 transition-all duration-200 hover:border-emerald-500/30"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <Icon name="ph:user-check-fill" class="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Assigned</p>
          <p class="mt-0.5 text-3xl font-bold tracking-tight">{{ tables.filter(t => t.assigned_user_profile).length }}</p>
        </div>
      </div>
      <div
        class="flex items-center gap-4 rounded-2xl border p-5 transition-all duration-200 hover:border-amber-500/30"
        :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
          <Icon name="ph:user-minus-fill" class="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-amber-500">Unassigned</p>
          <p class="mt-0.5 text-3xl font-bold tracking-tight">{{ tables.filter(t => !t.assigned_user_profile).length }}</p>
        </div>
      </div>
    </div>

    <!-- ── Ledger Table ───────────────────────────────────────────────── -->
    <div
      ref="tableEl"
      class="overflow-x-auto rounded-2xl border shadow-sm"
      :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
    >
      <table class="min-w-full divide-y text-sm text-left" :class="isDark ? 'divide-onyx-border' : 'divide-gray-200'">
        <thead :class="isDark ? 'bg-white/[0.02]' : 'bg-gray-50'">
          <tr>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest" :class="mutedText">Desk / Table Name</th>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest" :class="mutedText">Unique Code</th>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest" :class="mutedText">Assigned User</th>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest" :class="mutedText">Registered</th>
          </tr>
        </thead>
        <tbody class="divide-y" :class="isDark ? 'divide-onyx-border' : 'divide-gray-100'">
          <tr v-if="loading">
            <td colspan="4" class="px-6 py-12 text-center" :class="mutedText">
              <Icon name="ph:spinner-gap-bold" class="h-6 w-6 animate-spin mx-auto mb-3 text-candy-orange" />
              <p class="text-xs font-medium">Loading office desks…</p>
            </td>
          </tr>
          <tr v-else-if="!tables.length">
            <td colspan="4" class="px-6 py-16 text-center">
              <div class="flex flex-col items-center gap-3">
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-candy-orange/10 ring-1 ring-candy-orange/20">
                  <Icon name="ph:buildings-fill" class="h-7 w-7 text-candy-orange/60" />
                </div>
                <p class="font-semibold text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">No desks registered</p>
                <p class="text-xs max-w-[220px]" :class="mutedText">Register a new desk node to begin assigning internal staff.</p>
              </div>
            </td>
          </tr>
          <tr
            v-for="table in tables"
            :key="table.id"
            class="transition-colors"
            :class="isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/80'"
          >
            <td class="px-6 py-4 font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
              <div class="flex items-center gap-3">
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-candy-orange/10 flex-shrink-0">
                  <Icon name="ph:desktop-fill" class="h-3.5 w-3.5 text-candy-orange" />
                </span>
                {{ table.name }}
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold"
                :class="isDark ? 'border-onyx-border bg-white/5 text-gray-300' : 'border-gray-200 bg-gray-100 text-gray-700'">
                {{ table.code }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div v-if="table.assigned_user_profile" class="flex items-center gap-2.5">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-candy-orange text-white text-[10px] font-bold flex-shrink-0">
                  {{ table.assigned_user_profile.full_name?.charAt(0) || '?' }}
                </span>
                <div>
                  <p class="text-xs font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ table.assigned_user_profile.full_name }}</p>
                  <p class="text-[10px]" :class="mutedText">{{ table.assigned_user_profile.email }}</p>
                </div>
              </div>
              <span v-else class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
                :class="isDark ? 'border-onyx-border text-gray-500' : 'border-gray-200 text-gray-400'">
                <span class="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                Unassigned
              </span>
            </td>
            <td class="px-6 py-4 text-xs" :class="mutedText">
              {{ new Date(table.created_at).toLocaleDateString() }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Registration Modal ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <form
            class="w-full max-w-md rounded-2xl shadow-2xl border"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
            @submit.prevent="registerOffice"
          >
            <!-- Modal header -->
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-candy-orange/10">
                  <Icon name="ph:desktop-fill" class="h-4.5 w-4.5 text-candy-orange" />
                </span>
                <h2 class="text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Register New Desk</h2>
              </div>
              <button
                type="button"
                class="rounded-lg p-1.5 transition hover:bg-gray-100 dark:hover:bg-white/10"
                @click="isModalOpen = false"
              >
                <Icon name="ph:x" class="h-4 w-4" :class="mutedText" />
              </button>
            </div>

            <div class="space-y-4 px-6 py-5">
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">
                  Desk / Table Name <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  placeholder="e.g. Table A — Public Intake"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
                  @input="generateCode"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">
                  Desk Code <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.code"
                  type="text"
                  required
                  placeholder="e.g. TABLE-A"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange font-mono uppercase tracking-wider"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">
                  Assign to Staff Member
                </label>
                <select
                  v-model="form.assigned_user"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-300 bg-white text-gray-900'"
                >
                  <option value="">Unassigned</option>
                  <option v-for="user in subUsers" :key="user.user_id" :value="user.user_id">
                    {{ user.full_name }} ({{ user.email }})
                  </option>
                </select>
              </div>
            </div>

            <div v-if="errorMsg" class="mx-6 mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
              {{ errorMsg }}
            </div>

            <div class="flex justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                class="rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                :class="isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'"
                @click="isModalOpen = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="submitting"
                class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-candy-hover disabled:opacity-50 transition"
              >
                <Icon v-if="submitting" name="ph:spinner-gap-bold" class="h-4 w-4 animate-spin" />
                {{ submitting ? 'Registering…' : 'Register Desk' }}
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

// GSAP refs
const pageRoot = ref<HTMLElement | null>(null)
const headerEl = ref<HTMLElement | null>(null)
const statsEl  = ref<HTMLElement | null>(null)
const tableEl  = ref<HTMLElement | null>(null)

const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

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
  fetchTables()
  fetchSubUsers()
})
</script>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
