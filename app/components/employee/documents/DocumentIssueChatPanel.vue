<template>
  <section
    class="relative flex flex-col border-t"
    :class="isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50/80'"
  >

    <!-- ── Report trigger (ARRIVED_AT_OFFICE, no open issue) ───────────── -->
    <div
      v-if="canReportDiscrepancy"
      class="px-6 py-4"
    >
      <button
        type="button"
        class="group flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-rich-orange/40 bg-rich-orange/10 px-4 py-3.5 text-sm font-bold text-rich-orange shadow-lg shadow-rich-orange/10 transition-all duration-300 hover:border-rich-orange hover:bg-rich-orange hover:text-white hover:shadow-rich-orange/30 active:scale-[0.98]"
        @click="showReportForm = true"
      >
        <Icon name="ph:warning-fill" class="h-5 w-5 transition-transform group-hover:scale-110" />
        Report Document Discrepancy
      </button>
      <p class="mt-2 text-center text-[11px]" :class="mutedText">
        Flag missing pages, skipped signatures, or other hard-copy problems.
      </p>
    </div>

    <!-- ── Active issue chat terminal ─────────────────────────────────── -->
    <div
      v-if="activeIssue"
      class="flex min-h-[280px] flex-1 flex-col backdrop-blur-md"
      :class="isDark ? 'bg-slate-900/40' : 'bg-white/60'"
    >
      <!-- Chat header -->
      <div
        class="flex items-start justify-between gap-3 border-b px-5 py-3.5"
        :class="isDark ? 'border-white/10' : 'border-gray-200/80'"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <Icon name="ph:chat-circle-dots-fill" class="h-4 w-4 text-rich-orange" />
            <p class="text-[10px] font-bold uppercase tracking-widest text-rich-orange">Issue Thread</p>
            <span
              class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase"
              :class="activeIssue.status === 'OPEN'
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-400'
                : 'border-green-400/40 bg-green-400/10 text-green-400'"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-current" :class="activeIssue.status === 'OPEN' ? 'animate-pulse' : ''" />
              {{ activeIssue.status }}
            </span>
          </div>
          <p class="mt-1 truncate text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ activeIssue.title }}
          </p>
        </div>

        <button
          v-if="canResolveIssue"
          type="button"
          class="inline-flex flex-none items-center gap-1.5 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-[11px] font-semibold text-green-500 transition hover:bg-green-500/20 disabled:opacity-50"
          :disabled="resolving"
          @click="handleResolve"
        >
          <Icon v-if="resolving" name="ph:spinner-gap" class="h-3.5 w-3.5 animate-spin" />
          <Icon v-else name="ph:check-circle-fill" class="h-3.5 w-3.5" />
          Mark as Resolved
        </button>
      </div>

      <!-- Messages -->
      <div
        ref="messagesEl"
        class="flex-1 space-y-3 overflow-y-auto px-5 py-4"
      >
        <div v-if="loadingMessages" class="flex items-center justify-center py-8" :class="mutedText">
          <Icon name="ph:spinner-gap" class="mr-2 h-5 w-5 animate-spin text-rich-orange" />
          Loading conversation…
        </div>

        <template v-else-if="messages.length">
          <article
            v-for="msg in messages"
            :key="msg.id"
            class="flex gap-3"
            :class="isOwnMessage(msg) ? 'flex-row-reverse' : ''"
          >
            <!-- Avatar -->
            <div
              class="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-bold"
              :class="isOwnMessage(msg)
                ? 'bg-rich-orange text-white shadow-md shadow-rich-orange/30'
                : isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-700'"
            >
              {{ initials(msg.sender_name) }}
            </div>

            <!-- Bubble -->
            <div
              class="max-w-[78%] rounded-2xl border px-3.5 py-2.5 shadow-sm backdrop-blur-sm"
              :class="isOwnMessage(msg)
                ? 'border-rich-orange/30 bg-rich-orange/10'
                : isDark ? 'border-white/10 bg-white/[0.06]' : 'border-gray-200 bg-white/80'"
            >
              <div class="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span class="text-xs font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ msg.sender_name || 'Unknown' }}
                </span>
                <span
                  class="inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  :class="tierBadgeClass(msg)"
                >
                  {{ speakerTier(msg) }}
                </span>
              </div>
              <p class="text-sm leading-relaxed" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                {{ msg.message_text }}
              </p>
              <p class="mt-1.5 text-[10px]" :class="mutedText">
                {{ fmtTime(msg.created_at) }}
              </p>
            </div>
          </article>
        </template>

        <div v-else class="py-8 text-center text-sm" :class="mutedText">
          No messages yet. Start the conversation below.
        </div>

        <!-- Typing indicator -->
        <div v-if="isTyping" class="flex items-center gap-2 px-1">
          <span class="flex gap-1">
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-rich-orange [animation-delay:0ms]" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-rich-orange [animation-delay:120ms]" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-rich-orange [animation-delay:240ms]" />
          </span>
          <span class="text-[11px] font-medium text-rich-orange">Composing…</span>
        </div>
      </div>

      <!-- Composer -->
      <form
        v-if="activeIssue.status === 'OPEN'"
        class="border-t px-4 py-3"
        :class="isDark ? 'border-white/10' : 'border-gray-200/80'"
        @submit.prevent="sendMessage"
      >
        <div
          class="flex items-end gap-2 rounded-xl border p-2 backdrop-blur-md transition-all focus-within:border-rich-orange/50 focus-within:ring-2 focus-within:ring-rich-orange/20"
          :class="isDark ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-white/70'"
        >
          <textarea
            v-model="draftMessage"
            rows="2"
            placeholder="Describe the discrepancy or reply to the branch…"
            class="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-gray-400"
            @input="onDraftInput"
          />
          <button
            type="submit"
            class="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-rich-orange text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!draftMessage.trim() || sending"
            aria-label="Send message"
          >
            <Icon v-if="sending" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
            <Icon v-else name="ph:paper-plane-right-fill" class="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>

    <!-- ── Report issue form overlay ──────────────────────────────────── -->
    <Transition name="overlay-fade">
      <div
        v-if="showReportForm"
        class="absolute inset-0 z-20 flex flex-col backdrop-blur-md"
        :class="isDark ? 'bg-black/70' : 'bg-white/80'"
      >
        <div class="flex items-center justify-between border-b px-6 py-4" :class="isDark ? 'border-white/10' : 'border-gray-200'">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-rich-orange">Flag Discrepancy</p>
            <h3 class="text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Report Document Issue</h3>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl transition"
            :class="isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'"
            @click="showReportForm = false"
          >
            <Icon name="ph:x-bold" class="h-4 w-4" />
          </button>
        </div>

        <form class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5" @submit.prevent="submitReport">
          <label class="block">
            <span class="text-sm font-semibold text-rich-orange">Issue Summary <span class="text-red-500">*</span></span>
            <input
              v-model="reportForm.title"
              type="text"
              maxlength="255"
              placeholder="e.g. Missing signature on page 3"
              class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"
              :class="inputClass"
              required
            />
          </label>

          <label class="block">
            <span class="text-sm font-semibold">Reporting Office <span class="text-red-500">*</span></span>
            <select
              v-model="reportForm.reported_by_office_id"
              class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"
              :class="inputClass"
              required
            >
              <option value="">Select your office…</option>
              <option v-for="o in offices" :key="o.id" :value="String(o.id)">{{ o.name }}</option>
            </select>
          </label>

          <label class="block flex-1">
            <span class="text-sm font-semibold">Initial Message</span>
            <textarea
              v-model="reportForm.message_text"
              rows="4"
              placeholder="Describe what is wrong with the physical hard copy…"
              class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"
              :class="inputClass"
            />
          </label>

          <p v-if="reportError" class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-500">
            {{ reportError }}
          </p>

          <div class="mt-auto flex justify-end gap-3 pt-2">
            <button
              type="button"
              class="rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
              :class="isDark ? 'border-white/10 text-gray-300' : 'border-gray-200 text-gray-700'"
              @click="showReportForm = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex items-center gap-2 rounded-xl bg-rich-orange px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b] disabled:opacity-50"
              :disabled="reporting || !reportForm.title.trim() || !reportForm.reported_by_office_id"
            >
              <Icon v-if="reporting" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
              <Icon v-else name="ph:warning-fill" class="h-4 w-4" />
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </Transition>

  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useIssueChatRealtime } from '~/composables/useIssueChatRealtime'

