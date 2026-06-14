<script setup lang="ts">
const props = withDefaults(defineProps<{
  userName?: string
}>(), {
  userName: 'User'
})

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <div>
    <!-- Breadcrumbs row -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Icon name="ph:squares-four-fill" class="w-4 h-4 text-rich-orange" />
        <span>Overview</span>
        <Icon name="ph:caret-right" class="w-3 h-3" />
        <span class="text-gray-900 dark:text-white font-medium">Dashboard</span>
      </div>
      <div class="flex items-center gap-3">
        <button class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-card-dark transition">
          <Icon name="ph:bell" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <button class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-card-dark transition">
          <Icon name="ph:gear" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>

    <!-- Welcome row -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Hello, {{ userName }}! 👋</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Here are the latest insights from your document monitoring.</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Date picker dropdown -->
        <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-card-dark border border-gray-200 dark:border-card-border text-gray-700 dark:text-gray-300 hover:border-rich-orange transition">
          <Icon name="ph:calendar-blank" class="w-4 h-4" />
          <span>Last week</span>
          <Icon name="ph:caret-down" class="w-3 h-3" />
        </button>

        <!-- Theme toggle -->
        <button
          @click="toggleTheme"
          class="relative w-14 h-7 rounded-full transition-colors duration-300"
          :class="isDark ? 'bg-rich-orange' : 'bg-gray-300'"
        >
          <span
            class="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center"
            :class="isDark ? 'translate-x-7' : 'translate-x-0.5'"
          >
            <Icon
              :name="isDark ? 'ph:moon-fill' : 'ph:sun-fill'"
              class="w-3.5 h-3.5"
              :class="isDark ? 'text-rich-orange' : 'text-amber-500'"
            />
          </span>
        </button>

        <!-- Vertical dots menu -->
        <button class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-card-dark transition">
          <Icon name="ph:dots-three-vertical-bold" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>
  </div>
</template>
