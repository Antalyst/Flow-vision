<template>
  <section
    class="relative flex flex-col border-t"
    :class="isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50/80'"
  >

    <p v-if="reportSuccess" class="mx-5 mt-3 rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
      {{ reportSuccess }}
    </p>

    <!-- ── Active issue chat terminal ─────────────────────────────────── -->
    <div
      v-if="activeIssue"
      class="flex min-h-[300px] flex-1 flex-col"
      :class="isDark ? 'bg-onyx-black' : 'bg-white-surface'"
    >
      <div
        class="flex items-start justify-between gap-3 border-b px-5 py-3.5"
        :class="isDark ? 'border-white/10 bg-onyx-black' : 'border-gray-200 bg-white'"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <Icon name="ph:chat-circle-dots-fill" class="h-4 w-4 text-candy-orange" />
            <p class="text-xs font-bold uppercase tracking-widest text-candy-orange">Compliance Thread</p>
            <span
              class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold uppercase"
              :class="activeIssue.status === 'OPEN'
                ? 'border-warning/40 bg-warning/10 text-warning'
                : 'border-success/40 bg-success/10 text-success'"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-current" :class="activeIssue.status === 'OPEN' ? 'animate-pulse' : ''" />
              {{ activeIssue.status === 'OPEN' ? 'Flagged' : activeIssue.status }}
            </span>
          </div>
          <p class="mt-1 truncate text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ activeIssue.issue_type || activeIssue.title }}
          </p>
          <p v-if="targetOfficeLabel" class="mt-1 text-sm" :class="mutedText">
            Messaging: <span class="font-semibold text-candy-orange">{{ targetOfficeLabel }}</span>
          </p>
        </div>

        <button
          v-if="canResolveIssue"
          type="button"
          class="inline-flex flex-none items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-sm font-semibold text-success transition hover:bg-success/20 disabled:opacity-50"
          :disabled="resolving"
          @click="handleResolve"
        >
          <Icon v-if="resolving" name="ph:spinner-gap" class="h-3.5 w-3.5 animate-spin" />
          <Icon v-else name="ph:check-circle-fill" class="h-3.5 w-3.5" />
          Mark Resolved
        </button>
      </div>

      <div ref="messagesEl" class="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <div v-if="loadingMessages" class="flex items-center justify-center py-8" :class="mutedText">
          <Icon name="ph:spinner-gap" class="mr-2 h-5 w-5 animate-spin text-candy-orange" />
          Loading conversation…
        </div>

        <template v-else-if="messages.length">
          <article
            v-for="msg in messages"
            :key="msg.id"
            class="flex"
            :class="isOwnMessage(msg) ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[82%] rounded-2xl px-4 py-3 shadow-sm"
              :class="isOwnMessage(msg)
                ? 'bg-candy-orange text-white'
                : isDark
                  ? 'bg-onyx-black text-gray-100 border border-white/10'
                  : 'bg-gray-100 text-gray-900'"
            >
              <div class="mb-1 flex flex-wrap items-center gap-2">
                <span class="text-xs font-bold" :class="isOwnMessage(msg) ? 'text-white' : 'text-candy-orange'">
                  {{ msg.sender_name || 'Unknown' }}
                </span>
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
                  :class="isOwnMessage(msg)
                    ? 'bg-white/15 text-white'
                    : 'bg-candy-orange/15 text-candy-orange'"
                >
                  {{ speakerTier(msg) }}
                </span>
              </div>
              <p class="text-sm leading-relaxed">{{ msg.message_text }}</p>
              <p class="mt-2 text-xs" :class="isOwnMessage(msg) ? 'text-white/70' : 'text-gray-500'">
                {{ fmtTime(msg.created_at) }}
              </p>
            </div>
          </article>
        </template>

        <div v-else class="py-8 text-center text-sm" :class="mutedText">
          No messages yet. Start the compliance conversation below.
        </div>
      </div>

      <form
        v-if="activeIssue.status === 'OPEN'"
        class="border-t px-4 py-3"
        :class="isDark ? 'border-white/10 bg-onyx-black' : 'border-gray-200 bg-white'"
        @submit.prevent="sendMessage"
      >
        <div
          class="flex items-end gap-2 rounded-xl border p-2 transition-all focus-within:border-candy-orange/50 focus-within:ring-2 focus-within:ring-candy-orange/20"
          :class="isDark ? 'border-white/10 bg-onyx-black' : 'border-gray-200 bg-white-surface'"
        >
          <textarea
            v-model="draftMessage"
            rows="2"
            placeholder="Send a compliance note to the selected office desk…"
            class="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-gray-400"
            :class="isDark ? 'text-white' : 'text-gray-900'"
          />
          <button
            type="submit"
            class="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-candy-orange text-white transition hover:bg-candy-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!draftMessage.trim() || sending"
            aria-label="Send message"
          >
            <Icon v-if="sending" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
            <Icon v-else name="ph:paper-plane-right-fill" class="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>

    <!-- ── Report issue form: a modal on <body>, above the document drawer ──
         (it used to be an overlay inside this footer panel, which is ~0px tall
         when no issue is open and is clipped by the drawer, so it opened
         invisibly). -->
    <Teleport to="body">
    <Transition name="overlay-fade">
      <div
        v-if="showReportForm"
        class="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-issue-title"
        data-testid="report-issue-modal"
        @click.self="closeReportForm"
      >
        <div
          class="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:rounded-2xl"
          :class="isDark ? 'border-white/10 bg-onyx-card' : 'border-gray-200 bg-white'"
        >
        <div class="flex items-center justify-between border-b px-6 py-4" :class="isDark ? 'border-white/10' : 'border-gray-200'">
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-candy-orange">Flag Discrepancy</p>
            <h3 id="report-issue-title" class="text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Report Document Issue</h3>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg transition"
            :class="isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'"
            aria-label="Close"
            @click="closeReportForm"
          >
            <Icon name="ph:x-bold" class="h-4 w-4" />
          </button>
        </div>

        <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="submitReport">
          <!-- Fields scroll; the error and the actions below stay in view. -->
          <div class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <label class="block">
            <span class="text-sm font-semibold text-candy-orange">Issue Type <span class="text-danger">*</span></span>
            <select
              v-model="reportForm.issue_type"
              class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
              :class="inputClass"
              required
            >
              <option value="">Select issue type…</option>
              <option v-for="type in ISSUE_TYPES" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>

          <label class="block">
            <span class="text-sm font-semibold">Problem Details <span class="text-danger">*</span></span>
            <textarea
              v-model="reportForm.details"
              rows="3"
              placeholder="Describe what is wrong with the physical hard copy…"
              class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
              :class="inputClass"
              required
            />
          </label>

          <label class="block">
            <span class="text-sm font-semibold">Reporting Office <span class="text-danger">*</span></span>
            <select
              v-model="reportForm.reported_by_office_id"
              class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
              :class="inputClass"
              required
            >
              <option value="">Select your office…</option>
              <option v-for="o in offices" :key="o.id" :value="String(o.id)">{{ o.name }}</option>
            </select>
          </label>

          <div class="block rounded-xl border p-4" :class="isDark ? 'border-candy-orange/20 bg-candy-orange/5' : 'border-candy-orange/20 bg-candy-orange/5'">
            <span class="flex items-center gap-2 text-sm font-semibold text-candy-orange">
              <Icon name="ph:arrow-u-up-left-bold" class="h-4 w-4" />
              Send back to
            </span>
            <p v-if="loadingTargets" class="mt-1.5 text-sm" :class="mutedText">Finding the offices it can go back to…</p>
            <p v-else-if="targetsError" class="mt-1.5 text-sm text-danger" data-testid="report-targets-error">{{ targetsError }}</p>
            <div v-else-if="chatTargets.length" class="mt-2 space-y-2">
              <label
                v-for="t in chatTargets"
                :key="t.id + t.role"
                class="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition"
                :class="reportForm.send_back_office_id === t.id
                  ? 'border-candy-orange bg-candy-orange/10'
                  : (isDark ? 'border-white/10 hover:border-white/20' : 'border-gray-200 hover:border-gray-300')"
              >
                <input v-model="reportForm.send_back_office_id" type="radio" name="send-back-office" :value="t.id" class="mt-0.5 accent-candy-orange">
                <span>
                  <span class="block font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ t.name }}</span>
                  <span class="block text-xs" :class="mutedText">
                    {{ t.role === 'previous_handoff' ? 'The office that handed it to you' : 'Where this routing started' }}
                  </span>
                </span>
              </label>
            </div>
            <p v-else class="mt-1.5 text-sm text-warning">
              No previous office found on this document's route — it will stay flagged here instead.
            </p>
            <p class="mt-1 text-sm" :class="mutedText">
              That office is notified and can fix the document before sending it forward again.
            </p>
          </div>

          </div>

          <div class="shrink-0 space-y-3 border-t px-6 py-4" :class="isDark ? 'border-white/10' : 'border-gray-200'">
          <p v-if="reportError" class="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger" role="alert">
            {{ reportError }}
          </p>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
              :class="isDark ? 'border-white/10 text-gray-300' : 'border-gray-200 text-gray-700'"
              :disabled="reporting"
              @click="closeReportForm"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-candy-hover disabled:opacity-50"
              :disabled="reporting || !canSubmitReport"
            >
              <Icon v-if="reporting" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
              <Icon v-else name="ph:warning-fill" class="h-4 w-4" />
              Submit Flag
            </button>
          </div>
          </div>
        </form>
        </div>
      </div>
    </Transition>
    </Teleport>

  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useIssueChatRealtime } from '~/composables/useIssueChatRealtime'