interface LedgerDoc {
  id: string
  user_id: string
  tracking_status?: string
  origin_office_id?: string
  current_office_id?: string
}

interface OfficeRecord { id: string; name: string; code?: string }

interface IssueRow {
  id: string
  document_id: string
  org_id: string
  reported_by_office_id: string
  title: string
  status: 'OPEN' | 'RESOLVED'
  created_at: string
}

interface ChatMessage {
  id: string
  issue_id: string
  sender_id: string
  sender_name: string | null
  sender_role: string | null
  message_text: string
  created_at: string
}

const props = defineProps<{
  document: LedgerDoc
  offices: OfficeRecord[]
}>()

const emit = defineEmits<{
  (e: 'updated', payload: { tracking_status: string; issueClosed?: boolean }): void
}>()

const auth = useAuthStore()
const { isDark } = useTheme()

const showReportForm = ref(false)
const activeIssue    = ref<IssueRow | null>(null)
const messages       = ref<ChatMessage[]>([])
const draftMessage   = ref('')
const loadingMessages = ref(false)
const sending        = ref(false)
const reporting      = ref(false)
const resolving      = ref(false)
const reportError    = ref('')
const isTyping       = ref(false)
const messagesEl     = ref<HTMLElement | null>(null)

let typingTimer: ReturnType<typeof setTimeout> | null = null

