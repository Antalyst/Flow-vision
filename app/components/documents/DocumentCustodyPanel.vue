<template>
  <section class="stagger-block rounded-2xl border p-5" :class="cardClass">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">Custody &amp; Release</p>
        <p class="mt-1 text-sm font-semibold" :class="headingClass">{{ stateLabel }}</p>
      </div>
      <span class="rounded-full px-3 py-1 text-xs font-bold" :class="stateBadgeClass">{{ stateShort }}</span>
    </div>

    <!-- Who is responsible right now -->
    <dl class="mt-4 grid gap-3 sm:grid-cols-2">
      <div class="rounded-xl border px-4 py-3" :class="innerClass">
        <dt class="text-[11px] font-bold uppercase tracking-wide" :class="mutedClass">Current holder</dt>
        <dd class="mt-1 text-sm font-semibold" :class="headingClass">
          {{ custody.holder_name || (inTransit ? 'With the liaison (in transit)' : '—') }}
        </dd>
      </div>
      <div class="rounded-xl border px-4 py-3" :class="innerClass">
        <dt class="text-[11px] font-bold uppercase tracking-wide" :class="mutedClass">Liaison for next delivery</dt>
        <dd class="mt-1 text-sm font-semibold" :class="headingClass">
          {{ custody.active_liaison?.liaison_name || 'Not assigned yet' }}
        </dd>
        <dd v-if="custody.active_liaison" class="mt-0.5 text-xs" :class="mutedClass">
          {{ custody.active_liaison.picked_up_at ? `Picked up ${fmt(custody.active_liaison.picked_up_at)}` : `Assigned ${fmt(custody.active_liaison.assigned_at)}` }}
          <template v-if="custody.active_liaison.to_office_name"> · to {{ custody.active_liaison.to_office_name }}</template>
        </dd>
      </div>
    </dl>

    <!-- Pending release request -->
    <div v-if="custody.pending_release" class="mt-4 rounded-xl border border-candy-orange/30 bg-candy-orange/5 px-4 py-3">
      <p class="text-sm font-semibold text-candy-orange">
        {{ custody.is_final_stop ? 'Completion' : 'Release' }} requested by {{ custody.pending_release.requested_by_name || 'staff' }}
      </p>
      <p class="mt-0.5 text-xs" :class="mutedClass">{{ fmt(custody.pending_release.requested_at) }} · waiting for the office head</p>
      <p v-if="custody.pending_release.remarks" class="mt-2 text-sm" :class="headingClass">“{{ custody.pending_release.remarks }}”</p>

      <div v-if="custody.viewer_is_head" class="mt-3 space-y-2">
        <textarea
          v-model="decisionRemarks"
          rows="2"
          maxlength="1000"
          placeholder="Remarks (required to reject)"
          class="w-full resize-none rounded-lg border px-3 py-2 text-sm"
          :class="inputClass"
        />
        <div class="flex flex-wrap gap-2">
          <button type="button" class="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50" :disabled="busy" @click="decide('approve')">
            <Icon name="ph:check-circle-fill" class="h-4 w-4" />
            {{ custody.is_final_stop ? 'Approve & complete' : 'Approve release' }}
          </button>
          <button type="button" class="inline-flex items-center gap-2 rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-bold text-danger transition hover:bg-danger/10 disabled:opacity-50" :disabled="busy" @click="decide('reject')">
            <Icon name="ph:x-circle-fill" class="h-4 w-4" />
            Reject
          </button>
        </div>
      </div>
    </div>

    <p v-else-if="custody.release_approved && !custody.is_final_stop && !custody.active_liaison" class="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
      Release approved. Assign a liaison below to deliver it to {{ custody.next_stop?.office_name || 'the next office' }}.
    </p>

    <!-- Actions for the holder / office head at this office -->
    <div v-if="canAct" class="mt-4 space-y-3">
      <div v-if="!custody.pending_release && !custody.release_approved" class="rounded-xl border p-4" :class="innerClass">
        <p class="text-sm font-semibold" :class="headingClass">
          {{ custody.is_final_stop ? 'Ready to complete?' : 'Ready to send to the next office?' }}
        </p>
        <p class="mt-0.5 text-xs" :class="mutedClass">
          The office head must approve before the document
          {{ custody.is_final_stop ? 'is marked completed.' : `leaves for ${custody.next_stop?.office_name || 'the next office'}.` }}
        </p>
        <textarea v-model="requestRemarks" rows="2" maxlength="1000" placeholder="Remarks for the office head (optional)" class="mt-2 w-full resize-none rounded-lg border px-3 py-2 text-sm" :class="inputClass" />
        <button type="button" class="mt-2 inline-flex items-center gap-2 rounded-xl bg-candy-orange px-4 py-2.5 text-sm font-bold text-white transition hover:bg-candy-hover disabled:opacity-50" :disabled="busy" @click="requestRelease">
          <Icon name="ph:paper-plane-tilt-fill" class="h-4 w-4" />
          {{ custody.is_final_stop ? 'Request completion' : 'Request release' }}
        </button>
      </div>

      <div class="rounded-xl border p-4" :class="innerClass">
        <button v-if="!handoverOpen" type="button" class="inline-flex items-center gap-2 text-sm font-semibold text-candy-orange hover:underline" @click="openHandover">
          <Icon name="ph:hand-arrow-up-fill" class="h-4 w-4" />
          Hand over to a colleague
        </button>
        <div v-else class="space-y-2">
          <p class="text-sm font-semibold" :class="headingClass">Hand over to</p>
          <select v-model="handoverTo" class="w-full rounded-lg border px-3 py-2 text-sm" :class="inputClass">
            <option value="" disabled>{{ membersLoading ? 'Loading…' : 'Choose a staff member' }}</option>
            <option v-for="m in members" :key="m.user_id" :value="m.user_id" :disabled="m.is_holder">
              {{ m.full_name || 'Staff' }}{{ m.is_head ? ' (Office head)' : '' }}{{ m.is_holder ? ' — holding it now' : '' }}
            </option>
          </select>
          <input v-model="handoverNotes" type="text" maxlength="500" placeholder="Note (optional)" class="w-full rounded-lg border px-3 py-2 text-sm" :class="inputClass" />
          <div class="flex gap-2">
            <button type="button" class="rounded-xl bg-candy-orange px-4 py-2 text-sm font-bold text-white transition hover:bg-candy-hover disabled:opacity-50" :disabled="busy || !handoverTo" @click="handOver">Confirm hand-over</button>
            <button type="button" class="rounded-xl px-4 py-2 text-sm font-semibold" :class="mutedClass" @click="handoverOpen = false">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="feedback" class="mt-3 rounded-lg px-4 py-2.5 text-sm" :class="feedbackError ? 'border border-danger/30 bg-danger/10 text-danger' : 'border border-success/30 bg-success/10 text-success'">
      {{ feedback }}
    </p>

    <!-- History: every moment in the order it happened, grouped by routing cycle -->
    <div v-if="historyGroups.length" class="mt-5 border-t pt-4" :class="isDark ? 'border-white/10' : 'border-gray-100'">
      <p class="text-[11px] font-bold uppercase tracking-wide" :class="mutedClass">Delivery &amp; approval history</p>
      <div v-for="group in historyGroups" :key="group.cycle" class="mt-2">
        <p v-if="historyGroups.length > 1" class="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-wide text-candy-orange">Cycle {{ group.cycle }}</p>
        <ul class="space-y-2 text-sm">
          <li v-for="entry in group.entries" :key="entry.key" class="flex gap-2">
            <Icon :name="historyIcon(entry)" class="mt-0.5 h-4 w-4 flex-none" :class="historyIconClass(entry)" />
            <span :class="headingClass">
              {{ historyText(entry) }}
              <span class="block text-xs" :class="mutedClass">
                {{ fmt(entry.at) }}<template v-if="historyDetail(entry)"> · {{ historyDetail(entry) }}</template>
              </span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { buildCustodyHistory, type CustodyHistoryEntry } from '~/utils/custodyHistory'

