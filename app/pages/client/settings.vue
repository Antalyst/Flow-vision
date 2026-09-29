<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <header>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:gear-six-fill" class="h-4 w-4 text-candy-orange" />
        <span>Support</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="headingClass">Settings</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">Settings</h1>
      <p class="mt-1 text-sm" :class="mutedClass">Appearance, notifications, and account management.</p>
    </header>

    <div v-if="!settingsReady" class="rounded-2xl border p-8 text-center text-sm" :class="[panelClass, mutedClass]">
      Loading preferences…
    </div>

    <template v-else>
      <section class="rounded-2xl border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Appearance</h2>
        <p class="mt-1 text-xs" :class="mutedClass">Switch how FlowVision looks on your screen.</p>
        <div class="mt-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-4" :class="innerPanelClass">
          <div>
            <p class="text-sm font-semibold" :class="headingClass">{{ isDark ? 'Dark Mode' : 'Light Mode' }}</p>
            <p class="text-xs" :class="mutedClass">{{ isDark ? 'Easier on the eyes in low light.' : 'Bright and clear for daytime use.' }}</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="isDark"
            class="relative h-8 w-14 rounded-full transition"
            :class="isDark ? 'bg-candy-orange' : 'bg-gray-300'"
            @click="toggleTheme"
          >
            <span class="absolute top-1 h-6 w-6 rounded-full bg-white-pure transition" :class="isDark ? 'left-7' : 'left-1'" />
          </button>
        </div>
      </section>

      <section class="rounded-2xl border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Notification Preferences</h2>
        <div class="mt-4 space-y-3">
          <SettingToggleRow
            label="Document Status Alerts"
            description="Receive in-app alerts when your documents change tracking state."
            :checked="documentStatusAlerts"
            :disabled="savingDoc"
            @update:checked="onDocAlerts"
          />
          <SettingToggleRow
            label="Operational Report Broadcasts"
            description="Alert when employees or messengers submit new operational summaries."
            :checked="operationalReportAlerts"
            :disabled="savingReport"
            @update:checked="onReportAlerts"
          />
          <SettingToggleRow
            label="Sound Alerts"
            description="Play a short tone when new client notifications arrive."
            :checked="soundAlerts"
            :disabled="savingSound"
            @update:checked="onSoundAlerts"
          />
        </div>
      </section>

      <section class="rounded-2xl border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Organization</h2>
        <p class="mt-1 text-xs" :class="mutedClass">Your organization's info.</p>

        <div class="mt-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-4" :class="innerPanelClass">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold truncate" :class="headingClass">{{ auth.currentOrg?.name || 'Loading...' }}</p>
            <p class="text-xs font-mono truncate mt-0.5" :class="mutedClass">Code: {{ auth.currentOrg?.code }}</p>
          </div>
          <button
            type="button"
            class="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition hover:bg-candy-orange/10 hover:text-candy-orange hover:border-candy-orange/50 active:scale-[0.98]"
            :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-600'"
            @click="copyOrgCode"
          >
            <Icon :name="copiedOrg ? 'ph:check-bold' : 'ph:copy'" class="h-3.5 w-3.5" :class="copiedOrg ? 'text-success' : ''" />
            {{ copiedOrg ? 'Copied!' : 'Copy Code' }}
          </button>
        </div>
      </section>

      <section class="rounded-2xl border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Employee Verification</h2>
        <p class="mt-1 text-xs" :class="mutedClass">Require employees to have an approved ID before they can register.</p>

        <div class="mt-4 space-y-3">
          <SettingToggleRow
            label="Enable Employee ID Check"
            description="If enabled, employees must enter an ID that matches your approved list to register."
            :checked="enableEmployeeValidation"
            :disabled="savingValidationStatus"
            @update:checked="onValidationToggle"
          />
        </div>

        <div v-if="enableEmployeeValidation" class="mt-4 pt-4 border-t" :class="isDark ? 'border-white/5' : 'border-gray-100'">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold" :class="headingClass">Approved Employee List (CSV)</h3>
            <button
              v-if="whitelist.length > 0"
              @click="clearWhitelist"
              class="text-xs font-semibold text-danger hover:opacity-80 transition"
              :disabled="loadingWhitelist"
            >
              Clear List
            </button>
          </div>

          <div class="flex gap-2 items-center mb-4">
            <input type="file" accept=".csv" @change="onFileChange" class="text-xs" :class="mutedClass" ref="csvFileInput" />
            <button
              @click="uploadCsv"
              class="rounded-xl border bg-candy-orange px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-candy-hover active:scale-[0.98] disabled:opacity-50"
              :disabled="!selectedFile || uploadingCsv"
            >
              {{ uploadingCsv ? 'Uploading...' : 'Upload CSV' }}
            </button>
          </div>

          <div class="rounded-xl border" :class="innerPanelClass">
            <div v-if="loadingWhitelist" class="p-4 text-center text-xs" :class="mutedClass">Loading whitelist...</div>
            <div v-else-if="whitelist.length === 0" class="p-4 text-center text-xs" :class="mutedClass">No employees whitelisted.</div>
            <div v-else class="max-h-64 overflow-y-auto">
              <table class="w-full text-left text-xs">
                <thead class="sticky top-0 border-b z-10" :class="[innerPanelClass, isDark ? 'border-white/5' : 'border-gray-200']">
                  <tr>
                    <th class="px-4 py-2 font-semibold" :class="headingClass">Employee ID</th>
                    <th class="px-4 py-2 font-semibold" :class="headingClass">Name</th>
                    <th class="px-4 py-2 font-semibold" :class="headingClass">Email</th>
                  </tr>
                </thead>
                <tbody class="divide-y" :class="isDark ? 'divide-white/5' : 'divide-gray-100'">
                  <tr v-for="emp in whitelist" :key="emp.id" class="transition-colors hover:bg-gray-500/5">
                    <td class="px-4 py-2 font-medium" :class="headingClass">{{ emp.employee_id_number }}</td>
                    <td class="px-4 py-2" :class="mutedClass">{{ emp.full_name || '-' }}</td>
                    <td class="px-4 py-2" :class="mutedClass">{{ emp.email || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Document Categories</h2>
        <p class="mt-1 text-xs" :class="mutedClass">Manage the categories available when uploading documents.</p>

        <div class="mt-4 flex flex-col gap-4">
          <form @submit.prevent="handleAddCategory" class="flex items-center gap-2">
            <input
              v-model="newCategoryName"
              type="text"
              placeholder="e.g. Invoice, Contract"
              class="flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
              :class="isDark ? 'border-white/10 bg-onyx-black text-white focus:bg-onyx-black' : 'border-gray-200 bg-white focus:bg-white'"
              :disabled="categoriesStore.loading"
            />
            <button
              type="submit"
              class="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl border bg-candy-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-candy-hover active:scale-[0.98] disabled:opacity-50"
              :disabled="categoriesStore.loading || !newCategoryName.trim()"
            >
              <Icon v-if="categoriesStore.loading" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
              <Icon v-else name="ph:plus-bold" class="h-4 w-4" />
              Add
            </button>
          </form>

          <div class="flex flex-col rounded-xl border" :class="innerPanelClass">
            <div v-if="categoriesStore.categories.length === 0" class="px-4 py-4 text-center text-xs" :class="mutedClass">
              No categories created yet.
            </div>
            <div
              v-for="category in categoriesStore.categories"
              :key="category.id"
              class="flex items-center justify-between border-b px-4 py-3 last:border-0"
              :class="isDark ? 'border-white/5' : 'border-gray-100'"
            >
              <span class="text-sm font-medium" :class="headingClass">{{ category.name }}</span>
              <button
                type="button"
                class="text-gray-400 transition hover:text-danger"
                :disabled="categoriesStore.loading"
                @click="handleDeleteCategory(category.id)"
              >
                <Icon name="ph:trash" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">AI Knowledge Base</h2>
        <p class="mt-1 text-xs" :class="mutedClass">Upload PDF, Word (.docx), or Excel (.xlsx) files that describe how your organization works. The AI assistant reads these to answer employees' and clients' questions about your org.</p>

        <div class="mt-4 flex gap-2 items-center mb-4">
          <input
            type="file"
            accept=".pdf,.docx,.xlsx"
            @change="onKnowledgeFileChange"
            class="text-xs"
            :class="mutedClass"
            ref="knowledgeFileInput"
          />
          <button
            @click="uploadKnowledgeFile"
            class="flex-shrink-0 rounded-xl border bg-candy-orange px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-candy-hover active:scale-[0.98] disabled:opacity-50"
            :disabled="!selectedKnowledgeFile || uploadingKnowledge"
          >
            {{ uploadingKnowledge ? 'Uploading...' : 'Upload' }}
          </button>
        </div>

        <div class="rounded-xl border" :class="innerPanelClass">
          <div v-if="loadingKnowledge" class="p-4 text-center text-xs" :class="mutedClass">Loading files...</div>
          <div v-else-if="knowledgeFiles.length === 0" class="p-4 text-center text-xs" :class="mutedClass">No knowledge base files uploaded yet.</div>
          <div v-else class="divide-y" :class="isDark ? 'divide-white/5' : 'divide-gray-100'">
            <div v-for="f in knowledgeFiles" :key="f.id" class="flex items-center justify-between gap-3 px-4 py-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium" :class="headingClass">{{ f.file_name }}</p>
                <p class="mt-0.5 text-xs" :class="mutedClass">
                  {{ formatFileSize(f.file_size) }} · {{ formatDate(f.created_at) }}
                  <span v-if="f.extraction_status !== 'ready'" class="text-danger"> · Text could not be read from this file</span>
                </p>
              </div>
              <button
                type="button"
                class="flex-shrink-0 text-gray-400 transition hover:text-danger disabled:opacity-50"
                :disabled="deletingKnowledgeId === f.id"
                @click="deleteKnowledgeFile(f.id)"
              >
                <Icon name="ph:spinner-gap" v-if="deletingKnowledgeId === f.id" class="h-4 w-4 animate-spin" />
                <Icon name="ph:trash" v-else class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border p-6" :class="panelClass">
        <h2 class="text-sm font-bold" :class="headingClass">Account</h2>
        <p class="mt-1 text-xs" :class="mutedClass">
          Signed in as <span class="font-medium" :class="headingClass">{{ auth.user?.email }}</span>
        </p>
        <button
          type="button"
          class="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/5"
          :class="innerPanelClass"
          :disabled="isLoggingOut"
          @click="handleLogout"
        >
          <Icon v-if="isLoggingOut" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
          <Icon v-else name="ph:sign-out" class="h-4 w-4" />
          Log out
        </button>
      </section>
    </template>

    <Teleport to="body">
      <Transition name="toast-fade">
        <div v-if="toast.visible" class="fixed bottom-24 left-1/2 z-[100] max-w-sm -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-semibold md:bottom-8" :class="toastClass">
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Settings',
  description: 'Manage your appearance, notifications, organization details, and account.'
})
import SettingToggleRow from '~/components/messenger/SettingToggleRow.vue'
import { useClientSettings } from '~/composables/useClientSettings'
import { useClientToast } from '~/composables/useClientToast'
import { useAuthStore } from '~/stores/auth'
import { useCategoriesStore } from '~/stores/categories'

