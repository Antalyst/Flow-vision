<template>
  <section class="space-y-6">
    <header>
      <p class="text-xs font-bold uppercase tracking-widest text-candy-orange">Compliance</p>
      <h1 class="mt-1 text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
        Flagged Documents
      </h1>
      <p class="mt-2 text-sm" :class="mutedText">
        Documents flagged with an issue across your organization. Select a row to review and respond.
      </p>
    </header>

    <div
      class="overflow-hidden rounded-2xl border shadow-card"
      :class="isDark ? 'border-onyx-border bg-[#1A1A1A]' : 'border-gray-200 bg-white'"
    >
      <div v-if="loading" class="flex items-center justify-center gap-2 px-6 py-16" :class="mutedText">
        <Icon name="ph:spinner-gap" class="h-5 w-5 animate-spin text-candy-orange" />
        Loading compliance logs…
      </div>

      <div v-else-if="!rows.length" class="px-6 py-16 text-center">
        <Icon name="ph:shield-check-fill" class="mx-auto h-10 w-10 text-candy-orange/60" />
        <p class="mt-3 text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
          No open compliance issues
        </p>
        <p class="mt-1 text-sm" :class="mutedText">
          Flagged documents will appear here when an office reports a discrepancy.
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead :class="isDark ? 'bg-onyx-black/50 text-gray-400' : 'bg-gray-50 text-gray-500'">
            <tr>
              <th class="px-5 py-3 font-semibold">Document</th>
              <th class="px-5 py-3 font-semibold">Issue</th>
              <th class="px-5 py-3 font-semibold">Reported By</th>
              <th class="px-5 py-3 font-semibold">Target Desk</th>
              <th class="px-5 py-3 font-semibold">Flagged</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.issue.id"
              class="cursor-pointer border-t transition-colors duration-150"
              :class="isDark ? 'border-white/5 hover:bg-white/[0.03]' : 'border-gray-100 hover:bg-gray-50'"
              @click="openDocument(row)"
            >
              <td class="px-5 py-4">
                <p class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ row.document.title }}
                </p>
                <p class="mt-0.5 text-xs" :class="mutedText">{{ row.document.id.slice(0, 8) }}…</p>
              </td>
              <td class="px-5 py-4">
                <span class="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider border-warning/30 bg-warning/10 text-warning">
                  {{ row.issue.issue_type || 'Discrepancy' }}
                </span>
              </td>
              <td class="px-5 py-4" :class="mutedText">{{ formatOfficeName(row.issue.reported_by_office_name) || '—' }}</td>
              <td class="px-5 py-4 font-semibold text-candy-orange">{{ formatOfficeName(row.issue.target_office_name) || '—' }}</td>
              <td class="px-5 py-4" :class="mutedText">{{ fmtDate(row.issue.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <DocumentPreviewDrawer
      :is-open="!!activeDocument"
      :document="activeDocument"
      show-compliance-actions
      pipeline-messaging-enabled
      :messaging-offices="myOffices"
      width-class="lg:w-[60%] lg:max-w-4xl"
      :office-resolver="resolveOfficeName"
      @close="closeDocumentPreview"
      @flag-issue="issueChatRef?.openReportForm()"
      @compliance-updated="handleIssueUpdated"
    >
      <template #footer>
        <DocumentIssueChatPanel
          v-if="activeDocument"
          ref="issueChatRef"
          :document="activeDocument"
          :offices="myOffices"
          @updated="handleIssueUpdated"
        />
      </template>
    </DocumentPreviewDrawer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import DocumentPreviewDrawer from '~/components/documents/DocumentPreviewDrawer.vue'
import DocumentIssueChatPanel from '~/components/employee/documents/DocumentIssueChatPanel.vue'

interface FlaggedRow {
  issue: {
    id: string
    document_id: string
    issue_type?: string | null
    title: string
    details?: string | null
    created_at: string
    reported_by_office_name?: string | null
    target_office_name?: string | null
  }
  document: Record<string, unknown> & {
    id: string
    title: string
    tracking_status?: string
    user_id?: string
    origin_office_id?: string
    current_office_id?: string
  }
}

interface OfficeRecord { id: string; name: string; code?: string }

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isDark } = useTheme()

const rows = ref<FlaggedRow[]>([])
const loading = ref(false)
const myOffices = ref<OfficeRecord[]>([])
const activeDocument = ref<FlaggedRow['document'] | null>(null)
const issueChatRef = ref<InstanceType<typeof DocumentIssueChatPanel> | null>(null)

const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

const formatOfficeName = (val?: string | null) => {
  if (!val) return '—'
  return val.replace(/\s*\(OFF-[A-Z0-9]+\)\s*/i, '').trim()
}

const fetchFlagged = async () => {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: FlaggedRow[] }>('/api/documents/issues/flagged')
    rows.value = res.data ?? []
  } catch (err) {
    console.error('[FlaggedDocs] fetch:', err)
    rows.value = []
  } finally {
    loading.value = false
  }
}

const fetchMyOffices = async () => {
  const orgId = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return
  try {
    const res = await $fetch<{ success: boolean; data: OfficeRecord[] }>('/api/employee/my-offices', {
      params: { orgId, userId },
    })
    myOffices.value = res.data ?? []
  } catch { /* silent */ }
}

const resolveOfficeName = (officeId: string | number | null | undefined) => {
  if (officeId == null) return 'Unknown Office'
  const found = myOffices.value.find((o) => String(o.id) === String(officeId))
  return found?.name || `Office ${String(officeId).slice(0, 6)}`
}

const openDocument = (row: FlaggedRow) => {
  activeDocument.value = row.document
  router.replace({ query: { ...route.query, document: row.document.id } })
}

const closeDocumentPreview = () => {
  activeDocument.value = null
  const query = { ...route.query }
  delete query.document
  router.replace({ query })
}

const handleIssueUpdated = (data: { tracking_status: string; issueClosed?: boolean }) => {
  if (activeDocument.value) {
    activeDocument.value = { ...activeDocument.value, tracking_status: data.tracking_status }
  }
  if (data.issueClosed) {
    fetchFlagged()
  }
}

const openFromQuery = async () => {
  const documentId = String(route.query.document ?? '').trim()
  if (!documentId) return

  if (!rows.value.length) await fetchFlagged()

  const match = rows.value.find((r) => String(r.document.id) === documentId)
  if (match) {
    activeDocument.value = match.document
    return
  }

  try {
    const res = await $fetch<{ success: boolean; data: FlaggedRow[] }>('/api/documents/issues/flagged')
    const found = (res.data ?? []).find((r) => String(r.document.id) === documentId)
    if (found) {
      activeDocument.value = found.document
    }
  } catch { /* silent */ }
}

const fmtDate = (v?: string) => {
  if (!v) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(v))
}

watch(() => route.query.document, () => {
  if (route.query.document) openFromQuery()
  else if (!route.query.document) activeDocument.value = null
})

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await Promise.all([fetchMyOffices(), fetchFlagged()])
  await nextTick()
  await openFromQuery()
})
</script>
