<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-sm mb-2" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
          <Icon name="ph:squares-four-fill" class="w-4 h-4 text-amber-500" />
          <span>Messenger Portal</span>
          <Icon name="ph:caret-right" class="w-3 h-3" />
          <span :class="isDark ? 'text-white font-medium' : 'text-gray-900 font-medium'">Dashboard</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          Hello, {{ auth.user?.full_name?.split(' ')[0] || 'Messenger' }}!
        </h1>
        <p class="mt-1 text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
          Here are your active deliveries and status overview.
        </p>
      </div>

      <!-- Org scope badge -->
      <div
        v-if="auth.currentOrg"
        class="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm"
        :class="isDark ? 'bg-onyx-card border-onyx-border text-gray-300' : 'bg-white border-gray-200 text-gray-700'"
      >
        <Icon name="ph:building-office-fill" class="w-4 h-4 text-amber-500" />
        <div>
          <span class="font-semibold">{{ auth.currentOrg.name }}</span>
          <span class="ml-2 text-xs font-mono opacity-60">{{ auth.currentOrg.code }}</span>
        </div>
      </div>
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <div
        v-for="card in kpiCards"
        :key="card.label"
        class="dashboard-card p-5 flex items-start gap-4"
      >
        <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" :class="card.iconBg">
          <Icon :name="card.icon" class="w-5 h-5" :class="card.iconColor" />
        </span>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider" :class="isDark ? 'text-gray-400' : 'text-gray-500'">{{ card.label }}</p>
          <p class="mt-1 text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ card.value }}</p>
          <p class="mt-0.5 text-xs" :class="card.trendUp ? 'text-emerald-500' : 'text-red-500'">{{ card.trend }}</p>
        </div>
      </div>
    </div>

    <!-- Active deliveries -->
    <div class="dashboard-card p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Active Deliveries</h2>
        <NuxtLink to="/messenger/deliveries" class="text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors">
          View all →
        </NuxtLink>
      </div>

      <div class="space-y-3">
        <div
          v-for="delivery in deliveries"
          :key="delivery.id"
          class="flex items-center gap-4 rounded-xl border p-4 transition-colors"
          :class="isDark ? 'border-onyx-border hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50'"
        >
          <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <Icon name="ph:package-fill" class="w-4 h-4 text-amber-500" />
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ delivery.label }}</p>
            <p class="text-xs mt-0.5" :class="isDark ? 'text-gray-500' : 'text-gray-400'">{{ delivery.destination }} · {{ delivery.time }}</p>
          </div>
          <span
            class="flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            :class="delivery.status === 'In Transit'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : delivery.status === 'Delivered'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'"
          >
            {{ delivery.status }}
          </span>
        </div>

        <p
          v-if="deliveries.length === 0"
          class="py-8 text-center text-sm"
          :class="isDark ? 'text-gray-500' : 'text-gray-400'"
        >
          No active deliveries.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'messenger' })

const auth = useAuthStore()
const { isDark } = useTheme()

onMounted(() => {
  if (auth.isLoggedIn && !auth.currentOrg) auth.fetchMyOrg()
})

const kpiCards = [
  { label: 'Active Deliveries', value: '7',  trend: '+2 today',           trendUp: true,  icon: 'ph:package-fill',           iconBg: 'bg-amber-500/10',   iconColor: 'text-amber-500' },
  { label: 'Completed Today',   value: '14', trend: '+5 vs yesterday',     trendUp: true,  icon: 'ph:check-circle-fill',      iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
  { label: 'Pending Pickup',    value: '3',  trend: 'Same as yesterday',   trendUp: false, icon: 'ph:clock-countdown-fill',   iconBg: 'bg-rose-500/10',    iconColor: 'text-rose-500' },
]

const deliveries = [
  { id: 1, label: 'Document Batch #44 — Subsidy Forms',  destination: 'Municipal Hall, Bldg A', time: '9:30 AM',  status: 'In Transit' },
  { id: 2, label: 'Legal File — Case Ref. LG-221',       destination: 'Regional Office 3',       time: '11:00 AM', status: 'Pending' },
  { id: 3, label: 'ID Verification Pack — Batch 7',      destination: 'Records Archive',         time: '8:15 AM',  status: 'Delivered' },
]
</script>
