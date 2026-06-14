<template>
  <section
    class="rounded-lg border p-6 shadow-card"
    :class="isDark ? 'border-card-border bg-card-dark text-white' : 'border-gray-200 bg-white text-rich-black'"
  >
    <div class="mb-3 h-1 w-12 rounded-full bg-rich-orange"></div>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Settings</h1>
        <p class="mt-2 text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
          Manage the FlowVision dashboard appearance.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="isDark"
        class="relative h-8 w-14 rounded-full transition focus:outline-none focus:ring-2 focus:ring-[#FF620C] focus:ring-offset-2"
        :class="isDark ? 'bg-rich-orange focus:ring-offset-rich-black' : 'bg-gray-300 focus:ring-offset-white'"
        @click="toggleTheme"
      >
        <span
          class="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition"
          :class="isDark ? 'left-7' : 'left-1'"
        ></span>
      </button>
    </div>
    <div
      class="mt-6 rounded-lg border p-4"
      :class="isDark ? 'border-card-border bg-rich-black/40' : 'border-gray-200 bg-gray-50'"
    >
      <p class="text-sm font-semibold">{{ isDark ? 'Dark Mode' : 'Light Mode' }}</p>
      <p class="mt-1 text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
        Backgrounds, borders, surfaces, and text colors respond to the shared theme state.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
const { isDark, toggleTheme } = useTheme()
</script>