const reportForm = reactive({
  title: '',
  reported_by_office_id: '',
  message_text: '',
})

const orgId   = computed(() => String(auth.user?.org_id ?? ''))
const issueId = computed(() => activeIssue.value?.id ?? null)

const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass = computed(() =>
  isDark.value
    ? 'border-white/10 bg-rich-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

const canReportDiscrepancy = computed(() =>
  props.document.tracking_status === 'ARRIVED_AT_OFFICE' &&
  !activeIssue.value &&
  !showReportForm.value
)

const canResolveIssue = computed(() => {
  if (!activeIssue.value || activeIssue.value.status !== 'OPEN') return false
  if (auth.user?.role === 'client') return true
  return props.offices.some(
    (o) => String(o.id) === String(activeIssue.value!.reported_by_office_id),
  )
})

const scrollToBottom = async () => {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

const fetchIssueState = async () => {
  if (!props.document?.id) return

  try {
    const res = await $fetch<{
      success: boolean
      openIssue: IssueRow | null
    }>('/api/documents/issues/list', {
      params: { document_id: props.document.id },
    })

    activeIssue.value = res.openIssue

    if (res.openIssue) {
      await fetchMessages(res.openIssue.id)
    } else {
      messages.value = []
    }
  } catch (err) {
    console.error('[IssueChat] fetchIssueState:', err)
  }
}

const fetchMessages = async (id: string) => {
  loadingMessages.value = true
  try {
    const res = await $fetch<{ success: boolean; data: ChatMessage[] }>(
      '/api/documents/issues/messages',
      { params: { issue_id: id, limit: 200 } },
    )
    messages.value = res.data ?? []
    await scrollToBottom()
  } catch (err) {
    console.error('[IssueChat] fetchMessages:', err)
  } finally {
    loadingMessages.value = false
  }
}

const submitReport = async () => {
  reportError.value = ''
  reporting.value = true
  try {
    const res = await $fetch<{
      success: boolean
      data: { issue: IssueRow; document: { tracking_status: string } }
    }>('/api/documents/issues/create', {
      method: 'POST',
      body: {
        document_id:           props.document.id,
        reported_by_office_id: reportForm.reported_by_office_id,
        title:                 reportForm.title.trim(),
        message_text:          reportForm.message_text.trim() || undefined,
      },
    })

    activeIssue.value = res.data.issue
    showReportForm.value = false
    reportForm.title = ''
    reportForm.message_text = ''
    reportForm.reported_by_office_id = ''

    emit('updated', { tracking_status: res.data.document.tracking_status })
    await fetchMessages(res.data.issue.id)
  } catch (err: any) {
    reportError.value = err?.data?.message || 'Failed to submit issue report.'
  } finally {
    reporting.value = false
  }
}

const sendMessage = async () => {
  const text = draftMessage.value.trim()
  if (!text || !activeIssue.value || sending.value) return

  sending.value = true
  isTyping.value = false
  try {
    const res = await $fetch<{ success: boolean; data: ChatMessage }>(
      '/api/documents/issues/messages',
      {
        method: 'POST',
        body: { issue_id: activeIssue.value.id, message_text: text },
      },
    )
    messages.value.push(res.data)
    draftMessage.value = ''
    await scrollToBottom()
  } catch (err) {
    console.error('[IssueChat] sendMessage:', err)
  } finally {
    sending.value = false
  }
}

const handleResolve = async () => {
  if (!activeIssue.value || resolving.value) return
  resolving.value = true
  try {
    const res = await $fetch<{
      success: boolean
      data: { document: { tracking_status: string } }
    }>('/api/documents/issues/resolve', {
      method: 'POST',
      body: { issue_id: activeIssue.value.id },
    })

    activeIssue.value = { ...activeIssue.value, status: 'RESOLVED' }
    emit('updated', { tracking_status: res.data.document.tracking_status, issueClosed: true })

    setTimeout(() => {
      activeIssue.value = null
      messages.value = []
    }, 1200)
  } catch (err) {
    console.error('[IssueChat] resolve:', err)
  } finally {
    resolving.value = false
  }
}

const onDraftInput = () => {
  isTyping.value = true
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(() => { isTyping.value = false }, 900)
}

const isOwnMessage = (msg: ChatMessage) =>
  String(msg.sender_id) === String(auth.user?.user_id)

const speakerTier = (msg: ChatMessage): string => {
  if (msg.sender_role === 'client') return 'Organisation Admin'
  if (String(msg.sender_id) === String(props.document.user_id)) return 'Originating Office Admin'
  if (activeIssue.value && String(msg.sender_id) !== String(props.document.user_id)) {
    return 'Registrar Branch Reviewer'
  }
  return 'Office Reviewer'
}

const tierBadgeClass = (msg: ChatMessage) => {
  if (msg.sender_role === 'client') {
    return isDark.value
      ? 'border-blue-400/30 bg-blue-400/10 text-blue-300'
      : 'border-blue-400/30 bg-blue-50 text-blue-600'
  }
  if (String(msg.sender_id) === String(props.document.user_id)) {
    return 'border-rich-orange/30 bg-rich-orange/10 text-rich-orange'
  }
  return isDark.value
    ? 'border-teal-400/30 bg-teal-400/10 text-teal-300'
    : 'border-teal-400/30 bg-teal-50 text-teal-700'
}

const initials = (name: string | null) => {
  if (!name) return '?'
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

const fmtTime = (v: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(v))

useIssueChatRealtime(orgId, issueId, async (event) => {
  if (event === 'new_message' && activeIssue.value) {
    await fetchMessages(activeIssue.value.id)
  }
  if (event === 'issue_resolved') {
    activeIssue.value = null
    messages.value = []
    emit('updated', { tracking_status: 'ARRIVED_AT_OFFICE', issueClosed: true })
  }
})

watch(
  () => props.document?.id,
  () => {
    showReportForm.value = false
    fetchIssueState()
  },
  { immediate: true },
)

watch(
  () => props.document?.tracking_status,
  (status) => {
    if (status === 'DISCREPANCY_REPORTED' && !activeIssue.value) {
      fetchIssueState()
    }
  },
)
</script>

<style scoped>
.overlay-fade-enter-active, .overlay-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.overlay-fade-enter-from, .overlay-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
