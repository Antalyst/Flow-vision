<template>
  <div
    class="mt-4 overflow-hidden rounded-2xl border border-candy-orange/30 shadow-lg shadow-candy-orange/5"
    :class="isDark ? 'bg-onyx-black' : 'bg-zinc-50'"
  >
    <div
      class="flex items-start justify-between gap-3 border-b px-4 py-3"
      :class="isDark ? 'border-white/10 bg-zinc-950' : 'border-gray-200 bg-white'"
    >
      <div class="min-w-0">
        <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">
          Pipeline Desk Message
        </p>
        <p class="mt-1 text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
          Direct message to {{ office.name }}
        </p>
        <p class="mt-0.5 text-[11px]" :class="mutedText">
          Regarding document
          <span class="font-mono text-candy-orange">#{{ shortDocId }}</span>
          · Step {{ office.step_number }} checkpoint
        </p>
      </div>
      <button
        type="button"
        class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg transition"
        :class="isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'"
        aria-label="Close pipeline chat"
        @click="emit('close')"
      >
        <Icon name="ph:x-bold" class="h-4 w-4" />
      </button>
    </div>

    <div v-if="activeIssue" ref="messagesEl" class="max-h-52 space-y-3 overflow-y-auto px-4 py-3">
      <div v-if="loadingMessages" class="flex items-center justify-center py-6" :class="mutedText">
        <Icon name="ph:spinner-gap" class="mr-2 h-4 w-4 animate-spin text-candy-orange" />
        Loading…
      </div>
      <template v-else-if="messages.length">
        <article
          v-for="msg in messages"
          :key="msg.id"
          class="flex"
          :class="isOwnMessage(msg) ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm"
            :class="isOwnMessage(msg)
              ? 'bg-candy-orange text-white'
              : isDark ? 'bg-zinc-950 text-gray-100 border border-white/10' : 'bg-zinc-950 text-gray-100'"
          >
            <p class="text-[10px] font-bold" :class="isOwnMessage(msg) ? 'text-white/80' : 'text-candy-orange'">
              {{ msg.sender_name || 'Unknown' }}
            </p>
            <p class="mt-1 leading-relaxed">{{ msg.message_text }}</p>
          </div>
        </article>
      </template>
      <p v-else class="py-4 text-center text-xs" :class="mutedText">
        No messages yet — send the first note to this desk.
      </p>
    </div>

    <form
      class="border-t px-4 py-3"
      :class="isDark ? 'border-white/10 bg-zinc-950' : 'border-gray-200 bg-white'"
      @submit.prevent="handleSend"
    >
      <p v-if="!reportingOfficeId && offices.length > 1" class="mb-2">
        <select
          v-model="reportingOfficeId"
          class="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-candy-orange"
          :class="inputClass"
          required
        >
          <option value="">Your reporting office…</option>
          <option v-for="o in offices" :key="o.id" :value="String(o.id)">{{ o.name }}</option>
        </select>
      </p>

      <div class="flex items-end gap-2">
        <textarea
          v-model="draft"
          rows="2"
          :placeholder="`Message ${office.name} about this document…`"
          class="min-h-[44px] flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-candy-orange"
          :class="inputClass"
        />
        <button
          type="submit"
          class="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-candy-orange text-white transition hover:bg-candy-hover disabled:opacity-50"
          :disabled="sending || !draft.trim() || !reportingOfficeId"
        >
          <Icon v-if="sending" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
          <Icon v-else name="ph:paper-plane-right-fill" class="h-4 w-4" />
        </button>
      </div>
      <p v-if="error" class="mt-2 text-xs text-red-500">{{ error }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

interface PipelineOffice {
  office_id: string | number
  office_name: string
  step_number: number
}

interface OfficeRecord { id: string; name: string }

interface IssueRow {
  id: string
  target_office_id?: string | null
  status: 'OPEN' | 'RESOLVED'
}

interface ChatMessage {
  id: string
  sender_id: string
  sender_name: string | null
  message_text: string
}

const props = defineProps<{
  document: { id: string; title?: string; tracking_status?: string }
  office: PipelineOffice
  offices: OfficeRecord[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', payload: { tracking_status: string }): void
}>()

const auth = useAuthStore()
const { isDark } = useTheme()

const activeIssue = ref<IssueRow | null>(null)
const messages = ref<ChatMessage[]>([])
const draft = ref('')
const reportingOfficeId = ref('')
const loadingMessages = ref(false)
const sending = ref(false)
const error = ref('')
const messagesEl = ref<HTMLElement | null>(null)

const shortDocId = computed(() => String(props.document.id).slice(0, 8))
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass = computed(() =>
  isDark.value
    ? 'border-white/10 bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400',
)

const targetOfficeId = computed(() => String(props.office.office_id))

const scrollToBottom = async () => {
  await nextTick()
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

const fetchIssue = async () => {
  const res = await $fetch<{ openIssue: IssueRow | null }>('/api/documents/issues/list', {
    params: { document_id: props.document.id },
  })
  activeIssue.value = res.openIssue
  if (res.openIssue?.id) await fetchMessages(res.openIssue.id)
}

const fetchMessages = async (issueId: string) => {
  loadingMessages.value = true
  try {
    const res = await $fetch<{ data: ChatMessage[] }>('/api/documents/issues/messages', {
      params: { issue_id: issueId, limit: 100 },
    })
    messages.value = res.data ?? []
    await scrollToBottom()
  } finally {
    loadingMessages.value = false
  }
}

const handleSend = async () => {
  const text = draft.value.trim()
  if (!text || !reportingOfficeId.value || sending.value) return

  error.value = ''
  sending.value = true
  try {
    if (!activeIssue.value || activeIssue.value.status !== 'OPEN') {
      const title = `Step ${props.office.step_number} checkpoint — ${props.office.office_name}`
      const res = await $fetch<{
        data: { issue: IssueRow; document: { tracking_status: string } }
      }>('/api/documents/issues/create', {
        method: 'POST',
        body: {
          document_id: props.document.id,
          reported_by_office_id: reportingOfficeId.value,
          target_office_id: targetOfficeId.value,
          issue_type: 'Pipeline Checkpoint',
          details: text,
          title,
          message_text: text,
        },
      })
      activeIssue.value = res.data.issue
      emit('updated', { tracking_status: res.data.document.tracking_status })
      await fetchMessages(res.data.issue.id)
      draft.value = ''
      return
    }

    const res = await $fetch<{ data: ChatMessage }>('/api/documents/issues/messages', {
      method: 'POST',
      body: { issue_id: activeIssue.value.id, message_text: text },
    })
    messages.value.push(res.data)
    draft.value = ''
    await scrollToBottom()
  } catch (err: any) {
    error.value = err?.data?.message || 'Failed to send message.'
  } finally {
    sending.value = false
  }
}

const isOwnMessage = (msg: ChatMessage) =>
  String(msg.sender_id) === String(auth.user?.user_id)

onMounted(() => {
  if (props.offices.length === 1) {
    reportingOfficeId.value = String(props.offices[0].id)
  }
  fetchIssue()
})

watch(() => props.office.office_id, () => {
  draft.value = ''
  error.value = ''
  messages.value = []
  activeIssue.value = null
  fetchIssue()
})
</script>