const ISSUE_TYPES = [
  'Missing Signatures',
  'Incomplete Forms',
  'Damaged Hard Copy',
  'Wrong Document Version',
  'Other',
] as const

interface LedgerDoc {
  id: string
  user_id: string
  tracking_status?: string
  origin_office_id?: string
  current_office_id?: string
}

interface OfficeRecord { id: string; name: string; code?: string }

interface ChatTarget {
  id: string
  name: string
  code: string | null
  role: 'origin' | 'previous_handoff'
}

interface IssueRow {
  id: string
  document_id: string
  org_id: string
  reported_by_office_id: string
  target_office_id?: string | null
  issue_type?: string | null
  details?: string | null
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
  (e: 'updated', data: { tracking_status: string; issueClosed?: boolean }): void
}>()

const auth = useAuthStore()
const { isDark } = useTheme()

const showReportForm = ref(false)
const activeIssue    = ref<IssueRow | null>(null)
const messages       = ref<ChatMessage[]>([])
const chatTargets    = ref<ChatTarget[]>([])
const loadingTargets = ref(false)
const draftMessage   = ref('')
const loadingMessages = ref(false)
const sending        = ref(false)
const reporting      = ref(false)
const resolving      = ref(false)
const reportError    = ref('')
const targetsError   = ref('')
const reportSuccess  = ref('')
const messagesEl     = ref<HTMLElement | null>(null)

