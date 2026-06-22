<template>
  <Transition name="fade">
    <div v-if="auth.isLoading" class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div class="relative flex items-center justify-center">
        <div class="h-16 w-16 animate-spin rounded-full border-4 border-gray-100 border-t-[#D96518]"></div>
        <img src="/logo/new-logo.png" class="absolute h-8 w-8 animate-pulse" alt="Logo">
      </div>
      <p class="mt-4 font-medium text-gray-600">Please wait...</p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const auth = useAuthStore();
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
