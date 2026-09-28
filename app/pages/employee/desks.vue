<template>
  <section ref="pageRoot" class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
          <Icon name="ph:desktop-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Desks</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight">Desks</h1>
        <p class="mt-1.5 text-sm max-w-xl" :class="mutedText">
          Where a document is right now, inside your office — a Receiving Desk, an Evaluation Desk, an
          Approval Desk — and who's handling it. Separate from your office's own QR code above.
        </p>
      </div>

      <select
        v-if="myOffices.length > 1"
        v-model="selectedOfficeId"
        class="rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-candy-orange sm:w-64"
        :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-300 bg-white text-gray-900'"
      >
        <option v-for="o in myOffices" :key="o.id" :value="String(o.id)">{{ o.name }}</option>
      </select>

      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-candy-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!selectedOfficeId"
        @click="openCreateModal"
      >
        <Icon name="ph:plus-light" class="h-4 w-4" />
        Add Desk
      </button>
    </div>

    <!-- ── Stats Summary ─────────────────────────────────────────────── -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="flex items-center gap-4 rounded-2xl border p-5" :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-candy-orange/10 border border-candy-orange/20">
          <Icon name="ph:desktop-light" class="h-6 w-6 text-candy-orange" />
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-candy-orange">Desks</p>
          <p class="mt-0.5 text-3xl font-bold tracking-tight">{{ desks.length }}</p>
        </div>
      </div>
      <div class="flex items-center gap-4 rounded-2xl border p-5" :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 border border-success/20">
          <Icon name="ph:user-check-light" class="h-6 w-6 text-success" />
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-success">Assigned</p>
          <p class="mt-0.5 text-3xl font-bold tracking-tight">{{ desks.filter(d => d.assigned_user).length }}</p>
        </div>
      </div>
      <div class="flex items-center gap-4 rounded-2xl border p-5" :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 border border-warning/20">
          <Icon name="ph:power-light" class="h-6 w-6 text-warning" />
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-warning">Inactive</p>
          <p class="mt-0.5 text-3xl font-bold tracking-tight">{{ desks.filter(d => !d.is_active).length }}</p>
        </div>
      </div>
    </div>

    <!-- ── Desks Grid ────────────────────────────────────────────────── -->
    <div v-if="loading" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div v-for="n in 4" :key="n" class="h-56 animate-pulse rounded-2xl border" :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'" />
    </div>

    <div
      v-else-if="!desks.length"
      class="py-16 text-center rounded-2xl"
      :class="isDark ? 'bg-onyx-card border border-onyx-border' : 'bg-white shadow-sm'"
    >
      <Icon name="ph:desktop-light" class="mx-auto h-10 w-10 text-candy-orange opacity-40" />
      <p class="mt-3 font-semibold text-sm">No desks yet</p>
      <p class="mt-1 text-xs max-w-sm mx-auto" :class="mutedText">
        Add a desk to start tracking exactly where a document is inside your office.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <DeskQrCard
        v-for="desk in desks"
        :key="desk.id"
        :desk="desk"
        @edit="openEditModal"
        @delete="handleDelete"
      />
    </div>

    <!-- ── Create / Edit Modal ──────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <form
            class="w-full max-w-md rounded-2xl border"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
            @submit.prevent="submitForm"
          >
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-full border border-candy-orange/20 bg-candy-orange/10">
                  <Icon name="ph:desktop-light" class="h-4.5 w-4.5 text-candy-orange" />
                </span>
                <h2 class="text-base font-bold">{{ editingId ? 'Edit Desk' : 'Add Desk' }}</h2>
              </div>
              <button type="button" class="rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/10" @click="isModalOpen = false">
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
                  placeholder="e.g. Evaluation Desk"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">
                  Desk Code
                </label>
                <input
                  v-model="form.code"
                  type="text"
                  placeholder="Auto-generated if left blank"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange font-mono uppercase tracking-wider"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">
                  Assigned Staff
                </label>
                <select
                  v-model="form.assigned_user_id"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-300 bg-white text-gray-900'"
                >
                  <option value="">Unassigned</option>
                  <option v-for="user in staffOptions" :key="user.user_id" :value="user.user_id">
                    {{ user.full_name }} ({{ user.email }})
                  </option>
                </select>
              </div>

              <label v-if="editingId" class="flex items-center gap-2 text-sm font-semibold">
                <input v-model="form.is_active" type="checkbox" class="accent-candy-orange" />
                Active
              </label>
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
                {{ submitting ? 'Saving…' : (editingId ? 'Save Changes' : 'Add Desk') }}
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>

  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useTheme } from '~/composables/useTheme'
