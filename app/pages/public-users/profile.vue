<template>
  <div class="h-full flex flex-col p-4 md:p-6 lg:p-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Citizen Profile</h1>
        <p class="text-sm md:text-base text-gray-500 mt-1">Manage your public account details and preferences.</p>
      </div>
    </div>

    <div class="border bg-white dark:bg-onyx-card p-6 rounded-none" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
      <div class="flex flex-col md:flex-row gap-8 items-start">
        <div class="w-32 h-32 bg-candy-orange text-white flex items-center justify-center text-4xl font-bold rounded-none shadow-sm flex-shrink-0">
          JD
        </div>
        <div class="flex-1 w-full space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Full Name</label>
              <input type="text" value="Juan Dela Cruz" readonly class="w-full px-4 py-2 border bg-gray-50 dark:bg-onyx-black/50 text-gray-900 dark:text-white rounded-none outline-none" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Email Address</label>
              <input type="email" value="juan.delacruz@example.com" readonly class="w-full px-4 py-2 border bg-gray-50 dark:bg-onyx-black/50 text-gray-900 dark:text-white rounded-none outline-none" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Citizen ID Number</label>
              <input type="text" value="CTZ-2024-884A9" readonly class="w-full px-4 py-2 border bg-gray-50 dark:bg-onyx-black/50 text-gray-900 dark:text-white font-mono rounded-none outline-none" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Account Status</label>
              <div class="px-4 py-2 border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 rounded-none font-bold text-sm">VERIFIED</div>
            </div>
          </div>
          
          <button class="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white px-6 py-2 font-medium transition-colors rounded-none border border-transparent">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

const { isDark } = useTheme()

definePageMeta({ layout: 'public-dashboard' })
useHead({ title: 'Profile - FlowVision' })
</script>
