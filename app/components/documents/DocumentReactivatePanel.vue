<template>
  <section class="stagger-block rounded-2xl border border-success/30 bg-success/5 p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-[13px] font-bold uppercase tracking-widest text-success">{{ isRecurring ? 'Recurring document' : 'Route completed' }}</p>
        <p v-if="isRecurring" class="mt-1 text-sm" :class="mutedClass">
          Cycle {{ nextCycle - 1 }} is complete. Reactivate it to send the same document — same QR code, no re-upload — on cycle {{ nextCycle }}.
        </p>
        <p v-else class="mt-1 text-sm" :class="mutedClass">
          This document finished its route. Restart it with a new route — same document, same QR code, no re-upload.
          It becomes a recurring document: each new cycle ends back at {{ originName || 'the originating office' }}.
        </p>
      </div>
      <button
        v-if="!open"
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        @click="open = true"
      >
        <Icon name="ph:arrows-clockwise-bold" class="h-4 w-4" />
        {{ isRecurring ? 'Reactivate Document' : 'Restart with a New Route' }}
      </button>
    </div>

    <div v-if="open" class="mt-4 space-y-4">
      <div class="rounded-xl border border-success/30 px-4 py-3 text-sm" :class="isDark ? 'bg-white/[0.02]' : 'bg-white'">
        <p class="font-bold text-success">Configuring cycle {{ nextCycle }}</p>
        <p class="mt-0.5" :class="mutedClass">
          <template v-if="startsElsewhere">
            Starts from <strong :class="isDark ? 'text-white' : 'text-gray-900'">{{ startOfficeName }}</strong>, where the document is now
            (that office assigns the first liaison), and returns to <strong :class="isDark ? 'text-white' : 'text-gray-900'">{{ originName || 'the originating office' }}</strong>.
          </template>
          <template v-else>
            Starts from and returns to <strong :class="isDark ? 'text-white' : 'text-gray-900'">{{ originName || 'the originating office' }}</strong>.
          </template>
          Add one or more destination offices, or pick a saved route. Earlier cycles stay unchanged.
        </p>
      </div>

      <RouteBuilder
        v-model="officeIds"
        v-model:saved-route-id="savedRouteId"
        :origin-office-id="originOfficeId"
        :origin-name="originName"
        routing-type="RECURRING"
        hide-routing-type
      />

      <div v-if="officeIds.length" class="rounded-xl border px-4 py-3 text-sm" :class="isDark ? 'border-white/10' : 'border-gray-200 bg-white'">
        <p class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Cycle {{ nextCycle }} route</p>
        <p class="mt-1" :class="mutedClass">{{ startsElsewhere ? startOfficeName : originName }} → {{ officeNames.join(' → ') }} → back to {{ originName }}</p>
      </div>

      <p v-if="error" class="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">{{ error }}</p>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          :disabled="busy || !officeIds.length"
          @click="confirm"
        >
          <Icon v-if="busy" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
          Start cycle {{ nextCycle }}
        </button>
        <button type="button" class="rounded-xl px-4 py-2.5 text-sm font-semibold" :class="mutedClass" :disabled="busy" @click="open = false">
          Cancel
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import RouteBuilder from './RouteBuilder.vue'

const props = defineProps<{
  documentId: string
  originOfficeId: string | null
  originName: string | null
  /** Number the new cycle will get. */
  nextCycle: number
  /** False for a completed standard document — restarting makes it recurring. */
  isRecurring?: boolean
  /** Where the document physically is now (the new cycle starts there). */
  startOfficeName?: string | null
}>()

const emit = defineEmits<{ (e: 'reactivated', message: string): void }>()

const { isDark } = useTheme()
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

const open = ref(false)
const busy = ref(false)
const error = ref('')
const officeIds = ref<string[]>([])
/** Saved route the cycle was loaded from / saved as (recorded with the cycle). */
const savedRouteId = ref<string | null>(null)
const nameById = ref<Record<string, string>>({})
const officeNames = computed(() => officeIds.value.map((id) => nameById.value[id] ?? 'Office'))
/** Set by the drawer only when the document is NOT at its originating office. */
const startsElsewhere = computed(() => !!props.startOfficeName)

onMounted(async () => {
  try {
    const res: any = await $fetch('/api/office')
    nameById.value = Object.fromEntries((res?.data ?? []).map((o: any) => [String(o.id), o.name]))
  } catch { /* names fall back to "Office" */ }
})

async function confirm() {
  if (busy.value) return
  if (!window.confirm(`Start cycle ${props.nextCycle} for this document? The offices on the route will be notified as it moves.`)) return
  busy.value = true
  error.value = ''
  try {
    const res: any = await $fetch('/api/tracking/reactivate', {
      method: 'POST',
      body: { document_id: props.documentId, office_ids: officeIds.value, saved_route_id: savedRouteId.value },
    })
    open.value = false
    officeIds.value = []
    savedRouteId.value = null
    emit('reactivated', res?.message || `Cycle ${props.nextCycle} started.`)
  } catch (err: any) {
    error.value = err?.data?.message || 'Could not reactivate the document. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>