import { useAuthStore } from '~/stores/auth'
import DeskQrCard from '~/components/employee/desks/DeskQrCard.vue'

definePageMeta({ layout: 'employee' })

const { isDark } = useTheme()
const auth = useAuthStore()

interface OfficeRecord { id: string; name: string }
interface DeskRecord {
  id: string
  name: string
  code: string
  qr_code_data: string
  description: string | null
  is_active: boolean
  office_id: string
  office: { id: string; name: string } | null
  assigned_user: { user_id: string; full_name: string } | null
}

const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

const myOffices = ref<OfficeRecord[]>([])
const selectedOfficeId = ref('')
const desks = ref<DeskRecord[]>([])
const staffOptions = ref<{ user_id: string; full_name: string; email: string }[]>([])

const loading = ref(true)
const submitting = ref(false)
const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const errorMsg = ref('')

const form = reactive({
  name: '',
  code: '',
  assigned_user_id: '',
  is_active: true,
})

async function fetchMyOffices() {
  const orgId = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return
  try {
    const res = await $fetch<{ success: boolean; data: OfficeRecord[] }>('/api/employee/my-offices', {
      params: { orgId, userId },
    })
    myOffices.value = res.data ?? []
    if (myOffices.value.length && !selectedOfficeId.value) {
      selectedOfficeId.value = String(myOffices.value[0].id)
    }
  } catch (err) {
    console.error('[Desks] fetchMyOffices error:', err)
  }
}

async function fetchDesks() {
  if (!selectedOfficeId.value) {
    desks.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: DeskRecord[] }>('/api/desks', {
      params: { office_id: selectedOfficeId.value },
    })
    desks.value = res.data ?? []
  } catch (err) {
    console.error('[Desks] fetchDesks error:', err)
  } finally {
    loading.value = false
  }
}

async function fetchStaffOptions() {
  try {
    const res = await $fetch<{ data: any[] }>('/api/employee/users')
    staffOptions.value = (res.data ?? []).filter((u) => u.role === 'employee_sub_user')
  } catch (err) {
    console.error('[Desks] fetchStaffOptions error:', err)
  }
}

function openCreateModal() {
  editingId.value = null
  form.name = ''
  form.code = ''
  form.assigned_user_id = ''
  form.is_active = true
  errorMsg.value = ''
  isModalOpen.value = true
}

function openEditModal(desk: DeskRecord) {
  editingId.value = desk.id
  form.name = desk.name
  form.code = desk.code
  form.assigned_user_id = desk.assigned_user?.user_id ?? ''
  form.is_active = desk.is_active
  errorMsg.value = ''
  isModalOpen.value = true
}

async function submitForm() {
  if (submitting.value) return
  submitting.value = true
  errorMsg.value = ''
  try {
    if (editingId.value) {
      await $fetch(`/api/desks/${editingId.value}`, {
        method: 'PUT',
        body: {
          name: form.name,
          code: form.code,
          assigned_user_id: form.assigned_user_id || null,
          is_active: form.is_active,
        },
      })
    } else {
      await $fetch('/api/desks', {
        method: 'POST',
        body: {
          office_id: selectedOfficeId.value,
          name: form.name,
          code: form.code || undefined,
          assigned_user_id: form.assigned_user_id || undefined,
        },
      })
    }
    isModalOpen.value = false
    await fetchDesks()
  } catch (err: any) {
    errorMsg.value = err?.data?.message || 'We could not save this desk. Please try again.'
  } finally {
    submitting.value = false
  }
}

async function handleDelete(deskId: string) {
  if (!confirm('Delete this desk? This cannot be undone.')) return
  try {
    await $fetch(`/api/desks/${deskId}`, { method: 'DELETE' })
    desks.value = desks.value.filter((d) => d.id !== deskId)
  } catch (err: any) {
    alert(err?.data?.message || 'We could not delete this desk.')
  }
}

watch(selectedOfficeId, fetchDesks)

onMounted(async () => {
  await fetchMyOffices()
  await Promise.all([fetchDesks(), fetchStaffOptions()])
})
</script>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