const auth = useAuthStore()
const categoriesStore = useCategoriesStore()
const newCategoryName = ref('')

async function handleAddCategory() {
  if (!newCategoryName.value.trim()) return
  try {
    await categoriesStore.addCategory(newCategoryName.value)
    newCategoryName.value = ''
    showToast('Category added successfully.')
  } catch (err: any) {
    showToast(err.message || 'Failed to add category.', 'error')
  }
}

async function handleDeleteCategory(id: string) {
  try {
    await categoriesStore.deleteCategory(id)
    showToast('Category deleted.')
  } catch (err: any) {
    showToast(err.message || 'Failed to delete category.', 'error')
  }
}

definePageMeta({ layout: 'client' })

const { isDark, toggleTheme } = useTheme()
const {
  ready: settingsReady,
  documentStatusAlerts,
  operationalReportAlerts,
  soundAlerts,
  setDocumentStatusAlerts,
  setOperationalReportAlerts,
  setSoundAlerts,
  hydrate,
} = useClientSettings()
const { toast, show: showToast } = useClientToast()

const savingDoc = ref(false)
const savingReport = ref(false)
const savingSound = ref(false)
const isLoggingOut = ref(false)
const copiedOrg = ref(false)

const enableEmployeeValidation = ref(false)
const savingValidationStatus = ref(false)
const whitelist = ref<any[]>([])
const loadingWhitelist = ref(false)
const uploadingCsv = ref(false)
const selectedFile = ref<File | null>(null)
const csvFileInput = ref<HTMLInputElement | null>(null)

