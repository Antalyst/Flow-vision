<template>
  <div class="space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ──────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="mb-3 h-1 w-14 rounded-full bg-rich-orange" />
        <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          My Sub-Branch Offices
        </h1>
        <p class="mt-1 text-sm" :class="mutedText">
          Registered under
          <span class="font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-700'">
            {{ auth.currentOrg?.name || `Org ${auth.user?.org_id}` }}
          </span>
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition-all duration-200 hover:scale-[1.02] hover:bg-[#e95a0b] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-rich-orange/50"
        @click="openCreate"
      >
        <Icon name="ph:plus-bold" class="h-4 w-4" />
        Register New Office
      </button>
    </div>

    <!-- ── Scope + Stats Bar ─────────────────────────────────────────── -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div
        class="col-span-1 sm:col-span-2 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
        :class="glassSurface"
      >
        <div class="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-rich-orange/10">
          <Icon name="ph:shield-check-fill" class="h-4 w-4 text-rich-orange" />
        </div>
        <div class="min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-widest text-rich-orange">Isolated Scope</p>
          <p class="mt-0.5 truncate text-xs" :class="mutedText">
            org_id
            <span class="font-mono font-bold" :class="isDark ? 'text-gray-200' : 'text-gray-700'">
              {{ auth.user?.org_id }}
            </span>
            · user
            <span class="font-mono font-bold" :class="isDark ? 'text-gray-200' : 'text-gray-700'">
              {{ auth.user?.user_id }}
            </span>
          </p>
        </div>
      </div>

      <div
        class="flex items-center gap-3 rounded-xl border px-4 py-3"
        :class="glassSurface"
      >
        <div class="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-rich-orange/10">
          <Icon name="ph:buildings-fill" class="h-4 w-4 text-rich-orange" />
        </div>
        <div>
          <p class="text-[11px] font-bold uppercase tracking-widest text-rich-orange">Offices</p>
          <p class="mt-0.5 text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ offices.length }}
          </p>
        </div>
      </div>
    </div>

    <!-- ── Loading Skeleton ──────────────────────────────────────────── -->
    <div v-if="loading" class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="n in 3"
        :key="n"
        class="h-[420px] animate-pulse rounded-2xl border"
        :class="isDark ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200'"
      />
    </div>

    <!-- ── Office QR Card Grid ────────────────────────────────────────── -->
    <div v-else-if="offices.length" class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <OfficeQrCard
        v-for="office in offices"
        :key="office.id"
        :office="office"
        @edit="openEdit"
        @delete="handleDelete"
      />
    </div>

    <!-- ── Empty State ───────────────────────────────────────────────── -->
    <div
      v-else
      class="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center"
      :class="isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'"
    >
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rich-orange/10">
        <Icon name="ph:buildings-fill" class="h-8 w-8 text-rich-orange/60" />
      </div>
      <p class="font-bold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">No offices registered yet</p>
      <p class="mt-1 text-sm" :class="mutedText">
        Register your first sub-branch to start routing documents.
      </p>
      <button
        type="button"
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-rich-orange px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b]"
        @click="openCreate"
      >
        <Icon name="ph:plus-bold" class="h-4 w-4" />
        Register Office
      </button>
    </div>

    <!-- ── Create / Edit Drawer ──────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="drawerOpen"
          class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          @click="closeDrawer"
        />
      </Transition>

      <Transition name="drawer-slide">
        <aside
          v-if="drawerOpen"
          class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-lg flex-col border-l shadow-2xl"
          :class="isDark ? 'bg-[#111111] border-white/10' : 'bg-white border-gray-200'"
        >
          <!-- Drawer header -->
          <header
            class="flex items-start justify-between gap-4 border-b px-6 py-5"
            :class="isDark ? 'border-white/10' : 'border-gray-200'"
          >
            <div>
              <div class="mb-1 h-0.5 w-8 rounded-full bg-rich-orange" />
              <p class="text-[10px] font-bold uppercase tracking-widest text-rich-orange">
                {{ drawerMode === 'create' ? 'Register' : 'Update' }}
              </p>
              <h2 class="mt-1 text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ drawerMode === 'create' ? 'New Sub-Branch Office' : 'Edit Office' }}
              </h2>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl transition"
              :class="isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100'"
              @click="closeDrawer"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </header>

          <!-- Drawer body -->
          <div class="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Office Name <span class="text-red-500">*</span>
              </span>
              <input
                v-model.trim="form.name"
                type="text"
                placeholder="e.g. Accounting Dept, HR Sub-Branch"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"
                :class="inputClass"
                required
              />
            </label>

            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Office Code
                <span class="ml-1 text-[11px] font-normal" :class="mutedText">(auto-generated if blank)</span>
              </span>
              <input
                v-model.trim="form.code"
                type="text"
                placeholder="e.g. ACC-001"
                class="mt-2 w-full rounded-xl border px-4 py-3 font-mono text-sm uppercase outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"
                :class="inputClass"
                maxlength="20"
              />
            </label>

            <!-- Isolation notice -->
            <div
              class="rounded-xl border p-4"
              :class="isDark ? 'border-rich-orange/20 bg-rich-orange/5' : 'border-orange-200 bg-orange-50'"
            >
              <div class="flex items-center gap-2 text-sm font-semibold text-rich-orange">
                <Icon name="ph:shield-check-fill" class="h-4 w-4" />
                Data Isolation Active
              </div>
              <p class="mt-2 text-xs leading-relaxed" :class="mutedText">
                Registered under <strong>org_id {{ auth.user?.org_id }}</strong> and assigned exclusively to
                your account <strong>(user {{ auth.user?.user_id }})</strong>. No cross-tenant data is accessible.
              </p>
            </div>

            <!-- QR preview (create mode only) -->
            <div
              v-if="drawerMode === 'create' && form.name"
              class="flex flex-col items-center gap-3 rounded-xl border p-5"
              :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'"
            >
              <p class="text-xs font-semibold uppercase tracking-wider" :class="mutedText">
                QR Preview (generated after save)
              </p>
              <div class="flex h-28 w-28 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
                <Icon name="ph:qr-code" class="h-14 w-14 text-gray-300" />
              </div>
              <p class="text-center font-mono text-[10px] text-gray-400">flowvision://office/[NEW_ID]</p>
            </div>
          </div>

          <!-- Drawer footer -->
          <footer
            class="flex items-center justify-end gap-3 border-t px-6 py-4"
            :class="isDark ? 'border-white/10' : 'border-gray-200'"
          >
            <button
              type="button"
              class="rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
              :class="isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
              @click="closeDrawer"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="!form.name || saving"
              class="inline-flex items-center gap-2 rounded-xl bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition-all hover:bg-[#e95a0b] disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleSave"
            >
              <Icon v-if="saving" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Saving…' : drawerMode === 'create' ? 'Register Office' : 'Save Changes' }}
            </button>
          </footer>
        </aside>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import OfficeQrCard from '~/components/employee/OfficeQrCard.vue'

