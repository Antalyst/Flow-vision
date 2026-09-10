<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedClass">
          <Icon name="ph:buildings-light" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
          <span class="font-medium" :class="headingClass">Office Station</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">Office Station &amp; Desks</h1>
        <p class="mt-1 text-sm" :class="mutedClass">Intake station, sub-desks, and live checkpoint queues for your assigned office.</p>
      </div>

      <NuxtLink
        to="/employee/offices"
        class="inline-flex items-center gap-2 rounded-none bg-candy-orange px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
      >
        <Icon name="ph:qr-code-light" class="h-4 w-4" />
        Desk QR Management
      </NuxtLink>
    </header>

    <!-- Office Info Banner -->
    <div
      v-if="currentOffice"
      class="rounded-none border p-6 transition-colors"
      :class="panelClass"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          <span class="flex h-12 w-12 items-center justify-center rounded-none bg-candy-orange/10 text-candy-orange border border-candy-orange/20">
            <Icon name="ph:buildings-light" class="h-6 w-6" />
          </span>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold" :class="headingClass">{{ currentOffice.name }}</h2>
              <span class="rounded-none border px-2 py-0.5 font-mono text-[10px] font-bold text-candy-orange border-candy-orange/30 bg-candy-orange/10">
                {{ currentOffice.code || `OFF-${String(currentOffice.id).padStart(6, '0')}` }}
              </span>
            </div>
            <p class="mt-0.5 text-xs" :class="mutedClass">
              Assigned to {{ auth.user?.full_name || 'You' }} · Primary processing node
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink
            to="/employee/working"
            class="inline-flex items-center gap-1.5 rounded-none border px-3 py-2 text-xs font-semibold transition-colors hover:border-candy-orange"
            :class="isDark ? 'border-onyx-border text-gray-300 bg-onyx-black' : 'border-gray-200 text-gray-700 bg-gray-50'"
          >
            <Icon name="ph:briefcase-light" class="h-4 w-4 text-candy-orange" />
            Live Queue
          </NuxtLink>
          <NuxtLink
            to="/employee/scan"
            class="inline-flex items-center gap-1.5 rounded-none border px-3 py-2 text-xs font-semibold transition-colors hover:border-candy-orange"
            :class="isDark ? 'border-onyx-border text-gray-300 bg-onyx-black' : 'border-gray-200 text-gray-700 bg-gray-50'"
          >
            <Icon name="ph:scan-light" class="h-4 w-4 text-candy-orange" />
            Scan QR
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Sub-Desks Grid -->
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b pb-2" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
        <h3 class="text-xs font-bold uppercase tracking-wider text-candy-orange">
          Registered Desks &amp; Counters ({{ myOffices.length }})
        </h3>
        <NuxtLink to="/employee/offices" class="text-xs font-semibold text-candy-orange hover:underline">
          View All Plaque Cards →
        </NuxtLink>
      </div>

      <div v-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="n in 3" :key="n" class="h-32 animate-pulse rounded-none border" :class="panelClass" />
      </div>

      <div v-else-if="myOffices.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="office in myOffices"
          :key="office.id"
          class="rounded-none border p-5 transition-colors hover:border-candy-orange"
          :class="panelClass"
        >
          <div class="flex items-start justify-between">
            <span class="flex h-9 w-9 items-center justify-center rounded-none bg-candy-orange/10 text-candy-orange">
              <Icon name="ph:desktop-light" class="h-4.5 w-4.5" />
            </span>
            <span class="font-mono text-[10px] opacity-60">
              {{ office.code || `OFF-${String(office.id).padStart(4, '0')}` }}
            </span>
          </div>

          <p class="mt-3 font-semibold text-sm truncate" :class="headingClass">
            {{ office.name }}
          </p>
          <p class="mt-0.5 text-xs truncate" :class="mutedClass">
            Station intake desk
          </p>

          <div class="mt-4 pt-3 border-t flex items-center justify-between text-xs" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
            <span class="inline-flex items-center gap-1 font-medium text-emerald-500 text-[11px]">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
            <NuxtLink
              :to="`/employee/working`"
              class="font-semibold text-candy-orange hover:underline text-[11px]"
            >
              Inspect Queue →
            </NuxtLink>
          </div>
        </div>
      </div>

      <div
        v-else
        class="rounded-none border p-12 text-center"
        :class="panelClass"
      >
        <Icon name="ph:buildings-light" class="mx-auto h-10 w-10 text-candy-orange opacity-40" />
        <p class="mt-3 font-semibold text-sm" :class="headingClass">No Desks Configured</p>
        <p class="mt-1 text-xs max-w-sm mx-auto" :class="mutedClass">
          You haven't registered any desk nodes or intake stations under your office yet.
        </p>
        <NuxtLink
          to="/employee/offices"
          class="mt-4 inline-flex items-center gap-1.5 rounded-none bg-candy-orange px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600"
        >
          <Icon name="ph:plus-light" class="h-3.5 w-3.5" />
          Register Desk
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'employee' })

interface OfficeRecord {
  id: string | number
  name: string
  code?: string
  assigned_user?: string | null
}

const auth = useAuthStore()
const { isDark } = useTheme()

const myOffices = ref<OfficeRecord[]>([])
const loading = ref(false)

const headingClass = computed(() => (isDark.value ? 'text-white' : 'text-gray-900'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => (isDark.value ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'))

const currentOffice = computed(() => myOffices.value[0] || null)

async function fetchOffices() {
  const orgId = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return

  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: OfficeRecord[] }>('/api/employee/my-offices', {
      params: { orgId, userId },
    })
    myOffices.value = res.data ?? []
  } catch (err) {
    console.error('[EmployeeOffice] fetch error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchOffices()
})
</script>
