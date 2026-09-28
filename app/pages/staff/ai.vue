<template>
  <AiCanvasWorkspace
    :scope="activeScope"
    :office-ids="officeIds"
    back-route="/staff/dashboard"
    role-context="staff"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AiCanvasWorkspace from '~/components/ai/AiCanvasWorkspace.vue'
import { useAuthStore } from '~/stores/auth'

// Full-screen AI canvas — no sidebar / nav chrome
definePageMeta({ layout: false })

const route = useRoute()
const auth  = useAuthStore()

// Read scope from the URL query param:
//   /staff/ai?scope=LOCAL  → Office View (Small Picture)
//   /staff/ai?scope=GLOBAL → Org View   (Big Picture)
//   /staff/ai              → defaults to LOCAL for staff
const activeScope = computed<'GLOBAL' | 'LOCAL'>(() => {
  const raw = (route.query.scope as string | undefined)?.toUpperCase()
  return raw === 'GLOBAL' ? 'GLOBAL' : 'LOCAL'
})

const officeIds = ref<string[]>([])

// A staff (employee_sub_user) account belongs to exactly one office —
// reuse the same single-office lookup already used by staff/dashboard.vue,
// rather than /api/employee/my-offices (built for full employee accounts
// that can own several).
const resolveOfficeIds = async () => {
  if (!auth.user?.user_id) return
  try {
    const res = await $fetch<{ success: boolean; data: { id: string } | null }>('/api/staff/my-office')
    officeIds.value = res.data ? [String(res.data.id)] : []
  } catch (err) {
    console.warn('[StaffAI] Could not resolve office id:', err)
    officeIds.value = []
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await resolveOfficeIds()
})
</script>
