<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-white font-primary p-6 text-center">
    <div class="relative mb-8">
      <h1 class="text-9xl font-bold text-gray-100 selection:bg-transparent">
        {{ error.statusCode }}
      </h1>
      <div class="absolute inset-0 flex items-center justify-center ">
        <img src="/404/404.png" class="w-20 h-auto opacity-80 " alt="Logo" />
      </div>
    </div>

    <h2 class="text-3xl font-bold text-gray-800 mb-4">
      {{ error.statusCode === 404 ? 'Page Not Found' : 'An error occurred' }}
    </h2>
    
    <p class="text-gray-500 max-w-md mb-8">
      {{ error.message || "We're sorry, the page you're looking for doesn't exist or has been moved." }}
    </p>

    <button 
      @click="handleError"
      class="px-8 py-3 bg-[#F77934] text-white font-medium rounded-md shadow-lg hover:bg-[#e66d2c] transition-all transform hover:-translate-y-1"
    >
      Back to Home
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  error: Object as any
})

const handleError = () => {
  clearError({ redirect: '/' })
}
</script>

<style scoped>
.font-primary {
  font-family: 'Inter', sans-serif;
}
</style>