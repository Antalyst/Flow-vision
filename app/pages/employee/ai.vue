<template>
  <AiCanvasWorkspace
    :scope="activeScope"
    :office-ids="officeIds"
    back-route="/employee/dashboard"
    role-context="employee"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AiCanvasWorkspace from '~/components/ai/AiCanvasWorkspace.vue'
import { useAuthStore } from '~/stores/auth'

// Full-screen AI canvas — no sidebar / nav chrome
definePageMeta({ layout: false })

const route  = useRoute()
const auth   = useAuthStore()

// Read scope from the URL query param:
//   /employee/ai?scope=LOCAL  → Office View (Small Picture)
//   /employee/ai?scope=GLOBAL → Org View   (Big Picture)
//   /employee/ai              → defaults to LOCAL for employees
const activeScope = computed<'GLOBAL' | 'LOCAL'>(() => {
  const raw = (route.query.scope as string | undefined)?.toUpperCase()
  return raw === 'GLOBAL' ? 'GLOBAL' : 'LOCAL'
})

const officeIds = ref<string[]>([])

const resolveOfficeIds = async () => {
  const orgId  = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return

  try {
    const res = await $fetch<{ success: boolean; data: { id: string | number }[] }>(
      '/api/employee/my-offices',
      { params: { orgId, userId } },
    )
    officeIds.value = (res.data ?? []).map((o) => String(o.id))
  } catch (err) {
    console.warn('[EmployeeAI] Could not resolve office IDs:', err)
    officeIds.value = []
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  // Resolve office IDs regardless of scope — the workspace decides
  // whether to use them based on the active scope prop.
  await resolveOfficeIds()
})
</script>