export interface CustodyState {
  handling_state: string
  holder_id: string | null
  holder_name: string | null
  office_head_id: string | null
  viewer_is_holder: boolean
  viewer_is_head: boolean
  release_approved: boolean
  pending_release: any | null
  is_final_stop: boolean
  next_stop: { office_id: string; office_name: string; step_number: number } | null
  active_liaison: any | null
  discrepancy_return?: { issue_id: string; office_id: string; office_name: string; step: number } | null
}

const props = defineProps<{
  documentId: string
  trackingStatus: string
  custody: CustodyState
  liaisonAssignments: any[]
  releaseRequests: any[]
  /** Recurring routing cycles (start_step / end_step), for grouping the history. */
  cycles?: Array<{ cycle_number: number; start_step: number | null; end_step: number | null }>
}>()

const emit = defineEmits<{ (e: 'changed'): void }>()

const { isDark } = useTheme()
const cardClass = computed(() => (isDark.value ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-white'))
const innerClass = computed(() => (isDark.value ? 'border-white/10' : 'border-gray-100 bg-gray-50/60'))
const headingClass = computed(() => (isDark.value ? 'text-white' : 'text-gray-900'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const inputClass = computed(() => (isDark.value
  ? 'border-white/10 bg-onyx-black text-white placeholder:text-gray-500'
  : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'))

const busy = ref(false)
const feedback = ref('')
const feedbackError = ref(false)
const requestRemarks = ref('')
const decisionRemarks = ref('')
const handoverOpen = ref(false)
const handoverTo = ref('')
const handoverNotes = ref('')
const members = ref<Array<{ user_id: string; full_name: string | null; is_head: boolean; is_holder: boolean }>>([])
const membersLoading = ref(false)

const inTransit = computed(() => props.trackingStatus === 'IN_TRANSIT' || props.trackingStatus === 'PICKED_UP')
const canAct = computed(() =>
  props.trackingStatus === 'ARRIVED_AT_OFFICE' && (props.custody.viewer_is_holder || props.custody.viewer_is_head))
const historyGroups = computed(() => buildCustodyHistory(props.liaisonAssignments, props.releaseRequests, props.cycles ?? []))

function historyText(entry: CustodyHistoryEntry): string {
  const leg = entry.leg
  const r = entry.release
  const route = leg ? `${leg.from_office_name ? `${leg.from_office_name} ` : ''}→ ${leg.to_office_name || 'next office'}` : ''
  switch (entry.kind) {
    case 'LIAISON_ASSIGNED': return `${leg.liaison_name || 'Liaison'} assigned · ${route}`
    case 'PICKED_UP': return `Picked up by ${leg.liaison_name || 'the liaison'} · ${route}`
    case 'RECEIVED': return `Received at ${leg.to_office_name || 'the office'}${leg.received_by_name ? ` by ${leg.received_by_name}` : ''}`
    case 'RELEASE_REQUESTED': return `Release requested by ${r.requested_by_name || 'staff'}`
    case 'RELEASE_DECIDED': return `Release ${r.status === 'APPROVED' ? 'approved' : 'rejected'}${r.decided_by_name ? ` by ${r.decided_by_name}` : ''}`
  }
}

function historyDetail(entry: CustodyHistoryEntry): string {
  if (entry.kind === 'LIAISON_ASSIGNED') {
    const parts = [entry.leg.assigned_by_name ? `by ${entry.leg.assigned_by_name}` : '']
    if (entry.leg.status === 'CANCELLED') parts.push('reassigned')
    return parts.filter(Boolean).join(' · ')
  }
  if (entry.kind === 'RELEASE_REQUESTED' && entry.release.remarks) return `“${entry.release.remarks}”`
  if (entry.kind === 'RELEASE_DECIDED' && entry.release.decision_remarks) return `“${entry.release.decision_remarks}”`
  return ''
}

function historyIcon(entry: CustodyHistoryEntry): string {
  if (entry.kind === 'RELEASE_DECIDED') return entry.release.status === 'APPROVED' ? 'ph:seal-check-fill' : 'ph:x-circle-fill'
  if (entry.kind === 'RELEASE_REQUESTED') return 'ph:paper-plane-tilt-fill'
  if (entry.kind === 'RECEIVED') return 'ph:tray-arrow-down-fill'
  if (entry.kind === 'PICKED_UP') return 'ph:hand-fill'
  return 'ph:motorcycle-fill'
}

function historyIconClass(entry: CustodyHistoryEntry): string {
  if (entry.kind === 'RELEASE_DECIDED') return entry.release.status === 'APPROVED' ? 'text-success' : 'text-danger'
  if (entry.kind === 'RECEIVED') return 'text-success'
  return 'text-candy-orange'
}

const STATE: Record<string, [string, string, string]> = {
  REGISTERED: ['Registered — waiting for a liaison to be assigned', 'Registered', 'bg-gray-500/10 text-gray-500'],
  AWAITING_PICKUP: ['Waiting for the assigned liaison to pick it up', 'Awaiting pickup', 'bg-candy-orange/10 text-candy-orange'],
  DISPATCHED: ['On the way to the next office', 'Dispatched', 'bg-candy-orange/10 text-candy-orange'],
  BEING_HANDLED: ['Being handled at the office', 'Being handled', 'bg-candy-orange/10 text-candy-orange'],
  AWAITING_RELEASE_APPROVAL: ['Waiting for the office head to approve release', 'Awaiting approval', 'bg-warning/10 text-warning'],
  RELEASE_APPROVED: ['Release approved — a liaison needs to be assigned', 'Approved', 'bg-success/10 text-success'],
  COMPLETED: ['Completed its route', 'Completed', 'bg-success/10 text-success'],
  FLAGGED: ['Flagged — held here until it is returned for correction', 'Flagged', 'bg-danger/10 text-danger'],
}
const stateLabel = computed(() => {
  const ret = props.custody.discrepancy_return
  if (props.custody.handling_state === 'FLAGGED' && ret) {
    return `Flagged — held here until a liaison returns it to ${ret.office_name} for correction`
  }
  return STATE[props.custody.handling_state]?.[0] ?? 'In progress'
})
const stateShort = computed(() => STATE[props.custody.handling_state]?.[1] ?? 'In progress')
const stateBadgeClass = computed(() => STATE[props.custody.handling_state]?.[2] ?? 'bg-gray-500/10 text-gray-500')

function fmt(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

async function run(action: () => Promise<{ message?: string }>) {
  busy.value = true
  feedback.value = ''
  try {
    const res = await action()
    feedback.value = res?.message || 'Done.'
    feedbackError.value = false
    emit('changed')
  } catch (err: any) {
    feedback.value = err?.data?.message || err?.message || 'Something went wrong. Please try again.'
    feedbackError.value = true
  } finally {
    busy.value = false
  }
}

function requestRelease() {
  return run(() => $fetch('/api/tracking/release-request', {
    method: 'POST',
    body: { document_id: props.documentId, remarks: requestRemarks.value },
  })).then(() => { if (!feedbackError.value) requestRemarks.value = '' })
}

function decide(decision: 'approve' | 'reject') {
  if (decision === 'reject' && !decisionRemarks.value.trim()) {
    feedback.value = 'Please give a reason for rejecting.'
    feedbackError.value = true
    return
  }
  return run(() => $fetch('/api/tracking/release-decision', {
    method: 'POST',
    body: { document_id: props.documentId, decision, remarks: decisionRemarks.value },
  })).then(() => { if (!feedbackError.value) decisionRemarks.value = '' })
}

async function openHandover() {
  handoverOpen.value = true
  membersLoading.value = true
  try {
    const res: any = await $fetch('/api/tracking/office-members', { params: { document_id: props.documentId } })
    members.value = res?.data ?? []
  } catch (err: any) {
    feedback.value = err?.data?.message || 'Could not load your office\'s staff.'
    feedbackError.value = true
  } finally {
    membersLoading.value = false
  }
}

function handOver() {
  return run(() => $fetch('/api/tracking/custody-transfer', {
    method: 'POST',
    body: { document_id: props.documentId, to_user_id: handoverTo.value, notes: handoverNotes.value },
  })).then(() => {
    if (!feedbackError.value) {
      handoverOpen.value = false
      handoverTo.value = ''
      handoverNotes.value = ''
    }
  })
}
</script>