const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white'))
const innerPanelClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-zinc-200 bg-white-surface'))
const toastClass = computed(() => toast.type === 'error'
  ? 'border-danger/40 text-danger bg-onyx-card'
  : 'border-success/40 text-success bg-onyx-card')

async function onDocAlerts(v: boolean) {
  savingDoc.value = true
  try {
    await setDocumentStatusAlerts(v)
    showToast(v ? 'Document alerts enabled.' : 'Document alerts muted.')
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Failed to save preference.', 'error')
  } finally { savingDoc.value = false }
}

async function onReportAlerts(v: boolean) {
  savingReport.value = true
  try {
    await setOperationalReportAlerts(v)
    showToast(v ? 'Report broadcasts enabled.' : 'Report broadcasts muted.')
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Failed to save preference.', 'error')
  } finally { savingReport.value = false }
}

async function onSoundAlerts(v: boolean) {
  savingSound.value = true
  try {
    await setSoundAlerts(v)
    showToast(v ? 'Sound alerts enabled.' : 'Sound alerts muted.')
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Failed to save preference.', 'error')
  } finally { savingSound.value = false }
}

async function handleLogout() {
  isLoggingOut.value = true
  try { await auth.logout() } finally { isLoggingOut.value = false }
}

async function onValidationToggle(v: boolean) {
  savingValidationStatus.value = true
  try {
    await $fetch('/api/org/settings', {
      method: 'PUT',
      body: {
        org_id: auth.currentOrg?.org_id || auth.user?.org_id,
        enable_employee_validation: v
      }
    })
    enableEmployeeValidation.value = v
    if (auth.currentOrg) {
      auth.currentOrg.enable_employee_validation = v
    }
    showToast(v ? 'Employee validation enabled.' : 'Employee validation disabled.')
    if (v) fetchWhitelist()
  } catch (err: any) {
    showToast(err.message || 'Failed to update validation settings.', 'error')
  } finally {
    savingValidationStatus.value = false
  }
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
  } else {
    selectedFile.value = null
  }
}

