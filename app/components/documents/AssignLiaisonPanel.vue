<template>
  <section
    v-if="isEligibleForAssignment"
    class="stagger-block rounded-2xl border p-5"
    :class="cellClass"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">Assign Messenger</p>
        <p class="mt-1 text-sm" :class="mutedClass">
          Choose who will carry this document to its next stop. They're notified right away —
          no accept step.
        </p>
      </div>
    </div>

    <div v-if="loadingCandidates" class="mt-4 text-sm" :class="mutedClass">Loading available messengers…</div>

    <p v-else-if="loadError" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
      {{ loadError }}
    </p>

    <template v-else>
      <div v-if="!candidates.length" class="mt-4 rounded-lg border border-dashed px-4 py-4 text-xs" :class="isDark ? 'border-onyx-border text-white-muted' : 'border-gray-200 text-gray-400'">
        No available messengers found for this office yet. A user becomes available once they belong to your
        LGU with an employee or messenger account and aren't already tied to a different office.
      </div>

      <div v-else class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          v-model="selectedLiaisonId"
          class="w-full flex-1 rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-candy-orange"
          :class="isDark ? 'border-onyx-border bg-onyx-black text-white-pure' : 'border-gray-200 bg-white-pure text-onyx-black'"
        >
          <option value="" disabled>Select a messenger</option>
          <option v-for="c in candidates" :key="c.user_id" :value="c.user_id">
            {{ c.full_name || c.email || c.user_id }} ({{ roleLabel(c.role) }}{{ c.already_associated ? '' : ' — new' }})
          </option>
        </select>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-candy-orange px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-candy-hover disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!selectedLiaisonId || assigning"
          @click="handleAssign"
        >
          <Icon v-if="assigning" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
          <Icon v-else name="ph:user-plus-fill" class="h-4 w-4" />
          {{ assigning ? 'Assigning…' : 'Assign Messenger' }}
        </button>
      </div>
    </template>

    <p v-if="assignError" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
      {{ assignError }}
    </p>
    <p v-if="assignSuccessMessage" class="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
      {{ assignSuccessMessage }}
    </p>
  </section>

  <DocumentQrStickerModal
    :is-open="showQrSticker"
    :title="props.document?.title ?? 'Document'"
    :qr-payload="qrPayload"
    @close="showQrSticker = false"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DocumentQrStickerModal from './DocumentQrStickerModal.vue'
import { buildDocumentTrackQrPayload } from '~/utils/parseFlowVisionQr'

interface AssignableDocument {
  id: string
  title?: string
  tracking_status?: string
  current_step?: number | null
  checkpoint_cleared_step?: number | null
}

interface LiaisonCandidate {
  user_id: string
  full_name: string | null
  email: string | null
  role: string
  already_associated: boolean
}

const props = defineProps<{
  document: AssignableDocument | null
}>()

const emit = defineEmits<{
  (e: 'assigned', payload: { document_id: string; liaison_user_id: string; liaison_name: string | null }): void
}>()

const { isDark } = useTheme()
const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))
const cellClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure'))

// Same eligibility rule enforced server-side in assign-liaison.post.ts: CREATED, or
// ARRIVED_AT_OFFICE with the checkpoint already cleared for the current step.
const isEligibleForAssignment = computed(() => {
  const doc = props.document
  if (!doc) return false
  if (doc.tracking_status === 'CREATED') return true
  if (doc.tracking_status === 'ARRIVED_AT_OFFICE') {
    return (doc.checkpoint_cleared_step ?? null) === (doc.current_step ?? 0)
  }
  return false
})

const candidates = ref<LiaisonCandidate[]>([])
const loadingCandidates = ref(false)
const loadError = ref('')
const selectedLiaisonId = ref('')
const assigning = ref(false)
const assignError = ref('')
const assignSuccessMessage = ref('')
const showQrSticker = ref(false)
const qrPayload = computed(() => props.document?.id ? buildDocumentTrackQrPayload(props.document.id) : '')

function roleLabel(role: string) {
  if (role === 'employee') return 'Employee'
  if (role === 'employee_sub_user') return 'Staff'
  if (role === 'messenger') return 'Messenger'
  if (role === 'client') return 'Client Admin'
  return role
}

async function loadCandidates() {
  if (!props.document?.id) return
  loadingCandidates.value = true
  loadError.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: { candidates: LiaisonCandidate[] } }>(
      '/api/tracking/eligible-liaisons',
      { query: { document_id: props.document.id } },
    )
    candidates.value = res.data.candidates
  } catch (err: any) {
    loadError.value = err?.data?.message || 'Could not load available messengers.'
    candidates.value = []
  } finally {
    loadingCandidates.value = false
  }
}

async function handleAssign() {
  if (!props.document?.id || !selectedLiaisonId.value || assigning.value) return
  assigning.value = true
  assignError.value = ''
  assignSuccessMessage.value = ''
  try {
    const res = await $fetch<{ success: boolean; message: string; data: { liaison: { user_id: string; full_name: string | null } } }>(
      '/api/tracking/assign-liaison',
      {
        method: 'POST',
        body: { document_id: props.document.id, liaison_user_id: selectedLiaisonId.value },
      },
    )
    assignSuccessMessage.value = res.message
    emit('assigned', {
      document_id: props.document.id,
      liaison_user_id: res.data.liaison.user_id,
      liaison_name: res.data.liaison.full_name,
    })
    selectedLiaisonId.value = ''
    showQrSticker.value = true
  } catch (err: any) {
    assignError.value = err?.data?.message || 'Failed to assign messenger.'
  } finally {
    assigning.value = false
  }
}

watch(
  () => [props.document?.id, isEligibleForAssignment.value],
  ([id, eligible]) => {
    assignError.value = ''
    assignSuccessMessage.value = ''
    selectedLiaisonId.value = ''
    if (id && eligible) loadCandidates()
  },
  { immediate: true },
)
</script>