definePageMeta({ layout: 'employee' })

const auth = useAuthStore()
const { isDark } = useTheme()

interface OfficeRecord {
  id: string | number
  name: string
  code?: string
  org_id: string | number
  assigned_user: string | number
  stage_id: number | null
  created_at: string
  doc_count?: number
}

const offices  = ref<OfficeRecord[]>([])
const loading  = ref(false)
const saving   = ref(false)

const drawerOpen = ref(false)
const drawerMode = ref<'create' | 'edit'>('create')
const editingId  = ref<string | number | null>(null)
const form = reactive({ name: '', code: '' })

// ── Theming ────────────────────────────────────────────────────────────
const glassSurface = computed(() =>
  isDark.value
    ? 'border-white/10 bg-white/[0.04]'
    : 'border-gray-200 bg-white'
)
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass = computed(() =>
  isDark.value
    ? 'border-white/10 bg-[#111111] text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

// ── Data fetching ──────────────────────────────────────────────────────
const fetchOffices = async () => {
  const orgId  = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return

  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: OfficeRecord[] }>(
      '/api/employee/my-offices',
      { params: { orgId, userId } },
    )
    offices.value = res.data ?? []
  } catch (err) {
    console.error('[EmployeeOffices] fetch error:', err)
  } finally {
    loading.value = false
  }
}

// ── Drawer ─────────────────────────────────────────────────────────────
const openCreate = () => {
  drawerMode.value = 'create'
  editingId.value  = null
  form.name = ''
  form.code = ''
  drawerOpen.value = true
}

const openEdit = (office: OfficeRecord) => {
  drawerMode.value = 'edit'
  editingId.value  = office.id
  form.name = office.name
  form.code = office.code ?? ''
  drawerOpen.value = true
}

const closeDrawer = () => { drawerOpen.value = false }

// ── CRUD ───────────────────────────────────────────────────────────────
const handleSave = async () => {
  if (!form.name || saving.value) return
  saving.value = true
  try {
    if (drawerMode.value === 'create') {
      await $fetch('/api/office', {
        method: 'POST',
        body: {
          name:    form.name,
          code:    form.code || undefined,
          user_id: auth.user?.user_id,
          org_id:  auth.user?.org_id,
        },
      })
    } else if (editingId.value != null) {
      await $fetch('/api/office', {
        method: 'PUT',
        body: {
          id:   editingId.value,
          name: form.name,
          code: form.code || undefined,
        },
      })
    }
    closeDrawer()
    await fetchOffices()
  } catch (err) {
    console.error('[EmployeeOffices] save error:', err)
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: string | number) => {
  if (!confirm('Delete this office? This cannot be undone.')) return
  try {
    await $fetch('/api/office', { method: 'DELETE', params: { id } })
    offices.value = offices.value.filter((o) => String(o.id) !== String(id))
  } catch (err) {
    console.error('[EmployeeOffices] delete error:', err)
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await fetchOffices()
})
</script>

<style scoped>
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.2s ease; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }

.drawer-slide-enter-active, .drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }
</style>