async function uploadCsv() {
  const orgId = auth.currentOrg?.org_id || auth.user?.org_id
  if (!selectedFile.value || !orgId) return
  uploadingCsv.value = true
  const formData = new FormData()
  formData.append('org_id', String(orgId))
  formData.append('file', selectedFile.value)

  try {
    await $fetch('/api/org/employee-whitelist/upload', {
      method: 'POST',
      body: formData
    })
    showToast('CSV uploaded successfully.')
    selectedFile.value = null
    if (csvFileInput.value) csvFileInput.value.value = ''
    fetchWhitelist()
  } catch (err: any) {
    showToast(err.data?.statusMessage || err.message || 'Failed to upload CSV.', 'error')
  } finally {
    uploadingCsv.value = false
  }
}

async function fetchWhitelist() {
  const orgId = auth.currentOrg?.org_id || auth.user?.org_id
  if (!orgId) return
  loadingWhitelist.value = true
  try {
    const data = await $fetch(`/api/org/employee-whitelist?org_id=${orgId}`)
    whitelist.value = data as any[]
  } catch (err) {
    // ignore
  } finally {
    loadingWhitelist.value = false
  }
}

async function clearWhitelist() {
  const orgId = auth.currentOrg?.org_id || auth.user?.org_id
  if (!orgId) return
  loadingWhitelist.value = true
  try {
    await $fetch(`/api/org/employee-whitelist/clear?org_id=${orgId}`, { method: 'DELETE' })
    whitelist.value = []
    showToast('Whitelist cleared.')
  } catch (err: any) {
    showToast(err.message || 'Failed to clear whitelist.', 'error')
  } finally {
    loadingWhitelist.value = false
  }
}