const reportForm = reactive({
  issue_type: '',
  details: '',
  reported_by_office_id: '',
  /** Office it is sent back to; defaults to whoever handed it here. */
  send_back_office_id: '',
})

const orgId   = computed(() => String(auth.user?.org_id ?? ''))
const issueId = computed(() => activeIssue.value?.id ?? null)

const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass = computed(() =>
  isDark.value
    ? 'border-white/10 bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

const canSubmitReport = computed(() =>
  Boolean(
    !targetsError.value &&
    reportForm.issue_type &&
    reportForm.details.trim() &&
    reportForm.reported_by_office_id,
  )
)

// Auto-routing target shown for information — the backend resolves this
// itself (whoever sent the document here), this is display-only.
const returnTarget = computed(() =>
  chatTargets.value.find((t) => t.role === 'previous_handoff') ??
  chatTargets.value.find((t) => t.role === 'origin') ??
  null
)

const targetOfficeLabel = computed(() => {
  if (!activeIssue.value?.target_office_id) return ''
  const match = props.offices.find((o) => String(o.id) === String(activeIssue.value!.target_office_id))
  return match?.name || chatTargets.value.find((t) => t.id === String(activeIssue.value!.target_office_id))?.name || ''
})

const canResolveIssue = computed(() => {
  if (!activeIssue.value || activeIssue.value.status !== 'OPEN') return false
  if (auth.user?.role === 'client') return true
  const issueOfficeIds = [
    activeIssue.value.reported_by_office_id,
    activeIssue.value.target_office_id,
  ].filter(Boolean).map(String)
  return props.offices.some((o) => issueOfficeIds.includes(String(o.id)))
})

/**
 * Called by the drawer's "Flag Issue / Incomplete" button. Opens the modal
 * immediately (visible feedback even if loading the offices fails), then
 * loads where the document can be sent back to.
 */
const openReportForm = async () => {
  reportError.value = ''
  reportSuccess.value = ''
  showReportForm.value = true
  if (props.offices.length === 1) {
    reportForm.reported_by_office_id = String(props.offices[0]!.id)
  }
  await fetchChatTargets()
  const preferred = chatTargets.value.find((t) => t.role === 'previous_handoff') ?? chatTargets.value[0]
  if (!chatTargets.value.some((t) => t.id === reportForm.send_back_office_id)) {
    reportForm.send_back_office_id = preferred?.id ?? ''
  }
}

const closeReportForm = () => {
  if (reporting.value) return // never close mid-submit
  showReportForm.value = false
}

defineExpose({ openReportForm, closeReportForm })

const fetchChatTargets = async () => {
  if (!props.document?.id) return
  loadingTargets.value = true
  targetsError.value = ''
  try {
    const res = await $fetch<{
      success: boolean
      data: { targets: ChatTarget[] }
    }>('/api/documents/issues/chat-targets', {
      params: { document_id: props.document.id },
    })
    chatTargets.value = res.data?.targets ?? []
  } catch (err: any) {
    console.error('[IssueChat] fetchChatTargets:', err)
    chatTargets.value = []
    // e.g. 403 when this account can't report on the document — say so
    // instead of leaving the form looking usable.
    targetsError.value = err?.data?.message || 'Could not check where this document would be sent back to. Please try again.'
  } finally {
    loadingTargets.value = false
  }
}

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
  if (reporting.value) return // no duplicate submissions
  reportError.value = ''
  reportSuccess.value = ''
  reporting.value = true
  const title = `${reportForm.issue_type}: ${reportForm.details.trim().slice(0, 180)}`

  try {
    const res = await $fetch<{
      success: boolean
      message?: string
      data: { issue: IssueRow; document: { tracking_status: string } }
    }>('/api/documents/issues/create', {
      method: 'POST',
      body: {
        document_id:           props.document.id,
        reported_by_office_id: reportForm.reported_by_office_id,
        issue_type:            reportForm.issue_type,
        details:               reportForm.details.trim(),
        title,
        message_text:          reportForm.details.trim(),
        send_back_office_id:   reportForm.send_back_office_id || undefined,
      },
    })

    activeIssue.value = res.data.issue
    showReportForm.value = false
    reportForm.issue_type = ''
    reportForm.details = ''
    reportForm.reported_by_office_id = ''
    reportForm.send_back_office_id = ''

    reportSuccess.value = res.message || 'Discrepancy reported.'
    emit('updated', { tracking_status: res.data.document.tracking_status })
    await fetchMessages(res.data.issue.id)
  } catch (err: any) {
    if (err?.data?.data?.code === 'ISSUE_ALREADY_OPEN') {
      // Reported meanwhile (e.g. a double submit): show the existing thread.
      showReportForm.value = false
      await fetchIssueState()
    }
    reportError.value = err?.data?.message || 'Failed to submit issue report.'
  } finally {
    reporting.value = false
  }
}

const sendMessage = async () => {
  const text = draftMessage.value.trim()
  if (!text || !activeIssue.value || sending.value) return

  sending.value = true
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

const isOwnMessage = (msg: ChatMessage) =>
  String(msg.sender_id) === String(auth.user?.user_id)

const speakerTier = (msg: ChatMessage): string => {
  if (msg.sender_role === 'client') return 'Organisation Admin'
  if (String(msg.sender_id) === String(props.document.user_id)) return 'Originating Office'
  return 'Checkpoint Reviewer'
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
    reportSuccess.value = ''
    reportError.value = ''
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
