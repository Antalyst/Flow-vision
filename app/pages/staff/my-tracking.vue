<template>
  <section class="w-full max-w-5xl mx-auto space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">
    <div>
      <div class="mb-3 h-1 w-14 rounded-full bg-candy-orange" />
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">My Tracking</h1>
      <p class="mt-1 text-sm" :class="mutedClass">
        Documents you've registered, and where each one stands.
      </p>
    </div>

    <!-- Tabs -->
    <div class="flex w-fit rounded-xl border p-1" :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure'">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="rounded-lg px-4 py-1.5 text-sm font-semibold transition-all"
        :class="activeTab === tab.value
          ? 'bg-candy-orange text-white shadow'
          : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <MyTrackingBoard
      v-if="activeTab === 'tracking'"
      fetch-url="/api/employee/ledger?scope=LOCAL&limit=200"
      document-link-base="/staff/documents"
      upload-link-base="/staff/documents"
      own-uploads-only
    />
    <ActivityTimeline v-else mine-only-locked />
  </section>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | My Tracking',
  description: 'Documents you registered, plus your personal activity history.'
})
import MyTrackingBoard from '~/components/tracking/MyTrackingBoard.vue'
import ActivityTimeline from '~/components/activity/ActivityTimeline.vue'

definePageMeta({ layout: 'staff' })

const { isDark } = useTheme()
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

const tabs = [
  { value: 'tracking', label: 'Tracking' },
  { value: 'activity', label: 'Activity' },
]
const activeTab = ref('tracking')

// "Check on page load" SLA breach detection — same as employee/my-tracking.vue.
onMounted(() => {
  $fetch('/api/tracking/check-sla-breaches', { method: 'POST', credentials: 'include' }).catch(() => {})
})
</script>
