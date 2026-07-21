<template>
  <section
    class="w-full space-y-6 pb-24 lg:pb-8 animate-fade-in"
    :class="isDark ? 'text-white' : 'text-onyx-black'"
  >
    <!-- Header banner -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="mb-3 h-1 w-14 rounded-full bg-candy-orange"></div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Offices Management</h1>
        <p class="mt-1 text-sm animate-pulse" :class="mutedTextClass">
          {{ organizationLabel }}
        </p>
      </div>

      <button
        type="button"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#F47D2F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-candy-orange/20 transition hover:bg-[#e95a0b] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange"
        @click="openCreateDrawer"
      >
        <Icon name="ph:plus-bold" class="h-4 w-4" />
        Create New Office
      </button>
    </div>

    <!-- Main directory + stats -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      <article
        class="overflow-hidden rounded-lg border shadow-card lg:col-span-2 transition-all duration-300"
        :class="surfaceClass"
      >
        <div class="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between" :class="borderClass">
          <div>
            <h2 class="text-base font-semibold">Office Directory</h2>
            <p class="mt-1 text-xs" :class="mutedTextClass">
              {{ filteredOffices.length }} offices linked to {{ currentOrgName }}
            </p>
          </div>

          <div
            class="flex items-center gap-2 rounded-lg border px-3 py-2 transition-all"
            :class="isDark ? 'border-onyx-border bg-onyx-black/40 focus-within:border-candy-orange' : 'border-gray-200 bg-gray-50 focus-within:border-candy-orange'"
          >
            <Icon name="ph:magnifying-glass" class="h-4 w-4" :class="mutedTextClass" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search offices"
              class="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400 sm:w-56"
            />
          </div>
        </div>

        <!-- Directory Table -->
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead :class="isDark ? 'bg-onyx-black/50 text-gray-400' : 'bg-gray-50 text-gray-500'">
              <tr>
               
                <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Name</th>
                <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Assigned User</th>
                <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Created</th>
                <th class="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="office in filteredOffices"
                :key="office.id"
                class="border-t transition-colors duration-150"
                :class="[borderClass, isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50']"
              >
                
                <td class="min-w-48 px-5 py-4">
                  <div class="font-semibold">{{ office.name }}</div>
                  
                </td>
                <td class="whitespace-nowrap px-5 py-4">
                  {{ getUserName(office.assigned_user) }}
                </td>
                <td class="whitespace-nowrap px-5 py-4" :class="mutedTextClass">
                  {{ formatDate(office.created_at) }}
                </td>
                <td class="whitespace-nowrap px-5 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:text-candy-orange hover:bg-candy-orange/10"
                      aria-label="Edit Office"
                      title="Edit Office"
                      @click="openEditDrawer(office)"
                    >
                      <Icon name="ph:pencil-simple-line" class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10"
                      aria-label="Delete"
                      title="Delete"
                      @click="handleDelete(office.id)"
                    >
                      <Icon name="ph:trash" class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!filteredOffices.length">
                <td colspan="5" class="px-5 py-12 text-center" :class="mutedTextClass">
                  No offices match the current filters or no offices have been created.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <!-- Sidebar Metadata Panel -->
      <aside class="space-y-5">
        <article class="rounded-lg border p-5 shadow-card transition-all duration-300" :class="surfaceClass">
          <div class="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">Settings</h2>
              <p class="mt-1 text-xs" :class="mutedTextClass">Workspace appearance</p>
            </div>
            <Icon name="ph:gear-six" class="h-5 w-5 text-candy-orange" />
          </div>

          <div class="flex items-center justify-between rounded-lg border p-4" :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'">
            <div>
              <p class="text-sm font-semibold">{{ isDark ? 'Dark Mode' : 'Light Mode' }}</p>
              <p class="mt-1 text-xs" :class="mutedTextClass">Global dashboard theme</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="isDark"
              class="relative h-7 w-12 rounded-full transition focus:outline-none focus:ring-2 focus:ring-[#F47D2F] focus:ring-offset-2"
              :class="isDark ? 'bg-candy-orange focus:ring-offset-onyx-black' : 'bg-gray-300 focus:ring-offset-white'"
              @click="toggleTheme"
            >
              <span
                class="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition"
                :class="isDark ? 'left-6' : 'left-1'"
              ></span>
            </button>
          </div>
        </article>

        <article class="rounded-lg border p-5 shadow-card transition-all duration-300" :class="surfaceClass">
          <div class="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">Organization</h2>
              <p class="mt-1 text-xs" :class="mutedTextClass">Quick config metadata</p>
            </div>
            <Icon name="ph:buildings" class="h-5 w-5 text-candy-orange" />
          </div>

          <dl class="space-y-4">
            <div class="flex items-center justify-between gap-4 border-b pb-3" :class="borderClass">
              <dt class="text-xs uppercase tracking-wide" :class="mutedTextClass">Name</dt>
              <dd class="text-right text-sm font-semibold">{{ currentOrgName }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 border-b pb-3" :class="borderClass">
              <dt class="text-xs uppercase tracking-wide" :class="mutedTextClass">Code</dt>
              <dd class="font-mono text-sm font-semibold">{{ currentOrgCode }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 border-b pb-3" :class="borderClass">
              <dt class="text-xs uppercase tracking-wide" :class="mutedTextClass">Assignable Users</dt>
              <dd class="text-sm font-semibold">{{ usersUnderOrg.length }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-xs uppercase tracking-wide" :class="mutedTextClass">Workflow</dt>
              <dd class="text-sm font-semibold">Decoupled</dd>
            </div>
          </dl>
        </article>
      </aside>
    </div>

    <!-- Sliding Drawer Form -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="isDrawerOpen"
          class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
          @click="closeDrawer"
        ></div>
      </Transition>

      <Transition name="drawer-slide">
        <form
          v-if="isDrawerOpen"
          class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-xl flex-col border-l shadow-2xl transition-all duration-300"
          :class="surfaceClass"
          @submit.prevent="handleSaveOffice"
        >
          <header class="flex items-start justify-between gap-4 border-b px-5 py-5" :class="borderClass">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-candy-orange">
                {{ drawerMode === 'create' ? 'Create' : 'Update' }}
              </p>
              <h2 class="mt-1 text-xl font-bold">
                {{ drawerMode === 'create' ? 'Create Office' : 'Edit Office' }}
              </h2>
            </div>
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-lg transition hover:text-candy-orange hover:bg-candy-orange/10"
              aria-label="Close drawer"
              @click="closeDrawer"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </header>

          <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <!-- Office name field -->
            <label class="block">
              <span class="text-sm font-semibold">Office Name</span>
              <input
                v-model.trim="form.name"
                type="text"
                placeholder="e.g. Singapore Operations"
                class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="inputClass"
                required
              />
            </label>

            <!-- Assigned user selection (exclusively organization employees) -->
            <label class="block">
              <span class="text-sm font-semibold">Assigned User</span>
              <select
                v-model="form.assigned_user"
                class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="inputClass"
                required
              >
                <option disabled value="">Select a user</option>
                <option
                  v-for="user in employeesList"
                  :key="user.user_id"
                  :value="user.user_id"
                >
                  {{ user.full_name }}
                </option>
              </select>
              <p class="mt-2 text-xs animate-pulse" :class="mutedTextClass">
                Assignable users are retrieved from the current organization (org_id: {{ currentOrgId }}).
              </p>
            </label>

            <!-- Guard Info -->
            <div class="rounded-lg border p-4 text-sm" :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'">
              <div class="flex items-center gap-2 font-semibold">
                <Icon name="ph:shield-check" class="h-4 w-4 text-candy-orange" />
                Security & Data Integrity Guard
              </div>
              <p class="mt-2 text-xs leading-5" :class="mutedTextClass">
                Strict DB schema validation: Office creations default `stage_id` to `NULL`. Assignable users are verified against org ID.
              </p>
            </div>
          </div>

          <footer class="flex items-center justify-end gap-3 border-t px-5 py-4" :class="borderClass">
            <button
              type="button"
              class="rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5"
              :class="isDark ? 'border-onyx-border' : 'border-gray-200'"
              @click="closeDrawer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-lg bg-[#F47D2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95a0b] active:scale-[0.98]"
            >
              {{ drawerMode === 'create' ? 'Create Office' : 'Save Changes' }}
            </button>
          </footer>
        </form>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useOfficeStore, type OfficeRecord } from '~/stores/office'

const authStore = useAuthStore()
const officeStore = useOfficeStore()

const { isDark, toggleTheme } = useTheme()

// Fallback Org Meta if needed
const fallbackOrg = {
  org_id: 101,
  name: 'FlowVision Operations',
  code: 'FV-OPS',
}

const currentOrgId = computed(() => Number(authStore.currentOrg?.org_id || authStore.user?.org_id || fallbackOrg.org_id))
const currentOrgName = computed(() => authStore.currentOrg?.name || fallbackOrg.name)
const currentOrgCode = computed(() => authStore.currentOrg?.code || fallbackOrg.code)
const organizationLabel = computed(() => `${currentOrgName.value} / ${currentOrgCode.value}`)

const searchQuery = ref('')
const isDrawerOpen = ref(false)
const drawerMode = ref<'create' | 'edit'>('create')
const editingOfficeId = ref<number | null>(null)

const form = reactive({
  name: '',
  assigned_user: '' as string | number,
})

const employeesList = computed(() => officeStore.usersUnderOrg)
const usersUnderOrg = employeesList

const resetForm = () => {
  form.name = ''
  form.assigned_user = ''
}

const isAssignedUserSelected = () => {
  const value = form.assigned_user
  return value !== '' && value != null
}
const filteredOffices = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const offices = officeStore.offices

  if (!query) return offices

  return offices.filter((office) => {
    return [
      office.id,
      office.name,
      getUserName(office.assigned_user),
    ].some((value) => String(value).toLowerCase().includes(query))
  })
})

