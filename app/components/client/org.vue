<template>
  <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
    <div
      class="w-full max-w-lg rounded-lg border p-8 shadow-card"
      :class="isDark ? 'border-onyx-border bg-onyx-card text-white' : 'border-gray-200 bg-white text-onyx-black'"
    >
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg">
          <img :src="brandLogo" class="h-10 w-10" alt="FlowVision" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Welcome to FlowVision</h1>
        <p class="mt-2 text-sm" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
          Create your organization workspace to continue.
        </p>
      </div>

      <form class="space-y-5" @submit.prevent="handleCreateOrg">
        <label class="block">
          <span class="text-xs font-semibold uppercase tracking-wide" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
            Organization Name
          </span>
          <input
            v-model.trim="orgData.name"
            type="text"
            placeholder="e.g. Acme Corporation"
            required
            class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
            :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-500' : 'border-gray-200 bg-white text-onyx-black placeholder:text-gray-400'"
          />
        </label>

        <button
          type="submit"
          class="w-full rounded-lg bg-candy-orange px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e95a0b] active:scale-[0.98]"
          :disabled="auth.isLoading"
        >
          Setup Organization
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const { isDark } = useTheme()

const brandLogo = computed(() => (isDark.value ? '/logo/new-logo.png' : '/logo/new-logo-dark.png'))

const orgData = reactive({
  name: '',
  user_id: auth.user?.user_id,
})

const handleCreateOrg = async () => {
  orgData.user_id = auth.user?.user_id
  await auth.createOrg(orgData)
}
</script>