const knowledgeFiles = ref<any[]>([])
const loadingKnowledge = ref(false)
const uploadingKnowledge = ref(false)
const selectedKnowledgeFile = ref<File | null>(null)
const knowledgeFileInput = ref<HTMLInputElement | null>(null)
const deletingKnowledgeId = ref<number | null>(null)

function onKnowledgeFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  selectedKnowledgeFile.value = target.files?.[0] ?? null
}

async function fetchKnowledgeFiles() {
  loadingKnowledge.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any[] }>('/api/org/knowledge')
    knowledgeFiles.value = res.data ?? []
  } catch (err) {
    // ignore — matches whitelist fetch convention (non-fatal on load)
  } finally {
    loadingKnowledge.value = false
  }
}

const MAX_KNOWLEDGE_FILE_MB = 150

async function uploadKnowledgeFile() {
  if (!selectedKnowledgeFile.value) return
  if (selectedKnowledgeFile.value.size > MAX_KNOWLEDGE_FILE_MB * 1024 * 1024) {
    showToast(`File is too large. The limit is ${MAX_KNOWLEDGE_FILE_MB}MB.`, 'error')
    return
  }
  uploadingKnowledge.value = true
  const formData = new FormData()
  formData.append('file', selectedKnowledgeFile.value)

  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/org/knowledge/upload', {
      method: 'POST',
      body: formData,
    })
    showToast(res.message || 'File uploaded.')
    selectedKnowledgeFile.value = null
    if (knowledgeFileInput.value) knowledgeFileInput.value.value = ''
    await fetchKnowledgeFiles()
  } catch (err: any) {
    showToast(err.data?.statusMessage || err.message || 'Failed to upload file.', 'error')
  } finally {
    uploadingKnowledge.value = false
  }
}

async function deleteKnowledgeFile(id: number) {
  deletingKnowledgeId.value = id
  try {
    await $fetch(`/api/org/knowledge/${id}`, { method: 'DELETE' })
    knowledgeFiles.value = knowledgeFiles.value.filter((f) => f.id !== id)
    showToast('File removed.')
  } catch (err: any) {
    showToast(err.data?.statusMessage || err.message || 'Failed to delete file.', 'error')
  } finally {
    deletingKnowledgeId.value = null
  }
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return value
  }
}

async function copyOrgCode() {
  if (!auth.currentOrg?.code) return
  try {
    await navigator.clipboard.writeText(auth.currentOrg.code)
    copiedOrg.value = true
    showToast('Organization code copied to clipboard!')
    setTimeout(() => { copiedOrg.value = false }, 2000)
  } catch (err) {
    showToast('Failed to copy code', 'error')
  }
}

onMounted(async () => {
  hydrate()
  if (!auth.currentOrg) {
    await auth.fetchMyOrg()
  }
  
  if (auth.currentOrg?.enable_employee_validation) {
    enableEmployeeValidation.value = true
    fetchWhitelist()
  }
  
  await categoriesStore.fetchCategories()
  await fetchKnowledgeFiles()
})
</script>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.2s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; }
</style>