// Themes and class configs
const surfaceClass = computed(() => (
  isDark.value
    ? 'border-onyx-border bg-[#1A1A1A] shadow-onyx-card'
    : 'border-gray-200 bg-white'
))

const borderClass = computed(() => (isDark.value ? 'border-onyx-border' : 'border-gray-200'))
const mutedTextClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

const inputClass = computed(() => (
  isDark.value
    ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-onyx-black placeholder:text-gray-400'
))

const getUserName = (userId: string | number) => {
  return usersUnderOrg.value.find((u) => String(u.user_id) === String(userId))?.full_name || 'Unassigned'
}

const formatDate = (value: string) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

const openCreateDrawer = async () => {
  await officeStore.fetchUsersUnderOrg()
  drawerMode.value = 'create'
  editingOfficeId.value = null
  resetForm()
  isDrawerOpen.value = true
}

const openEditDrawer = async (office: OfficeRecord) => {
  await officeStore.fetchUsersUnderOrg()
  drawerMode.value = 'edit'
  editingOfficeId.value = office.id
  form.name = office.name
  const matchedUser = employeesList.value.find(
    (user) => String(user.user_id) === String(office.assigned_user)
  )
  form.assigned_user = matchedUser?.user_id ?? office.assigned_user
  isDrawerOpen.value = true
}

const closeDrawer = () => {
  isDrawerOpen.value = false
  resetForm()
}

const handleSaveOffice = async () => {
  if (!form.name.trim() || !isAssignedUserSelected()) return

  if (drawerMode.value === 'create') {
    const res = await officeStore.createOffice(form.name, form.assigned_user)
    if (res?.success) {
      closeDrawer()
      return
    }
    console.error('Create office failed:', res?.error)
    return
  }

  if (drawerMode.value === 'edit' && editingOfficeId.value) {
    const res = await officeStore.updateOffice(editingOfficeId.value, {
      name: form.name.trim(),
      assigned_user: form.assigned_user,
    })
    if (res?.success) {
      closeDrawer()
      return
    }
    console.error('Update office failed:', res?.error)
  }
}

const handleDelete = async (id: number) => {
  if (confirm('Are you sure you want to delete this office?')) {
    await officeStore.deleteOffice(id)
  }
}

onMounted(async () => {
  if (!authStore.currentOrg && authStore.user?.user_id) {
    await authStore.fetchMyOrg()
  }

  await officeStore.fetchOffices()
  await officeStore.fetchUsersUnderOrg()
})
</script>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.28s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}
</style>
